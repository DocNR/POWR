import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuthStore } from './AuthStateManager';
import { AuthService } from './AuthService';
import NDK from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from './constants';
import { migrateKeysIfNeeded } from './persistence/secureStorage';
import { Platform } from 'react-native';

/**
 * Context value interface for the Auth context
 */
interface AuthContextValue {
  authService: AuthService;
}

/**
 * Create the Auth context
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Props for the AuthProvider component
 */
interface AuthProviderProps {
  children: React.ReactNode;
  ndk: NDK;
}

/**
 * Provider component that makes auth service available to the app
 * Fixed with proper initialization sequence and credential handling
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children, ndk }) => {
  // Create a singleton instance of AuthService
  const [authService] = useState(() => new AuthService(ndk));
  // Subscribe to auth state for debugging/monitoring purposes
  const authState = useAuthStore();
  // Track initialization to prevent duplicate attempts
  const initializingRef = useRef(false);
  
  // Initialize auth on mount with improved sequence
  useEffect(() => {
    const initAuth = async () => {
      // Prevent multiple init attempts
      if (initializingRef.current) {
        console.log("[AuthProvider] Already initializing, skipping");
        return;
      }
      
      initializingRef.current = true;
      
      try {
        console.log(`[AuthProvider] Initializing authentication (${Platform.OS})`);
        
        // First, ensure NDK is fully connected before proceeding
        if (!ndk) {
          console.error("[AuthProvider] NDK is null, cannot initialize auth");
          return;
        }
        
        // Wait for NDK to be connected before proceeding
        if (!ndk.pool) {
          console.log("[AuthProvider] Waiting for NDK to initialize pool...");
          
          let attempts = 0;
          const maxAttempts = 20; // 2 seconds max wait with 100ms checks
          
          await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              attempts++;
              // Check if NDK has been connected
              if (ndk.pool) {
                clearInterval(checkInterval);
                console.log("[AuthProvider] NDK pool initialized, proceeding with auth");
                resolve();
              } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.warn("[AuthProvider] Timed out waiting for relay connections, proceeding anyway");
                resolve();
              }
            }, 100);
          });
        }
        
        // Run key migration to ensure credentials are in the correct location
        await migrateKeysIfNeeded();
        
        // Initialize the auth service
        await authService.initialize();
        console.log("[AuthProvider] Authentication service initialized");
        
        // Verify auth state is consistent with stored credentials
        const privateKey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
        const externalSigner = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
        const currentState = useAuthStore.getState();
        
        // If we have credentials but auth state is unauthenticated, attempt to restore
        if ((privateKey || externalSigner) && currentState.status === 'unauthenticated') {
          console.log("[AuthProvider] Auth state inconsistent with storage, attempting restore");
          
          if (privateKey) {
            try {
              // DIRECT APPROACH: Create a signer with the private key
              console.log("[AuthProvider] Restoring auth with stored private key");
              
              // Import NDKPrivateKeySigner for direct key operations
              const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk-mobile');
              
              // Create a signer directly
              const signer = new NDKPrivateKeySigner(privateKey);
              ndk.signer = signer;
              
              // Connect to establish NDK user
              await ndk.connect();
              
              // After connecting, get the public key directly from the user object
              const publicKey = ndk.activeUser?.pubkey;
              if (!publicKey) {
                throw new Error("Failed to get public key from NDK");
              }
              console.log(`[AuthProvider] Retrieved public key: ${publicKey.substring(0, 8)}...`);
              
              // Store the public key for future quick access
              await SecureStore.setItemAsync(SECURE_STORE_KEYS.PUBKEY, publicKey);
              console.log("[AuthProvider] Saved public key to SecureStore");
              
              if (ndk.activeUser) {
                console.log("[AuthProvider] NDK authenticated successfully, updating Zustand store");
                
                // CRITICAL: Update the Zustand store directly
                const authStore = useAuthStore.getState();
                authStore.setAuthenticated(ndk.activeUser, 'private_key');
                
                console.log("[AuthProvider] Zustand store updated with authenticated state");
              } else {
                console.error("[AuthProvider] Failed to set NDK activeUser");
              }
            } catch (err) {
              console.error("[AuthProvider] Failed to restore with private key:", err);
            }
          } else if (externalSigner) {
            console.log("[AuthProvider] External signer credentials found, re-initializing auth service");
            // Just re-initialize the auth service - it will handle the external signer restoration internally
            try {
              await authService.initialize();
              
              // Ensure the public key is stored for external signer too
              if (ndk.activeUser) {
                const publicKey = ndk.activeUser.pubkey;
                await SecureStore.setItemAsync(SECURE_STORE_KEYS.PUBKEY, publicKey);
                console.log("[AuthProvider] Saved external signer public key to SecureStore");
                
                // Update Zustand store directly for consistent auth state
                const authStore = useAuthStore.getState();
                authStore.setAuthenticated(ndk.activeUser, 'amber');
              }
            } catch (err) {
              console.error("[AuthProvider] Failed to restore with external signer:", err);
            }
          }
        }
      } catch (error) {
        console.error("[AuthProvider] Error initializing authentication:", error);
      } finally {
        initializingRef.current = false;
      }
    };
    
    initAuth();
    
    // No cleanup needed - AuthService instance persists for app lifetime
  }, [ndk, authService]);
  
  // Debugging: Log auth state changes
  useEffect(() => {
    console.log("[AuthProvider] Auth state changed:", authState.status);
  }, [authState.status]);
  
  // Provide context value
  const contextValue: AuthContextValue = {
    authService
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook for consuming the auth context in components
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook that provides direct access to the current auth state
 */
export const useAuthState = () => {
  return useAuthStore();
};
