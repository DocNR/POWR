import { create } from "zustand";
import { NDKUser } from "@nostr-dev-kit/ndk";
import * as SecureStore from "expo-secure-store";
import { 
  AuthState, 
  AuthActions, 
  AuthMethod,
  SigningOperation 
} from "./types";

const PRIVATE_KEY_STORAGE_KEY = "powr.private_key";

/**
 * Zustand store that manages the authentication state
 * Acts as a state machine to ensure consistent transitions
 */
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  status: 'unauthenticated',
  
  /**
   * Sets the state to authenticating with the specified method
   */
  setAuthenticating: (method) => {
    console.log(`[Auth] Setting state to authenticating with method: ${method}`);
    set({ 
      status: 'authenticating',
      method 
    });
  },
  
  /**
   * Sets the state to authenticated with the specified user and method
   */
  setAuthenticated: (user, method) => {
    console.log(`[Auth] Setting state to authenticated for user: ${user.npub}`);
    set({
      status: 'authenticated',
      user,
      method,
    });
  },
  
  /**
   * Manages transitions to and from the signing state
   * When inProgress is true, adds an operation to the signing state
   * When inProgress is false, removes an operation from the signing state
   */
  setSigningInProgress: (inProgress, operation) => {
    const currentState = get();
    
    if (inProgress) {
      // Handle transition to signing state
      if (currentState.status === 'signing') {
        // Already in signing state, update the operations list and count
        console.log(`[Auth] Adding operation to signing state (total: ${currentState.operationCount + 1})`);
        set({
          operationCount: currentState.operationCount + 1,
          operations: [...currentState.operations, operation]
        });
      } else if (currentState.status === 'authenticated') {
        // Transition from authenticated to signing
        console.log(`[Auth] Transitioning from authenticated to signing state`);
        set({
          status: 'signing',
          user: currentState.user,
          method: currentState.method,
          operationCount: 1,
          operations: [operation]
        });
      } else {
        // Invalid state transition - can only sign when authenticated
        console.error(`[Auth] Cannot sign: not authenticated (current state: ${currentState.status})`);
        set({
          status: 'error',
          error: new Error(`Cannot sign: not in authenticated state (current: ${currentState.status})`),
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
          console.log(`[Auth] All operations complete, returning to authenticated state`);
          set({
            status: 'authenticated',
            user: currentState.user,
            method: currentState.method
          });
        } else {
          // Still have pending operations
          console.log(`[Auth] Operation complete, ${updatedOperations.length} operations remain`);
          set({
            operations: updatedOperations,
            operationCount: updatedOperations.length
          });
        }
      }
      // If not in signing state, this is a no-op
    }
  },
  
  /**
   * Performs a secure logout, clearing all auth state and secure storage
   */
  logout: async () => {
    try {
      console.log(`[Auth] Logging out user`);
      
      // Cancel any pending operations
      const currentState = get();
      if (currentState.status === 'signing') {
        console.log(`[Auth] Canceling ${currentState.operations.length} pending signing operations`);
        // Reject any pending operations with cancellation error
        currentState.operations.forEach(operation => {
          operation.reject(new Error('Authentication session terminated'));
        });
      }

      // Securely clear all sensitive data from storage
      const keysToDelete = [
        PRIVATE_KEY_STORAGE_KEY,
        'nostr_privkey',  // Original key name from ndk store
        'nostr_external_signer' // External signer info
      ];
      
      // Delete all secure keys
      await Promise.all(
        keysToDelete.map(key => SecureStore.deleteItemAsync(key))
      );
      
      // Reset state to unauthenticated
      set({
        status: 'unauthenticated'
      });

      // Log the logout event (without PII)
      console.info('[Auth] User logged out successfully');
      
      return true;
    } catch (error) {
      console.error('[Auth] Error during logout:', error);
      return false;
    }
  },
  
  /**
   * Sets the state to error with the specified error
   */
  setError: (error) => {
    console.error(`[Auth] Error: ${error.message}`);
    const currentState = get();
    set({
      status: 'error',
      error,
      previousState: currentState
    });
  }
}));

/**
 * Singleton for easier access to the auth store from non-React contexts
 */
export const AuthStateManager = {
  getState: useAuthStore.getState,
  setState: useAuthStore,
  setAuthenticating: useAuthStore.getState().setAuthenticating,
  setAuthenticated: useAuthStore.getState().setAuthenticated,
  setSigningInProgress: useAuthStore.getState().setSigningInProgress,
  logout: useAuthStore.getState().logout,
  setError: useAuthStore.getState().setError
};
