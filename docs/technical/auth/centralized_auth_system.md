# Centralized Authentication System

**Last Updated:** 2025-04-02  
**Status:** Proposed  
**Authors:** POWR Team

## Problem Statement

POWR's current authentication implementation experiences performance issues, particularly on Android with Amber integration:

1. **UI Thread Blocking**: The current implementation uses synchronous `startActivityForResult` calls that block the main UI thread while waiting for Amber to respond, causing the app to freeze during signing operations.

2. **Login Performance**: Initial login with Amber is slow due to the synchronous nature of the calls.

3. **Event Signing Freezes**: Each event signing operation (kind 1, 1301, 33401, 33402, etc.) blocks the UI thread, making the app unresponsive when signing events.

4. **Lack of State Management**: The current authentication system uses boolean flags rather than proper state management, causing cascading issues when authentication state changes.

5. **React Hook Inconsistencies**: Components that conditionally use hooks based on authentication state can encounter ordering issues during state transitions.

## Architecture Solution

We propose a comprehensive refactoring of the authentication system with three core components:

### 1. State Machine Pattern

Replace the current boolean-based authentication state with a formal state machine:

```typescript
type AuthState = 
  | { status: 'unauthenticated' }
  | { status: 'authenticating', method: 'private_key' | 'amber' | 'ephemeral' }
  | { status: 'authenticated', user: NDKUser, method: 'private_key' | 'amber' | 'ephemeral' }
  | { status: 'signing', operationCount: number, operations: SigningOperation[] }
  | { status: 'error', error: Error };
```

This approach provides:
- Clear, defined transitions between authentication states
- Prevention of invalid state transitions
- Consistent state management across components
- Better error handling and recovery

### 2. Background Processing & Queue Management

Implement a non-blocking operation model for Amber communications:

1. **Thread Pool in Native Layer**: Create a dedicated thread pool for Amber operations in the Kotlin layer
2. **Operation Queue in JS Layer**: Implement a queue system to manage signing operations
3. **Asynchronous Bridge**: Convert the current synchronous API to a fully asynchronous model

This approach eliminates UI freezing by moving all Amber operations off the main thread.

### 3. Centralized Authentication Service

Create a new service layer to centralize authentication logic:

```
lib/
├── auth/                              # New centralized auth directory
│   ├── AuthProvider.tsx               # React Context Provider 
│   ├── AuthService.ts                 # Core authentication service
│   ├── SigningQueue.ts                # Background queue for signing operations
│   ├── AuthStateManager.ts            # Authentication state machine
│   └── types.ts                       # Type definitions
```

This provides:
- Single source of truth for authentication state
- Clean separation of concerns
- Consistent interface for components
- Improved testability

## Implementation Details

### Native Layer Changes (Kotlin)

Modify `AmberSignerModule.kt` to use a background thread pool:

```kotlin
private val executorService = Executors.newFixedThreadPool(2)
private val mainHandler = Handler(Looper.getMainLooper())
private val pendingPromises = ConcurrentHashMap<String, Promise>()

@ReactMethod
fun signEvent(eventJson: String, currentUserPubkey: String, eventId: String?, promise: Promise) {
    // Execute in background thread pool
    executorService.execute {
        try {
            // Create intent - similar to current code
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
```

### JavaScript Layer: SigningQueue Implementation

Based on insights from the NDK-mobile repo's signer implementations, we'll create an enhanced SigningQueue:

```typescript
// lib/auth/SigningQueue.ts
export class SigningQueue {
  private queue: SigningOperation[] = [];
  private processing = false;
  private maxConcurrent = 1; // Limit concurrent operations
  private activeCount = 0;

  async enqueue(event: NostrEvent): Promise<string> {
    return new Promise((resolve, reject) => {
      // Add to queue and process
      this.queue.push({ event, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    try {
      const operation = this.queue.shift()!;
      this.activeCount++;
      
      try {
        // Update state to show signing in progress
        AuthStateManager.setSigningInProgress(true, operation);
        
        // Perform the actual signing operation
        const signature = await ExternalSignerUtils.signEvent(
          operation.event, 
          operation.event.pubkey
        );
        
        operation.resolve(signature);
      } catch (error) {
        operation.reject(error);
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
}
```

### Enhanced NDKAmberSigner

Inspired by the NDK-mobile `NDKNip55Signer` implementation:

```typescript
// lib/signers/EnhancedNDKAmberSigner.ts
export default class EnhancedNDKAmberSigner implements NDKSigner {
  private static signingQueue = new SigningQueue();
  private _pubkey: string;
  private _user?: NDKUser;
  
  constructor(pubkey: string, packageName: string) {
    this._pubkey = pubkey;
    this.packageName = packageName;
  }
  
  /**
   * Blocks until the signer is ready and returns the associated NDKUser.
   */
  async blockUntilReady(): Promise<NDKUser> {
    if (this._user) return this._user;
    
    this._user = new NDKUser({ pubkey: this._pubkey });
    return this._user;
  }
  
  /**
   * Getter for the user property.
   */
  async user(): Promise<NDKUser> {
    return this.blockUntilReady();
  }
  
  /**
   * Signs the given Nostr event using the queue-based system
   */
  async sign(event: NostrEvent): Promise<string> {
    console.log('AMBER SIGNER SIGNING', event);
    // Use the queue instead of direct signing
    return EnhancedNDKAmberSigner.signingQueue.enqueue(event);
  }
  
  getPublicKey(): string {
    return this._pubkey;
  }
}
```

### Zustand-Based Auth Store

Drawing from the NDK-mobile store implementation:

```typescript
// lib/auth/AuthStore.ts
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  status: 'unauthenticated',
  user: null,
  method: null,
  signingOperations: [],
  error: null,
  
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
      error: null
    });
  },
  
  setSigningInProgress: (inProgress, operation) => {
    const currentState = get();
    
    if (inProgress) {
      // Add operation to signing state
      set({
        status: 'signing',
        operationCount: (currentState.status === 'signing' ? currentState.operationCount : 0) + 1,
        signingOperations: [
          ...(currentState.status === 'signing' ? currentState.signingOperations : []),
          operation
        ]
      });
    } else {
      // Remove operation from signing state
      const operations = currentState.status === 'signing' 
        ? currentState.signingOperations.filter(op => op !== operation)
        : [];
        
      if (operations.length === 0) {
        // Return to authenticated state if no more operations
        set({
          status: 'authenticated',
          user: currentState.user,
          method: currentState.method,
        });
      } else {
        // Update count but stay in signing state
        set({
          signingOperations: operations,
          operationCount: operations.length
        });
      }
    }
  },
  
  logout: () => {
    // Clear NDK signer
    if (ndk) ndk.signer = undefined;
    
    // Clear secure storage
    SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
    AsyncStorage.multiRemove([
      'currentUser',
      'login',
      'signer',
      'auth.last_login'
    ]);
    
    // Reset state
    set({
      status: 'unauthenticated',
      user: null,
      method: null,
      signingOperations: [],
      error: null
    });
  },
  
  setError: (error) => {
    set({
      status: 'error',
      error
    });
  }
}));
```

## Integration with User Avatars and Robohash

As part of our authentication enhancement, we'll integrate the Robohash service for user avatars:

### Avatar Utility Functions

```typescript
// utils/avatar.ts
import { Platform } from 'react-native';

/**
 * Constants for avatar generation
 */
export const AVATAR_PLACEHOLDER = 'https://robohash.org/placeholder?set=set4';

/**
 * Generates a Robohash URL for a given public key
 */
export function generateRobohashUrl(pubkey: string, size = 150): string {
  // Use the pubkey as the seed for Robohash
  // Set 4 is the "kittens" set, which is more visually appealing than robots
  return `https://robohash.org/${pubkey}?set=set4&size=${size}x${size}`;
}

/**
 * Determines the appropriate avatar URL based on authentication state
 */
export function getAvatarUrl(params: {
  profileImageUrl?: string;
  pubkey?: string;
  isAuthenticated: boolean;
  method?: 'private_key' | 'amber' | 'ephemeral';
}): string {
  const { profileImageUrl, pubkey, isAuthenticated, method } = params;
  
  // If we have a profile image URL and it's valid, use it
  if (profileImageUrl && profileImageUrl.startsWith('http')) {
    return profileImageUrl;
  }
  
  // If user is authenticated but doesn't have a profile image,
  // generate a Robohash based on their pubkey
  if (isAuthenticated && pubkey) {
    return generateRobohashUrl(pubkey);
  }
  
  // Use placeholder for unauthenticated or ephemeral users
  return AVATAR_PLACEHOLDER;
}

/**
 * Creates appropriate caching parameters for avatar images
 */
export function getAvatarCacheOptions() {
  return {
    // Images should be cached for 7 days
    expiresIn: 7 * 24 * 60 * 60 * 1000,
    // Use memory cache for better performance
    immutable: true,
    // Platform-specific cache behavior
    ...Platform.select({
      web: {
        cache: 'force-cache'
      },
      default: {
        // React Native specific cache options
      }
    })
  };
}
```

### Enhanced UserAvatar Component

```typescript
// components/UserAvatar.tsx
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Avatar } from 'components/ui/avatar';
import { useAuthStore } from 'lib/auth/AuthStore';
import { getAvatarUrl, getAvatarCacheOptions } from 'utils/avatar';

export interface UserAvatarProps {
  profileImageUrl?: string;
  pubkey?: string;
  size?: 'sm' | 'md' | 'lg' | number;
  onPress?: () => void;
}

const SIZE_MAP = {
  sm: 32,
  md: 48,
  lg: 64
};

export function UserAvatar({ 
  profileImageUrl, 
  pubkey,
  size = 'md',
  onPress
}: UserAvatarProps) {
  const { status, user, method } = useAuthStore();
  const isAuthenticated = status === 'authenticated' || status === 'signing';
  
  // If no pubkey provided, use the authenticated user's pubkey
  const effectivePubkey = pubkey || (user?.pubkey);
  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size];
  
  // Determine the correct avatar URL
  const avatarUrl = getAvatarUrl({
    profileImageUrl,
    pubkey: effectivePubkey,
    isAuthenticated,
    method
  });
  
  return (
    <Avatar
      size={numericSize}
      onPress={onPress}
      source={{
        uri: avatarUrl,
        ...getAvatarCacheOptions()
      }}
      fallback={
        <Image
          source={{ uri: generateRobohashUrl('placeholder', numericSize) }}
          style={{ width: numericSize, height: numericSize, borderRadius: numericSize / 2 }}
        />
      }
    />
  );
}
```

## iOS Considerations

While the primary performance issues affect Android due to the Amber integration, the centralized authentication system will also benefit iOS in several ways:

1. **Unified Authentication Experience**: The state machine approach ensures consistent authentication behavior across platforms.

2. **Future External Signer Support**: As NIP-55 compliant signers become available on iOS, the architecture is ready to support them.

3. **Enhanced State Management**: The state machine approach improves React hook ordering issues that can affect both platforms.

4. **Consistent UI Feedback**: Authentication state indicators will work consistently across both platforms.

5. **Performance Benefits**: Though iOS doesn't use Amber, the queue-based signature system still benefits performance by preventing multiple simultaneous signing operations.

6. **Cleaner Code Structure**: The centralized authentication service provides a cleaner approach for all platforms, making iOS-specific code easier to maintain.

## Private Key Security

This architecture maintains and enhances the existing security measures for private keys:

### iOS Private Key Storage

On iOS, private keys (nsec) are stored securely using `expo-secure-store`, which leverages iOS's Keychain Services. This provides:

- Data encrypted at rest using the device's security hardware
- Protection from other apps accessing the keychain data
- Automatic removal when the app is uninstalled

The current implementation in `lib/stores/ndk.ts` already uses `SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKeyHex)` to store private keys securely, and this implementation will be maintained in the new architecture.

### Android Private Key Storage

On Android, private keys are stored using `expo-secure-store`, which leverages Android's EncryptedSharedPreferences. This provides:

- Encryption of both keys and values
- Integration with Android Keystore
- Protection by the device's security model

For Amber users, no private key is stored in POWR at all - only the public key is stored. The private key remains exclusively in the Amber app, providing maximum security.

### Key Lifecycle

The new architecture enhances key security through clear state transitions:

1. **Key Generation**: Generated keys never leave the JavaScript context until stored
2. **Key Storage**: Keys are immediately stored in secure storage
3. **Key Retrieval**: Keys are loaded directly into the signer without unnecessary exposure
4. **Key Deletion**: On logout, keys are completely removed from secure storage

This state machine approach ensures there are no "in-between" states where keys might be exposed.

## NDK Integration Insights

From reviewing the NDK and NDK-mobile repositories, we've incorporated several best practices:

1. **Cleaner Signer Interface**: Based on NDK-mobile's `NDKNip55Signer`, our implementation has a cleaner interface with better error handling and logging.

2. **State Management**: Adopted Zustand-based state management similar to the NDK-mobile approach, but enhanced with our state machine model.

3. **Authentication Flow**: Incorporated the cleaner login/logout flow from NDK store with enhanced persistent state management.

4. **Signer Initialization**: Added `blockUntilReady` pattern to ensure signers are properly initialized before use.

These patterns from the reference repositories provide a solid foundation for our enhanced architecture while addressing the specific performance issues in our application.

## Migration Strategy

To implement this architecture while minimizing disruption:

### Phased Implementation

1. **Create Core Infrastructure**: First implement the AuthStateManager and SigningQueue without changing existing code
2. **Adapt NDK Store**: Update the NDK store to use the new authentication system
3. **Update Native Module**: Modify AmberSignerModule to use background processing
4. **Component Migration**: Gradually update components to use the new system

### Feature Flag Approach

Implement a feature flag to toggle between old and new authentication systems:

```typescript
const useNewAuthSystem = true; // Toggle for testing

// In NDKStore
if (useNewAuthSystem) {
  // Use new AuthService
} else {
  // Use existing implementation
}
```

This allows for:
- A/B testing during development
- Easy rollback if issues are discovered
- Gradual migration of components

## Benefits

This architecture provides significant improvements:

1. **Immediate Performance Benefits**: Eliminates UI freezing during authentication and signing
2. **Improved User Experience**: Provides visual feedback during signing operations
3. **Enhanced Stability**: Proper state management prevents cascading issues
4. **Better Developer Experience**: Clean separation of concerns makes the code more maintainable
5. **Future Extensibility**: This foundation makes it easier to add features like batch signing
6. **Consistent Avatars**: Users always have a visual representation, whether using robohash or custom images

## Timeline and Resources

### Estimated Timeline

1. **Planning and Design**: 1-2 days
2. **Core Infrastructure**: 3-4 days
3. **Native Module Updates**: 2-3 days
4. **Integration and Testing**: 3-5 days
5. **Component Migration**: 5-7 days (progressive)

**Total**: 2-3 weeks for full implementation

### Resources Required

- 1 React Native developer with TypeScript experience
- 1 Android developer with Kotlin experience
- Testing devices with Amber installed
