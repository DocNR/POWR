# NDK Comprehensive Guide

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Nostr Integration, Social Features, State Management

## Purpose

This document provides a comprehensive guide to using the Nostr Development Kit (NDK) in the POWR app. It serves as the primary reference for implementing Nostr features, covering core concepts, state management patterns, subscription lifecycles, and mobile-specific considerations. This guide is specifically tailored for the MVP implementation, focusing on simplified social features while establishing a solid foundation for future enhancements.


**UPDATED FOR MVP: This guide has been consolidated and aligned with our simplified social approach for the MVP release.**

This guide combines key information from our various NDK analysis documents and the ndk-mobile package to provide a comprehensive reference for implementing Nostr features in POWR app. It's organized to support our MVP strategy with a focus on the core NDK capabilities we need.

## Table of Contents

1. [NDK Core Concepts](#ndk-core-concepts)
2. [Proper State Management](#proper-state-management)
3. [Subscription Lifecycle](#subscription-lifecycle)
4. [NIP-19 and Encoding/Decoding](#nip-19-and-encodingdecoding)
5. [Context Provider Pattern](#context-provider-pattern)
6. [Mobile-Specific Considerations](#mobile-specific-considerations)
7. [Best Practices for POWR MVP](#best-practices-for-powr-mvp)

## NDK Core Concepts

NDK (Nostr Development Kit) provides a set of tools for working with the Nostr protocol. Key components include:

- **NDK Instance**: Central object for interacting with the Nostr network
- **NDKEvent**: Represents a Nostr event
- **NDKUser**: Represents a user (pubkey)
- **NDKFilter**: Defines criteria for querying events
- **NDKSubscription**: Manages subscriptions to event streams
- **NDKRelay**: Represents a connection to a relay

### Basic Setup

```typescript
import NDK from '@nostr-dev-kit/ndk';

// Initialize NDK with relays
const ndk = new NDK({
  explicitRelayUrls: [
    'wss://relay.damus.io',
    'wss://relay.nostr.band'
  ]
});

// Connect to relays
await ndk.connect();
```

## Proper State Management

The ndk-mobile library emphasizes proper state management using Zustand. This approach is critical for avoiding the issues we've been seeing in our application.

### Zustand Store Pattern

```typescript
// Create a singleton store using Zustand
import { create } from 'zustand';

// Private store instance - not exported
let store: ReturnType<typeof createNDKStore> | undefined;

// Store creator function
const createNDKStore = () => create<NDKState>((set) => ({
  ndk: undefined,
  initialized: false,
  connecting: false,
  connectionError: null,
  
  initialize: (config) => set((state) => {
    if (state.initialized) return state;
    
    const ndk = new NDK(config);
    return { ndk, initialized: true };
  }),
  
  connect: async () => {
    set({ connecting: true, connectionError: null });
    try {
      const ndk = store?.getState().ndk;
      if (!ndk) throw new Error("NDK not initialized");
      
      await ndk.connect();
      set({ connecting: false });
    } catch (error) {
      set({ connecting: false, connectionError: error });
    }
  }
}));

// Getter for the singleton store
export const getNDKStore = () => {
  if (!store) {
    store = createNDKStore();
  }
  return store;
};

// Hook for components to use
export const useNDKStore = <T>(selector: (state: NDKState) => T) => {
  // Ensure the store exists
  getNDKStore();
  // Return the selected state
  return useStore(store)(selector);
};
```

### Critical State Management Points

1. **Single Store Instance**: Always use a singleton pattern for NDK stores
2. **Lazy Initialization**: Only create the store when first accessed
3. **Proper Selectors**: Select only what you need from the store
4. **Clear State Transitions**: Define explicit state transitions (connecting, connected, error)

## Subscription Lifecycle

Proper subscription management is crucial for app stability and performance. The subscribe.ts file in ndk-mobile provides advanced subscription handling.

### Basic Subscription Pattern

```typescript
import { useEffect } from 'react';
import { useNDK } from './hooks/useNDK';

function EventComponent({ filter }) {
  const { ndk } = useNDK();
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    if (!ndk) return;
    
    // Create subscription
    const sub = ndk.subscribe(filter, {
      closeOnEose: false,  // Keep connection open
    });
    
    // Handle incoming events
    sub.on('event', (event) => {
      setEvents(prev => [...prev, event]);
    });
    
    // Start subscription
    sub.start();
    
    // Critical: Clean up subscription when component unmounts
    return () => {
      sub.stop();
    };
  }, [ndk, JSON.stringify(filter)]);
  
  return (/* render events */);
}
```

### Enhanced Subscription Hook

The ndk-mobile package includes an enhanced useSubscribe hook with additional features:

```typescript
// Example based on ndk-mobile implementation
function useEnhancedSubscribe(filter, options = {}) {
  const { ndk } = useNDK();
  const [events, setEvents] = useState([]);
  const [eose, setEose] = useState(false);
  const subRef = useRef(null);
  
  useEffect(() => {
    if (!ndk) return;
    
    // Create subscription
    const sub = ndk.subscribe(filter, {
      closeOnEose: options.closeOnEose || false,
      wrap: options.wrap || false
    });
    
    subRef.current = sub;
    
    // Handle incoming events
    sub.on('event', (event) => {
      // Process events (filtering, wrapping, etc.)
      
      // Add to state
      setEvents(prev => {
        // Check for duplicates using event.id
        if (prev.some(e => e.id === event.id)) return prev;
        return [...prev, event];
      });
    });
    
    // Handle end of stored events
    sub.on('eose', () => {
      setEose(true);
    });
    
    // Start subscription
    sub.start();
    
    // Clean up
    return () => {
      if (subRef.current) {
        subRef.current.stop();
      }
    };
  }, [ndk, JSON.stringify(filter), options]);
  
  return { events, eose };
}
```

## NIP-19 and Encoding/Decoding

NIP-19 functions are essential for handling Nostr identifiers like npub, note, and naddr.

### Decoding NIP-19 Entities

```typescript
import { nip19 } from '@nostr-dev-kit/ndk';

// Decode any NIP-19 entity (naddr, npub, nsec, note, etc.)
function decodeNIP19(encoded: string) {
  try {
    const decoded = nip19.decode(encoded);
    // decoded.type will be 'npub', 'note', 'naddr', etc.
    // decoded.data will contain the data specific to that type
    return decoded;
  } catch (error) {
    console.error('Invalid NIP-19 format:', error);
    return null;
  }
}

// Convert npub to hex pubkey
function npubToHex(npub: string) {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === 'npub') {
      return decoded.data as string; // This is the hex pubkey
    }
    return null;
  } catch (error) {
    console.error('Invalid npub format:', error);
    return null;
  }
}
```

### Encoding to NIP-19 Formats

```typescript
// Create an npub from a hex public key
function hexToNpub(hexPubkey: string) {
  return nip19.npubEncode(hexPubkey);
}

// Create a note (event reference) from event ID
function eventIdToNote(eventId: string) {
  return nip19.noteEncode(eventId);
}

// Create an naddr for addressable events
function createNaddr(pubkey: string, kind: number, identifier: string) {
  return nip19.naddrEncode({
    pubkey,  // Hex pubkey
    kind,    // Event kind (number)
    identifier // The 'd' tag value
  });
}
```

## Context Provider Pattern

The ndk-mobile package emphasizes the Context Provider pattern for proper NDK integration:

```typescript
import { NDKProvider } from '@nostr-dev-kit/ndk-mobile';
import App from './App';

// Root component
export default function Root() {
  return (
    <NDKProvider
      params={{
        explicitRelayUrls: [
          'wss://relay.damus.io',
          'wss://relay.nostr.band'
        ]
      }}
    >
      <App />
    </NDKProvider>
  );
}
```

This pattern ensures:

1. **Single NDK Instance**: The entire app shares one NDK instance
2. **Consistent State**: Auth state and relay connections are managed in one place
3. **Hooks Availability**: All NDK hooks (useNDK, useSubscribe, etc.) work correctly
4. **Proper Cleanup**: Connections and subscriptions are managed appropriately

## Mobile-Specific Considerations

The ndk-mobile package includes several mobile-specific optimizations:

### Caching Strategy

Mobile devices need efficient caching to reduce network usage and improve performance:

```typescript
import { SQLiteAdapter } from '@nostr-dev-kit/ndk-mobile/cache-adapter/sqlite';

// Initialize NDK with SQLite caching
const ndk = new NDK({
  explicitRelayUrls: [...],
  cacheAdapter: new SQLiteAdapter({
    dbName: 'nostr-cache.db'
  })
});
```

### Mobile Signers

For secure key management on mobile devices:

```typescript
import { SecureStorageSigner } from '@nostr-dev-kit/ndk-mobile/signers/securestorage';

// Use secure storage for private keys
const signer = new SecureStorageSigner({
  storageKey: 'nostr-private-key'
});

// Add to NDK
ndk.signer = signer;
```

## Best Practices for POWR MVP

Based on our analysis and the ndk-mobile implementation, here are key best practices for our MVP:

### 1. State Management

- **Use singleton stores** for NDK and session state
- **Implement proper state machine** for auth transitions with Zustand
- **Add event listeners/callbacks** for components to respond to auth changes

```typescript
// Authentication state using Zustand (aligned with ndk-mobile patterns)
export const useAuthStore = create((set) => ({
  state: 'unauthenticated', // 'unauthenticated', 'authenticating', 'authenticated', 'deauthenticating'
  user: null,
  error: null,
  
  startAuthentication: async (npub) => {
    set({ state: 'authenticating', error: null });
    try {
      // Authentication logic here
      const user = await authenticateUser(npub);
      set({ state: 'authenticated', user });
    } catch (error) {
      set({ state: 'unauthenticated', error });
    }
  },
  
  logout: async () => {
    set({ state: 'deauthenticating' });
    // Cleanup logic
    set({ state: 'unauthenticated', user: null });
  },
}));
```

### 2. Subscription Management

- **Always clean up subscriptions** when components unmount
- **Keep subscription references** in useRef to ensure proper cleanup
- **Use appropriate cache strategies** to reduce relay load
- **Implement proper error handling** for subscription failures

```typescript
// Example component with proper subscription management
function WorkoutShareComponent({ workoutId }) {
  const { ndk } = useNDK();
  const [relatedPosts, setRelatedPosts] = useState([]);
  const subRef = useRef(null);
  
  useEffect(() => {
    if (!ndk) return;
    
    // Create subscription for posts mentioning this workout
    const sub = ndk.subscribe({
      kinds: [1],
      '#e': [workoutId]
    }, {
      closeOnEose: true,
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
    });
    
    subRef.current = sub;
    
    // Handle events
    sub.on('event', (event) => {
      setRelatedPosts(prev => [...prev, event]);
    });
    
    // Start subscription
    sub.start();
    
    // Clean up on unmount
    return () => {
      if (subRef.current) {
        subRef.current.stop();
      }
    };
  }, [ndk, workoutId]);
  
  // Component JSX
}
```

### 3. Simplified Social Features

For the MVP, we're focusing on:

- **Workout sharing**: Publishing kind 1301 workout records and kind 1 notes quoting them
- **Official feed**: Display only POWR official account posts in the social tab
- **Static content**: Prefer static content over complex real-time feeds

```typescript
// Example function to share a workout
async function shareWorkout(ndk, workout, caption) {
  // First, publish the workout record (kind 1301)
  const workoutEvent = new NDKEvent(ndk);
  workoutEvent.kind = 1301;
  workoutEvent.content = JSON.stringify(workout);
  // Add appropriate tags
  workoutEvent.tags = [
    ['d', workout.id],
    ['title', workout.title],
    ['duration', workout.duration.toString()]
  ];
  
  // Publish workout record
  const workoutPub = await workoutEvent.publish();
  
  // Then create a kind 1 note quoting the workout
  const noteEvent = new NDKEvent(ndk);
  noteEvent.kind = 1;
  noteEvent.content = caption || `Just completed ${workout.title}!`;
  // Add e tag to reference the workout event
  noteEvent.tags = [
    ['e', workoutEvent.id, '', 'quote']
  ];
  
  // Publish social note
  await noteEvent.publish();
  
  return { workoutEvent, noteEvent };
}
```

### 4. Error Handling & Offline Support

- **Implement graceful fallbacks** for network errors
- **Store pending publish operations** for later retry
- **Use SQLite caching** for offline access to previously loaded data

```typescript
// Publication queue service example (aligned with mobile patterns)
class PublicationQueue {
  async queueForPublication(event) {
    try {
      // Try immediate publication
      await event.publish();
      return true;
    } catch (error) {
      // Store for later retry
      await this.storeEventForLater(event);
      return false;
    }
  }
  
  async publishPendingEvents() {
    const pendingEvents = await this.getPendingEvents();
    for (const event of pendingEvents) {
      try {
        await event.publish();
        await this.markAsPublished(event);
      } catch (error) {
        // Keep in queue for next retry
        console.error("Failed to publish:", error);
      }
    }
  }
}
```

### 5. Provider Pattern

- **Use NDKProvider** to wrap the application
- **Configure NDK once** at the app root level
- **Access NDK via hooks** rather than creating instances

```typescript
// App.tsx
export default function App() {
  return (
    <NDKProvider
      params={{
        explicitRelayUrls: [
          'wss://relay.damus.io',
          'wss://relay.nostr.band'
        ]
      }}
    >
      <YourAppComponents />
    </NDKProvider>
  );
}

// Using NDK in components
function SomeComponent() {
  const { ndk } = useNDK();
  
  // Use ndk here
  
  return (/* component JSX */);
}
```

### 6. MVP Implementation Focus

For the MVP, focus on implementing:

1. **Core Authentication**: Proper login/logout with state management
2. **Workout Sharing**: Publication of workouts to Nostr
3. **Limited Social Features**: Static feed of official POWR account
4. **User Profile**: Basic user information display

Defer these for post-MVP:
1. Full social feed implementation
2. Real-time following/interaction
3. Complex subscription patterns

By following these best practices, we can create a stable foundation for the POWR app's MVP release that addresses the current architectural issues while providing a simplified but functional social experience.


## Related Documentation

- [Nostr Exercise NIP](../nostr/exercise_nip.md) - Technical specification for Nostr workout events
- [Social Architecture](../../features/social/architecture.md) - Social integration architecture
- [Publication Queue Service](../nostr/offline_queue.md) - Offline-first sync queue implementation
- [Project MVP and Targeted Rebuild](../../project/mvp_and_rebuild.md) - Overall project roadmap and priorities
- [NDK Initialization](./initialization.md) - Current implementation of NDK initialization
- [NDK Subscription Analysis](./subscription_analysis.md) - In-depth analysis of NDK subscription patterns
