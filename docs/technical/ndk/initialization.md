# NDK Initialization

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Nostr Integration, App Startup

## Purpose

This document outlines the initialization process for the Nostr Development Kit (NDK) in the POWR app. It explains how NDK is configured, how connections to relays are established, and how the singleton instance is managed throughout the app lifecycle. Proper initialization is critical for consistent behavior, connection management, and efficient resource usage.

## Overview

NDK initialization follows a singleton pattern to ensure only one instance exists throughout the application. This prevents resource waste, connection duplication, and inconsistent behavior. The initialization process includes configuring relays, setting up authentication, and establishing connections at the appropriate moment in the app lifecycle.

## Implementation Details

### Singleton Pattern

The NDK instance is managed through a Zustand store that ensures a single source of truth:

```typescript
// lib/initNDK.ts

import { create } from 'zustand';
import NDK from '@nostr-dev-kit/ndk';
import { NDKRelaySet } from '@nostr-dev-kit/ndk/dist/relay/relay-set';
import { AppState, AppStateStatus } from 'react-native';
import { POWR_EXPLICIT_RELAYS } from '@/constants/relays';

// Define NDK state type
interface NDKState {
  ndk: NDK | null;
  initialized: boolean;
  connecting: boolean;
  connected: boolean;
  connectionError: Error | null;
  
  // Actions
  initialize: () => Promise<NDK>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// Create a private store instance
const useNDKStore = create<NDKState>((set, get) => ({
  ndk: null,
  initialized: false,
  connecting: false,
  connected: false,
  connectionError: null,
  
  // Initialize NDK instance
  initialize: async () => {
    // Skip if already initialized
    if (get().initialized) return get().ndk!;
    
    try {
      console.log('Initializing NDK');
      
      // Create new NDK instance
      const ndk = new NDK({
        explicitRelayUrls: POWR_EXPLICIT_RELAYS,
        // Other NDK options
        enableOutboxModel: true,
        cacheAdapter: null, // To be replaced with proper caching
        autoConnectUserRelays: false,
        liveQueryReconnectTime: 5000
      });
      
      // Update state
      set({ 
        ndk, 
        initialized: true,
        connectionError: null 
      });
      
      return ndk;
    } catch (error) {
      console.error('NDK initialization error:', error);
      set({ connectionError: error as Error });
      throw error;
    }
  },
  
  // Connect to relays
  connect: async () => {
    // Skip if already connecting or connected
    if (get().connecting || get().connected) return;
    
    // Ensure initialization
    const ndk = get().ndk || await get().initialize();
    
    try {
      // Start connecting
      set({ connecting: true, connectionError: null });
      
      // Connect to relays
      await ndk.connect();
      
      // Update state
      set({ connecting: false, connected: true });
      console.log('NDK connected to relays');
    } catch (error) {
      console.error('NDK connection error:', error);
      set({ 
        connecting: false, 
        connected: false, 
        connectionError: error as Error 
      });
      throw error;
    }
  },
  
  // Disconnect from relays
  disconnect: async () => {
    const { ndk, connected } = get();
    
    if (!ndk || !connected) return;
    
    try {
      // Close connections
      await ndk.pool.close();
      set({ connected: false });
      console.log('NDK disconnected from relays');
    } catch (error) {
      console.error('NDK disconnect error:', error);
    }
  }
}));

// App state change handler for connection management
let appStateSubscription: { remove: () => void } | null = null;

export function initNDK(): Promise<NDK> {
  // Set up app state subscription if not already
  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  }
  
  return useNDKStore.getState().initialize();
}

// Handle app state changes to manage connections
async function handleAppStateChange(nextAppState: AppStateStatus) {
  const store = useNDKStore.getState();
  
  if (nextAppState === 'active') {
    // App came to foreground - connect if not connected
    if (store.initialized && !store.connected && !store.connecting) {
      await store.connect();
    }
  } else if (nextAppState === 'background') {
    // App went to background - consider disconnecting to save resources
    // This is optional as you may want to maintain connections
    // await store.disconnect();
  }
}

// Export the hook for components
export function useNDK() {
  // Custom selector to avoid unnecessary re-renders
  const ndk = useNDKStore(state => state.ndk);
  const initialized = useNDKStore(state => state.initialized);
  const connecting = useNDKStore(state => state.connecting);
  const connected = useNDKStore(state => state.connected);
  const connectionError = useNDKStore(state => state.connectionError);
  
  const connect = useNDKStore(state => state.connect);
  const disconnect = useNDKStore(state => state.disconnect);
  
  return {
    ndk,
    initialized,
    connecting,
    connected,
    connectionError,
    connect,
    disconnect
  };
}

// Cleanup function to be called on app unmount
export function cleanupNDK() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  
  return useNDKStore.getState().disconnect();
}

// Export a direct way to get the NDK instance for services
export async function getNDK(): Promise<NDK> {
  const { ndk, initialized, initialize } = useNDKStore.getState();
  
  if (initialized && ndk) {
    return ndk;
  }
  
  return initialize();
}
```

## Usage in Application

### Application Initialization

The NDK is initialized at app startup in the main App component:

```typescript
// app/_layout.tsx

import { useEffect } from 'react';
import { initNDK, cleanupNDK } from '@/lib/initNDK';

export default function RootLayout() {
  // Initialize NDK on app startup
  useEffect(() => {
    const initializeNDK = async () => {
      try {
        const ndk = await initNDK();
        await ndk.connect();
      } catch (error) {
        console.error('Failed to initialize NDK:', error);
      }
    };
    
    initializeNDK();
    
    // Cleanup on unmount
    return () => {
      cleanupNDK();
    };
  }, []);
  
  return (
    <Stack>
      {/* App content */}
    </Stack>
  );
}
```

### Component Usage

Components use the `useNDK` hook to access the NDK instance:

```typescript
// components/SomeComponent.tsx

import { useEffect, useState } from 'react';
import { useNDK } from '@/lib/initNDK';

export function SomeComponent() {
  const { ndk, initialized, connected, connectionError } = useNDK();
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    if (!ndk || !connected) return;
    
    // Use NDK for queries or subscriptions
    const subscription = ndk.subscribe(
      { kinds: [1], limit: 10 },
      { closeOnEose: false }
    );
    
    subscription.on('event', (event) => {
      setEvents(prev => [...prev, event]);
    });
    
    subscription.start();
    
    return () => {
      subscription.stop();
    };
  }, [ndk, connected]);
  
  if (connectionError) {
    return <Text>Error connecting to relays: {connectionError.message}</Text>;
  }
  
  if (!initialized || !connected) {
    return <Text>Connecting to Nostr network...</Text>;
  }
  
  return (
    <View>
      {/* Component rendering using events */}
    </View>
  );
}
```

### Service Usage

Services can use the direct `getNDK` function to access the NDK instance:

```typescript
// lib/services/SomeService.ts

import { getNDK } from '@/lib/initNDK';
import { NDKEvent } from '@nostr-dev-kit/ndk';

export class SomeService {
  async publishEvent(content: string): Promise<string> {
    try {
      // Get NDK instance
      const ndk = await getNDK();
      
      // Create and publish event
      const event = new NDKEvent(ndk);
      event.kind = 1;
      event.content = content;
      
      // Add tags if needed
      event.tags = [
        ['t', 'powr'],
        ['t', 'workout']
      ];
      
      // Publish to relays
      await event.publish();
      
      return event.id;
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw error;
    }
  }
}
```

## Authentication Integration

The NDK instance works with the authentication system to handle signed events:

```typescript
// Integration with authentication
import { getNDK } from '@/lib/initNDK';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

export async function setupUserAuthentication(privateKey: string): Promise<void> {
  try {
    // Get NDK instance
    const ndk = await getNDK();
    
    // Create signer
    const signer = new NDKPrivateKeySigner(privateKey);
    
    // Set signer to enable event signing
    ndk.signer = signer;
    
    console.log('User authentication set up successfully');
  } catch (error) {
    console.error('Failed to set up user authentication:', error);
    throw error;
  }
}
```

## Performance Considerations

### Connection Management

The implementation handles connection management based on app state to optimize resource usage:

1. **Connections are established** when the app is in the foreground
2. **Connection state is maintained** during brief background periods
3. **Disconnections can be triggered** during extended background periods to save resources

### Caching Strategy

The initialization includes placeholders for caching, which should be implemented to improve performance:

```typescript
// Enhanced initialization with caching
const ndk = new NDK({
  explicitRelayUrls: POWR_EXPLICIT_RELAYS,
  cacheAdapter: new SQLiteAdapter({
    dbName: 'nostr-cache.db',
    tableName: 'events',
    migrationsPath: './migrations'
  })
});
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Initialization failures** are caught and reported
2. **Connection errors** are stored in state for UI feedback
3. **Recovery mechanisms** automatically retry connections when appropriate

## Testing

### Unit Tests

```typescript
describe('NDK Initialization', () => {
  beforeEach(() => {
    // Reset module for each test
    jest.resetModules();
  });
  
  it('should initialize NDK with correct configuration', async () => {
    // Mock NDK constructor
    const mockNDK = jest.fn();
    jest.mock('@nostr-dev-kit/ndk', () => mockNDK);
    
    // Import module
    const { initNDK } = require('../initNDK');
    
    // Call initialization
    await initNDK();
    
    // Verify NDK was constructed with correct options
    expect(mockNDK).toHaveBeenCalledWith(
      expect.objectContaining({
        explicitRelayUrls: expect.any(Array),
        enableOutboxModel: true
      })
    );
  });
  
  it('should maintain singleton instance across multiple calls', async () => {
    // Import module
    const { initNDK, getNDK } = require('../initNDK');
    
    // Call initialization twice
    const instance1 = await initNDK();
    const instance2 = await initNDK();
    
    // Get instance directly
    const instance3 = await getNDK();
    
    // Verify all instances are the same
    expect(instance1).toBe(instance2);
    expect(instance1).toBe(instance3);
  });
});
```

### Integration Tests

```typescript
describe('NDK App Integration', () => {
  it('should handle app state changes correctly', async () => {
    // Import module
    const { initNDK, cleanupNDK } = require('../initNDK');
    
    // Initialize
    const ndk = await initNDK();
    const connectSpy = jest.spyOn(ndk, 'connect');
    const closeSpy = jest.spyOn(ndk.pool, 'close');
    
    // Simulate app going to background
    mockAppState('background');
    
    // Simulate app coming to foreground
    mockAppState('active');
    
    // Verify reconnect attempt
    expect(connectSpy).toHaveBeenCalled();
    
    // Cleanup
    await cleanupNDK();
    
    // Verify disconnect
    expect(closeSpy).toHaveBeenCalled();
  });
});
```

## Future Improvements

1. **Enhanced Caching**
   - Implement robust caching with SQLite for offline capability
   - Add cache invalidation strategies based on event types

2. **Relay Management**
   - Implement dynamic relay selection based on performance
   - Add support for user-configurable relay lists

3. **Authentication Enhancement**
   - Support multiple authentication methods (NIP-07, HTTP signer, etc.)
   - Improve key management security with secure storage

4. **Resource Optimization**
   - Implement smarter background connection management
   - Add connection pooling for high-traffic periods

## Related Documentation

- [NDK Comprehensive Guide](./comprehensive_guide.md) - Detailed guide to NDK usage
- [NDK Subscription Analysis](./subscription_analysis.md) - Subscription patterns and best practices
- [Nostr Exercise NIP](../nostr/exercise_nip.md) - Technical specification for Nostr workout events
- [Offline Queue](../nostr/offline_queue.md) - Offline-first sync queue implementation
