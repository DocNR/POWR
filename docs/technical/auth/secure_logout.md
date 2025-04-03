# Secure Logout Procedures in Authentication Architecture

**Last Updated:** 2025-04-02  
**Status:** Proposed  
**Authors:** POWR Team

## Overview

This document outlines the secure logout procedures implemented in POWR's centralized authentication system. Proper logout handling is critical for security, especially when dealing with cryptographic keys and external signers like Amber.

## Security Considerations for Logout

A comprehensive logout procedure must address several security concerns:

1. **Cancellation of In-flight Operations**: Any pending signing operations must be properly terminated.
2. **Secure Removal of Keys**: Private keys and session data must be securely erased from memory and storage.
3. **External Signer Communication**: External signers like Amber must be notified of session termination.
4. **Subscription Termination**: NDK subscriptions must be closed to prevent data leakage.
5. **Memory Cache Clearing**: Any in-memory caches must be purged.
6. **UI State Reset**: The UI must reflect the unauthenticated state immediately.

## Implementation Details

### Core Logout Service

The `AuthService` class provides a comprehensive logout method:

```typescript
/**
 * Performs a secure logout, removing all authentication artifacts
 * and ensuring no sensitive data remains
 */
async logout(): Promise<boolean> {
  try {
    // 1. Cancel any pending signing operations
    if (this.signingQueue) {
      this.signingQueue.cancelAll('User logged out');
    }
    
    // 2. Notify the Amber app of session termination (Android only)
    if (Platform.OS === 'android' && this.ndk.signer instanceof NDKAmberSigner) {
      try {
        await NativeModules.AmberSigner.terminateSession();
      } catch (error) {
        console.warn('Error terminating Amber session:', error);
        // Continue with logout even if Amber notification fails
      }
    }
    
    // 3. Clear the NDK signer reference
    this.ndk.signer = undefined;
    
    // 4. Clear all subscriptions to prevent data leakage after logout
    this.clearSubscriptions();
    
    // 5. Clear secure storage and AsyncStorage
    const storageOperations = [
      SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY),
      AsyncStorage.multiRemove([
        'currentUser',
        'login',
        'signer',
        'auth.last_login',
        'auth.permissions',
        'auth.session',
        'ndkMobileSessionLastEose'
      ])
    ];
    
    await Promise.all(storageOperations);
    
    // 6. Update auth state
    AuthStateManager.logout();
    
    // 7. Clear memory cache if implemented
    this.clearMemoryCache();
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Even if an error occurs, still try to reset the state
    AuthStateManager.logout();
    
    return false;
  }
}

/**
 * Clears all active NDK subscriptions to prevent data leakage
 */
private clearSubscriptions(): void {
  if (this.ndk.pool) {
    // Close all relay connections
    this.ndk.pool.close();
  }
}

/**
 * Clears any in-memory cached data
 */
private clearMemoryCache(): void {
  // Implementation will depend on your caching strategy
  // Clear any in-memory caches here
}
```

### Signing Queue Cancellation

The `SigningQueue` class implements a method to cancel all pending operations:

```typescript
/**
 * Cancels all pending operations in the queue
 * @param reason The reason for cancellation
 */
cancelAll(reason: string): void {
  const error = new Error(`Signing operations canceled: ${reason}`);
  
  // Reject all queued operations
  this.queue.forEach(operation => {
    operation.reject(error);
  });
  
  // Clear the queue
  this.queue = [];
  
  // Reset processing state
  this.processing = false;
  this.activeCount = 0;
}
```

### AuthStateManager Logout

The `AuthStateManager` implements a logout method that ensures the UI is immediately updated:

```typescript
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
}
```

## Android-Specific Considerations

On Android, the Amber integration requires additional handling during logout:

1. **Amber Session Termination**: The native Amber module should be extended to include a `terminateSession` method:

```kotlin
@ReactMethod
fun terminateSession(promise: Promise) {
    executorService.execute {
        try {
            // Create a "terminate session" intent to notify Amber
            val intent = Intent("nostrsigner://terminate")
            intent.setPackage("com.greenart7c3.nostrsigner")
            
            // Add metadata to the intent
            intent.putExtra("app", "powr")
            
            // Launch the intent
            mainHandler.post {
                try {
                    currentActivity?.startActivity(intent)
                    promise.resolve(true)
                } catch (e: Exception) {
                    promise.reject("E_TERMINATE_ERROR", e.message)
                }
            }
        } catch (e: Exception) {
            promise.reject("E_PREPARATION_ERROR", e.message)
        }
    }
}
```

2. **Pending Promises Cleanup**: Any pending promises in the native module should be rejected:

```kotlin
@ReactMethod
fun cancelAllPendingOperations(promise: Promise) {
    val error = "Operations canceled due to logout"
    pendingPromises.forEach { (_, pendingPromise) ->
        pendingPromise.reject("E_CANCELED", error)
    }
    pendingPromises.clear()
    promise.resolve(true)
}
```

## iOS Considerations

On iOS, the focus is on secure deletion of private keys:

1. **Keychain Cleanup**: The private key stored in the iOS Keychain must be securely removed:

```typescript
// iOS-specific cleanup
if (Platform.OS === 'ios') {
  await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
  // Additional iOS-specific cleanup as needed
}
```

2. **Memory Zeroing**: For additional security, any in-memory copies of private keys should be zeroed:

```typescript
// Helper function to securely zero sensitive data in memory
function securelyZeroMemory(variableRef: any): void {
  if (typeof variableRef === 'string') {
    // Overwrite the string with zeros
    // Note: JavaScript strings are immutable, so this creates a new string
    // The garbage collector will eventually clean up the original
    for (let i = 0; i < variableRef.length; i++) {
      variableRef = variableRef.substring(0, i) + '0' + variableRef.substring(i + 1);
    }
  } else if (ArrayBuffer.isView(variableRef)) {
    // For typed arrays, we can actually zero the memory
    const view = new Uint8Array(variableRef.buffer);
    view.fill(0);
  }
}
```

## Logout UI Component

A dedicated logout button component ensures consistent logout behavior across the app:

```typescript
// components/LogoutButton.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNDKStore } from '@/lib/stores/ndk';
import { useAuthStore } from '@/lib/auth/AuthStateManager';

export function LogoutButton() {
  const { logout } = useNDKStore();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  
  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
      // Show error to user if needed
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.button} 
      onPress={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>Sign Out</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
```

## Testing Logout Security

Thorough testing should verify:

1. **Complete Removal**: Verify all authentication data is removed after logout
2. **State Reset**: Confirm the UI properly reflects the unauthenticated state
3. **Failed Attempts**: Test that authentication attempts fail after logout
4. **Pending Operations**: Verify pending operations are properly canceled
5. **External Signer**: Confirm Amber sessions are terminated

Example test cases:

```typescript
// __tests__/auth/logout.test.ts
describe('Logout Security', () => {
  it('should reject pending operations on logout', async () => {
    // Set up an authenticated state
    // ...
    
    // Start a signing operation but don't let it complete
    const signingPromise = authService.sign(mockEvent);
    
    // Logout before the operation completes
    authService.logout();
    
    // Verify the operation was rejected
    await expect(signingPromise).rejects.toThrow('Authentication session terminated');
  });
  
  it('should clear all secure storage on logout', async () => {
    // Set up an authenticated state
    // ...
    
    // Mock SecureStore to verify deletion
    const mockDeleteItem = jest.spyOn(SecureStore, 'deleteItemAsync');
    
    // Perform logout
    await authService.logout();
    
    // Verify the private key was deleted
    expect(mockDeleteItem).toHaveBeenCalledWith(PRIVATE_KEY_STORAGE_KEY);
  });
  
  // Additional tests...
});
```

## Security Best Practices

1. **Immediate UI Feedback**: Always update the UI immediately on logout to prevent confusion.
2. **Graceful Error Handling**: Continue with logout even if individual cleanup steps fail.
3. **Comprehensive Cleanup**: Remove all authentication artifacts, not just the obvious ones.
4. **Defensive Programming**: Assume any step might fail and account for it.
5. **Session Invalidation**: Notify external services of session termination when possible.
6. **Audit Logging**: Log logout events (without PII) for security audit purposes.

By following these practices, the logout procedure ensures maximum security and a seamless user experience.
