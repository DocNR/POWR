import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from './AuthStateManager';
import { AuthService } from './AuthService';
import NDK from '@nostr-dev-kit/ndk-mobile';

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
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children, ndk }) => {
  // Create a singleton instance of AuthService
  const [authService] = useState(() => new AuthService(ndk));
  // Subscribe to auth state for debugging/monitoring purposes
  const authState = useAuthStore();
  
  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("[AuthProvider] Initializing authentication");
        await authService.initialize();
        console.log("[AuthProvider] Authentication initialized");
      } catch (error) {
        console.error("[AuthProvider] Error initializing authentication:", error);
      }
    };
    
    initAuth();
    
    // No cleanup needed - AuthService instance persists for app lifetime
  }, [authService]);
  
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
