# Authentication System Implementation Plan

**Last Updated:** 2025-04-02  
**Status:** Proposed  
**Authors:** POWR Team

## Overview

This document outlines the detailed implementation plan for the Centralized Authentication System described in `centralized_auth_system.md`. It provides concrete steps, code structure, and a timeline for implementing the new authentication architecture.

## Phase 1: Core Infrastructure (3-4 days)

### 1.1 Authentication State Types

First, create the core type definitions for the authentication state machine:

```typescript
// lib/auth/types.ts
import { NDKUser, NostrEvent } from "@nostr-dev-kit/ndk";

export type AuthMethod = 'private_key' | 'amber' | 'ephemeral';

export type SigningOperation = {
  event: NostrEvent;
  resolve: (signature: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
};

export type AuthState = 
  | { status: 'unauthenticated' }
  | { status: 'authenticating', method: AuthMethod }
  | { status: 'authenticated', user: NDKUser, method: AuthMethod }
  | { 
      status: 'signing', 
      user: NDKUser,
      method: AuthMethod,
      operationCount: number, 
      operations: SigningOperation[] 
    }
  | { status: 'error', error: Error, previousState?: AuthState };

export interface AuthActions {
  setAuthenticating: (method: AuthMethod) => void;
  setAuthenticated: (user: NDKUser, method: AuthMethod) => void;
  setSigningInProgress: (inProgress: boolean, operation: SigningOperation) => void;
  logout: () => void;
  setError: (error: Error) => void;
}
```

### 1.2 Signing Queue Implementation

Create the queue system to manage signing operations:

```typescript
// lib/auth/SigningQueue.ts
import { NostrEvent } from "@nostr-dev-kit/ndk";
import { SigningOperation } from "./types";
import { AuthStateManager } from "./AuthStateManager";

export class SigningQueue {
  private queue: SigningOperation[] = [];
  private processing = false;
  private maxConcurrent = 1;
  private activeCount = 0;

  async enqueue(event: NostrEvent): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create signing operation with timestamp for ordering
      const operation: SigningOperation = { 
        event, 
        resolve, 
        reject,
        timestamp: Date.now()
      };
      
      // Add to queue and process
      this.queue.push(operation);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    try {
      // Sort queue by timestamp (oldest first)
      this.queue.sort((a, b) => a.timestamp - b.timestamp);
      
      const operation = this.queue.shift()!;
      this.activeCount++;
      
      try {
        // Update state to show signing in progress
        AuthStateManager.setSigningInProgress(true, operation);
        
        // Delegate to the appropriate signing method based on event type
        // This will be implemented by each specific signer
        const signature = await this.performSigning(operation.event);
        
        operation.resolve(signature);
      } catch (error) {
        console.error("Signing error:", error);
        operation.reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.activeCount--;
        AuthStateManager.setSigningInProgress(false, operation);
      }
    } finally {
      this.processing = false;
      // Continue processing if items remain
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  private async performSigning(event: NostrEvent): Promise<string> {
    // This is a placeholder - the actual signing will be done
    // by the NDKAmberSigner or other signers
    throw new Error("Must be implemented by specific signer implementation");
  }
}
```

### 1.3 Auth State Manager

Implement the centralized state manager:

```typescript
// lib/auth/AuthStateManager.ts
import { create } from "zustand";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { 
  AuthState, 
  AuthActions, 
  AuthMethod,
  SigningOperation 
} from "./types";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIVATE_KEY_STORAGE_KEY = "powr.private_key";

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  status: 'unauthenticated',
  
  setAuthenticating: (method) => {
    set({ 
      status: 'authenticating',
      method 
    });
  },
  
  setAuthenticated: (user, method) => {
    set({
      status: 'authenticated',
      user,
      method,
    });
  },
  
  setSigningInProgress: (inProgress, operation) => {
    const currentState = get();
    
    if (inProgress) {
      // Handle transition to signing state
      if (currentState.status === 'signing') {
        // Already in signing state, update the operations list and count
        set({
          operationCount: currentState.operationCount + 1,
          operations: [...currentState.operations, operation]
        });
      } else if (currentState.status === 'authenticated') {
        // Transition from authenticated to signing
        set({
          status: 'signing',
          user: currentState.user,
          method: currentState.method,
          operationCount: 1,
          operations: [operation]
        });
      } else {
        // Invalid state transition - can only sign when authenticated
        set({
          status: 'error',
          error: new Error('Cannot sign: not authenticated'),
          previousState: currentState
        });
      }
    } else {
      // Handle transition from signing state
      if (currentState.status === 'signing') {
        // Remove the completed operation
        const updatedOperations = currentState.operations.filter(
          op => op !== operation
        );
        
        if (updatedOperations.length === 0) {
          // No more operations, return to authenticated state
          set({
            status: 'authenticated',
            user: currentState.user,
            method: currentState.method
          });
        } else {
          // Still have pending operations
          set({
            operations: updatedOperations,
            operationCount: updatedOperations.length
          });
        }
      }
      // If not in signing state, this is a no-op
    }
  },
  
  logout: async () => {
    try {
      // Cancel any pending operations
      const currentState = get();
      if (currentState.status === 'signing') {
        // Reject any pending operations with cancellation error
        currentState.operations.forEach(operation => {
          operation.reject(new Error('Authentication session terminated'));
        });
      }

      // Clear NDK signer (will be handled by AuthService)
      
      // Securely clear all sensitive data from storage
      await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
      await AsyncStorage.multiRemove([
        'currentUser',
        'login',
        'signer',
        'auth.last_login',
        'auth.permissions',
        'auth.session',
        'ndkMobileSessionLastEose'
      ]);
      
      // Reset state to unauthenticated
      set({
        status: 'unauthenticated'
      });

      // Log the logout event (without PII)
      console.info('User logged out successfully');
      
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  },
  
  setError: (error) => {
    const currentState = get();
    set({
      status: 'error',
      error,
      previousState: currentState
    });
  }
}));

// Export a singleton for easier access
export const AuthStateManager = {
  getState: useAuthStore.getState,
  setState: useAuthStore,
  setAuthenticating: useAuthStore.getState().setAuthenticating,
  setAuthenticated: useAuthStore.getState().setAuthenticated,
  setSigningInProgress: useAuthStore.getState().setSigningInProgress,
  logout: useAuthStore.getState().logout,
  setError: useAuthStore.getState().setError
};
```

### 1.4 Auth Service

Create the service layer to manage authentication operations:

```typescript
// lib/auth/AuthService.ts
import { NDKUser, NDK, NDKSigner } from "@nostr-dev-kit/ndk";
import { 
  AuthMethod, 
  SigningOperation 
} from "./types";
import { AuthStateManager } from "./AuthStateManager";
import { SigningQueue } from "./SigningQueue";
import * as SecureStore from "expo-secure-store";

const PRIVATE_KEY_STORAGE_KEY = "powr.private_key";

export class AuthService {
  private ndk: NDK;
  private signingQueue = new SigningQueue();
  
  constructor(ndk: NDK) {
    this.ndk = ndk;
  }
  
  /**
   * Initialize from stored state
   */
  async initialize(): Promise<void> {
    try {
      // Try to restore previous auth session
      const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      
      if (privateKey) {
        await this.loginWithPrivateKey(privateKey);
      }
    } catch (error) {
      console.error("Error initializing auth service:", error);
    }
  }
  
  /**
   * Login with a private key
   */
  async loginWithPrivateKey(privateKey: string): Promise<NDKUser> {
    try {
      AuthStateManager.setAuthenticating('private_key');
      
      // Configure NDK with private key signer
      this.ndk.signer = await this.createPrivateKeySigner(privateKey);
      
      // Get user
      const user = await this.ndk.signer.user();
      
      // Store key securely
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKey);
      
      // Update auth state
      AuthStateManager.setAuthenticated(user, 'private_key');
      
      return user;
    } catch (error) {
      AuthStateManager.setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Login with Amber signer
   */
  async loginWithAmber(): Promise<NDKUser> {
    try {
      AuthStateManager.setAuthenticating('amber');
      
      // Request public key from Amber
      const { pubkey, packageName } = await this.requestAmberPublicKey();
      
      // Create an NDKAmberSigner
      this.ndk.signer = await this.createAmberSigner(pubkey, packageName);
      
      // Get user
      const user = await this.ndk.signer.user();
      
      // Update auth state
      AuthStateManager.setAuthenticated(user, 'amber');
      
      return user;
    } catch (error) {
      AuthStateManager.setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Create ephemeral key (no login)
   */
  async createEphemeralKey(): Promise<NDKUser> {
    try {
      AuthStateManager.setAuthenticating('ephemeral');
      
      // Generate a random key
      this.ndk.signer = await this.createEphemeralSigner();
      
      // Get user
      const user = await this.ndk.signer.user();
      
      // Update auth state
      AuthStateManager.setAuthenticated(user, 'ephemeral');
      
      return user;
    } catch (error) {
      AuthStateManager.setError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Logout
   */
  async logout(): Promise<void> {
    // Clear NDK signer
    this.ndk.signer = undefined;
    
    // Clear auth state
    AuthStateManager.logout();
  }
  
  // Private helper methods for creating specific signers
  private async createPrivateKeySigner(privateKey: string): Promise<NDKSigner> {
    // Implementation
    return null!;
  }
  
  private async requestAmberPublicKey(): Promise<{ pubkey: string, packageName: string }> {
    // Implementation
    return { pubkey: "", packageName: "" };
  }
  
  private async createAmberSigner(pubkey: string, packageName: string): Promise<NDKSigner> {
    // Implementation
    return null!;
  }
  
  private async createEphemeralSigner(): Promise<NDKSigner> {
    // Implementation
    return null!;
  }
}
```

### 1.5 React Context Provider

Create the React context provider for components to consume:

```typescript
// lib/auth/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from './AuthStateManager';
import { AuthService } from './AuthService';
import { NDK } from '@nostr-dev-kit/ndk';

// Create context
interface AuthContextValue {
  authService: AuthService;
  // Add any additional context properties needed
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Provider component
interface AuthProviderProps {
  children: React.ReactNode;
  ndk: NDK;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, ndk }) => {
  const [authService] = useState(() => new AuthService(ndk));
  const authState = useAuthStore();
  
  // Initialize on mount
  useEffect(() => {
    authService.initialize();
  }, [authService]);
  
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

// Hook for consuming context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Phase 2: Amber Signer Enhancements (2-3 days)

### 2.1 Native Module Updates

Update the Kotlin module to use background processing:

```kotlin
// android/app/src/main/java/com/powr/app/AmberSignerModule.kt
package com.powr.app

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class AmberSignerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val executorService = Executors.newFixedThreadPool(2)
    private val mainHandler = Handler(Looper.getMainLooper())
    private val pendingPromises = ConcurrentHashMap<String, Promise>()
    
    companion object {
        const val NAME = "AmberSigner"
        const val REQUEST_CODE_PUBLIC_KEY = 1
        const val REQUEST_CODE_SIGN = 2
    }
    
    override fun getName(): String = NAME
    
    @ReactMethod
    fun requestPublicKey(promise: Promise) {
        executorService.execute {
            try {
                val intent = createRequestPublicKeyIntent()
                
                // Store promise with a unique ID for correlation
                val requestId = UUID.randomUUID().toString()
                pendingPromises[requestId] = promise
                intent.putExtra("requestId", requestId)
                
                // Launch activity from main thread
                mainHandler.post {
                    try {
                        currentActivity?.startActivityForResult(intent, REQUEST_CODE_PUBLIC_KEY)
                    } catch (e: Exception) {
                        pendingPromises.remove(requestId)?.reject("E_LAUNCH_ERROR", e.message)
                    }
                }
            } catch (e: Exception) {
                promise.reject("E_PREPARATION_ERROR", e.message)
            }
        }
    }
    
    @ReactMethod
    fun signEvent(eventJson: String, currentUserPubkey: String, eventId: String?, promise: Promise) {
        executorService.execute {
            try {
                val intent = createSignEventIntent(eventJson, currentUserPubkey, eventId)
                
                // Store promise with a unique ID for correlation
                val requestId = UUID.randomUUID().toString()
                pendingPromises[requestId] = promise
                intent.putExtra("requestId", requestId)
                
                // Launch activity from main thread
                mainHandler.post {
                    try {
                        currentActivity?.startActivityForResult(intent, REQUEST_CODE_SIGN)
                    } catch (e: Exception) {
                        pendingPromises.remove(requestId)?.reject("E_LAUNCH_ERROR", e.message)
                    }
                }
            } catch (e: Exception) {
                promise.reject("E_PREPARATION_ERROR", e.message)
            }
        }
    }
    
    // Handle activity results
    fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        when (requestCode) {
            REQUEST_CODE_PUBLIC_KEY -> handlePublicKeyResult(resultCode, data)
            REQUEST_CODE_SIGN -> handleSignResult(resultCode, data)
        }
    }
    
    private fun handlePublicKeyResult(resultCode: Int, data: Intent?) {
        // Implementation
    }
    
    private fun handleSignResult(resultCode: Int, data: Intent?) {
        // Implementation
    }
    
    private fun createRequestPublicKeyIntent(): Intent {
        // Implementation
        return Intent()
    }
    
    private fun createSignEventIntent(eventJson: String, currentUserPubkey: String, eventId: String?): Intent {
        // Implementation
        return Intent()
    }
}
```

### 2.2 Enhanced NDKAmberSigner

Create an enhanced NDKAmberSigner that uses the queue:

```typescript
// lib/signers/NDKAmberSigner.ts
import { NDKSigner, NDKUser, NostrEvent } from "@nostr-dev-kit/ndk";
import { SigningQueue } from "../auth/SigningQueue";
import { NativeModules } from "react-native";

const { AmberSigner } = NativeModules;

export default class NDKAmberSigner implements NDKSigner {
  private static signingQueue = new SigningQueue();
  private _pubkey: string;
  private _user?: NDKUser;
  private packageName: string;
  
  constructor(pubkey: string, packageName: string) {
    this._pubkey = pubkey;
    this.packageName = packageName;
  }
  
  /**
   * Static method to request a public key from Amber
   */
  static async requestPublicKey(): Promise<{ pubkey: string, packageName: string }> {
    try {
      const result = await AmberSigner.requestPublicKey();
      return {
        pubkey: result.pubkey,
        packageName: result.packageName
      };
    } catch (error) {
      console.error('Error requesting public key from Amber:', error);
      throw error;
    }
  }
  
  /**
   * Blocks until the signer is ready
   */
  async blockUntilReady(): Promise<NDKUser> {
    if (this._user) return this._user;
    
    this._user = new NDKUser({ pubkey: this._pubkey });
    return this._user;
  }
  
  /**
   * Returns the NDKUser for this signer
   */
  async user(): Promise<NDKUser> {
    return this.blockUntilReady();
  }
  
  /**
   * Signs the given Nostr event using the queue-based approach
   */
  async sign(event: NostrEvent): Promise<string> {
    return new Promise((resolve, reject) => {
      // Add to signing queue instead of blocking
      NDKAmberSigner.signingQueue.enqueue({
        event,
        resolve,
        reject,
        timestamp: Date.now(),
        execute: async () => {
          try {
            console.debug('Signing event with Amber:', event.id);
            
            // Use the native module to sign
            const result = await AmberSigner.signEvent(
              JSON.stringify(event),
              this._pubkey,
              event.id
            );
            
            return result.signature;
          } catch (error) {
            console.error('Error signing with Amber:', error);
            throw error;
          }
        }
      });
    });
  }
  
  /**
   * Returns the pubkey
   */
  getPublicKey(): string {
    return this._pubkey;
  }
}
```

## Phase 3: NDK Store Integration (2-3 days)

### 3.1 Update NDK Store to Use Auth System

```typescript
// lib/stores/ndk.ts
import NDK, { NDKConstructorParams, NDKEvent, NDKSigner, NDKUser } from "@nostr-dev-kit/ndk";
import { create } from "zustand";
import { AuthService } from "../auth/AuthService";
import { useAuthStore } from "../auth/AuthStateManager";
import * as SecureStore from "expo-secure-store";

export type InitNDKParams = NDKConstructorParams & {
  // Any additional params
}

type State = {
  ndk: NDK;
  authService: AuthService | null;
  initialParams: InitNDKParams;
}

type Actions = {
  init: (ndk: NDK) => void;
  login: (privateKey: string) => Promise<NDKUser>;
  loginWithAmber: () => Promise<NDKUser>;
  createEphemeralUser: () => Promise<NDKUser>;
  logout: () => void;
}

export const useNDKStore = create<State & Actions>((set, get) => ({
  ndk: undefined,
  authService: null,
  initialParams: undefined,
  
  init: (ndk: NDK) => {
    const authService = new AuthService(ndk);
    
    set({
      ndk,
      authService,
    });
    
    // Initialize auth service
    authService.initialize();
  },
  
  login: async (privateKey: string) => {
    const { authService } = get();
    if (!authService) throw new Error('Auth service not initialized');
    
    return authService.loginWithPrivateKey(privateKey);
  },
  
  loginWithAmber: async () => {
    const { authService } = get();
    if (!authService) throw new Error('Auth service not initialized');
    
    return authService.loginWithAmber();
  },
  
  createEphemeralUser: async () => {
    const { authService } = get();
    if (!authService) throw new Error('Auth service not initialized');
    
    return authService.createEphemeralKey();
  },
  
  logout: () => {
    const { authService } = get();
    if (!authService) return;
    
    authService.logout();
  }
}));
```

## Phase 4: Component Integration (5-7 days)

### 4.1 Update Login Sheet

```typescript
// components/sheets/NostrLoginSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useNDKStore } from '@/lib/stores/ndk';
import { useAuthStore } from '@/lib/auth/AuthStateManager';
import { ExternalSignerUtils } from '@/utils/ExternalSignerUtils';

export default function NostrLoginSheet() {
  const { login, loginWithAmber, createEphemeralUser } = useNDKStore();
  const [privateKey, setPrivateKey] = useState('');
  const [isExternalSignerAvailable, setIsExternalSignerAvailable] = useState(false);
  const authState = useAuthStore();
  
  // Check for external signer availability
  useEffect(() => {
    const checkExternalSigner = async () => {
      if (Platform.OS === 'android') {
        const available = await ExternalSignerUtils.isExternalSignerInstalled();
        setIsExternalSignerAvailable(available);
      }
    };
    
    checkExternalSigner();
  }, []);
  
  // Handle private key login
  const handlePrivateKeyLogin = async () => {
    try {
      await login(privateKey);
      // Handle success (close sheet, etc.)
    } catch (error) {
      // Handle error
      console.error('Login error:', error);
    }
  };
  
  // Handle Amber login
  const handleAmberLogin = async () => {
    try {
      await loginWithAmber();
      // Handle success (close sheet, etc.)
    } catch (error) {
      // Handle error
      console.error('Amber login error:', error);
    }
  };
  
  // Handle ephemeral login
  const handleEphemeralLogin = async () => {
    try {
      await createEphemeralUser();
      // Handle success (close sheet, etc.)
    } catch (error) {
      // Handle error
      console.error('Ephemeral login error:', error);
    }
  };
  
  // Show loading state when authenticating
  if (authState.status === 'authenticating') {
    return (
      <View>
        <Text>Authenticating...</Text>
        {/* Add a spinner or other loading indicator */}
      </View>
    );
  }
  
  return (
    <View>
      {/* Private key input */}
      {/* ... */}
      
      {/* Login buttons */}
      <TouchableOpacity onPress={handlePrivateKeyLogin}>
        <Text>Login with Private Key</Text>
      </TouchableOpacity>
      
      {isExternalSignerAvailable && (
        <TouchableOpacity onPress={handleAmberLogin}>
          <Text>Login with Amber</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity onPress={handleEphemeralLogin}>
        <Text>Continue without Login</Text>
      </TouchableOpacity>
      
      {/* Error display */}
      {authState.status === 'error' && (
        <Text style={{ color: 'red' }}>{authState.error.message}</Text>
      )}
    </View>
  );
}
```

### 4.2 Auth Status Component

Create a component to display auth status:

```typescript
// components/AuthStatus.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/lib/auth/AuthStateManager';

export default function AuthStatus() {
  const authState = useAuthStore();
  
  // Show different status based on auth state
  switch (authState.status) {
    case 'unauthenticated':
      return (
        <View>
          <Text>Not logged in</Text>
        </View>
      );
      
    case 'authenticating':
      return (
        <View>
          <ActivityIndicator size="small" />
          <Text>Logging in...</Text>
        </View>
      );
      
    case 'authenticated':
      return (
        <View>
          <Text>Logged in as: {authState.user.npub}</Text>
        </View>
      );
      
    case 'signing':
      return (
        <View>
          <ActivityIndicator size="small" />
          <Text>Signing {authState.operationCount} operations...</Text>
        </View>
      );
      
    case 'error':
      return (
        <View>
          <Text style={{ color: 'red' }}>Error: {authState.error.message}</Text>
        </View>
      );
      
    default:
      return null;
  }
}
```

## Testing Strategy

### Unit Tests

Create unit tests for core components:

```typescript
// __tests__/auth/AuthStateManager.test.ts
import { AuthStateManager } from '@/lib/auth/AuthStateManager';
import { NDKUser } from '@nostr-dev-kit/ndk';

describe('AuthStateManager', () => {
  beforeEach(() => {
    // Reset state between tests
    AuthStateManager.logout();
  });
  
  test('initial state is unauthenticated', () => {
    const state = AuthStateManager.getState();
    expect(state.status).toBe('unauthenticated');
  });
  
  test('setAuthenticating updates state', () => {
    AuthStateManager.setAuthenticating('private_key');
    const state = AuthStateManager.getState();
    expect(state.status).toBe('authenticating');
    expect(state.method).toBe('private_key');
  });
  
  // Additional tests...
});
```

### Integration Tests

Test the integration between components:

```typescript
// __tests__/integration/AuthFlow.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import { NDK } from '@nostr-dev-kit/ndk';

describe('Authentication Flow', () => {
  let ndk: NDK;
  
  beforeEach(() => {
    ndk = new NDK();
  });
  
  test('login flow works correctly', async () => {
    const { getByText, getByPlaceholderText } = render(
      <AuthProvider ndk={ndk}>
        <NostrLoginSheet />
      </AuthProvider>
    );
    
    // Fill in private key
    fireEvent.changeText(
      getByPlaceholderText('Enter private key'),
      'test-private-key'
    );
    
    // Press login button
    fireEvent.press(getByText('Login with Private Key'));
    
    // Verify loading state appears
    await waitFor(() => {
      expect(getByText('Authenticating...')).toBeTruthy();
    });
    
    // Verify success state (this would require mocking the NDK signer)
    // ...
  });
  
  // Additional tests...
});
```

## Migration Path

### Feature Flag Implementation

Add a feature flag to toggle the new auth system:

```typescript
// lib/flags.ts
export const FLAGS = {
  useNewAuthSystem: true, // Toggle this for testing
};

// In NDK store init
import { FLAGS } from '@/lib/flags';

// ...

init: (ndk: NDK) => {
  if (FLAGS.useNewAuthSystem) {
    // Use new auth system
    const authService = new AuthService(ndk);
    set({
      ndk,
      authService,
    });
    authService.initialize();
  } else {
    // Use existing implementation
    set({
      ndk,
      authService: null,
    });
    
    // Legacy initialization
    const key = settingsStore?.getSync('login');
    if (key) get().login(key);
  }
},
```

### Gradual Component Migration

1. Create HOCs to support both auth systems:
