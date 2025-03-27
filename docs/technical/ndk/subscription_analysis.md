# NDK Subscription Analysis

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Nostr Integration, Social Feed, Contact Lists

## Purpose

This document analyzes the NDK subscription system, focusing on best practices for managing subscriptions, contact lists, and related event handling. It provides guidelines for reliable implementation in the POWR app, particularly for social features that depend on these subscription mechanisms.

## NDK Subscription Overview

Subscriptions in NDK provide a mechanism to retrieve and monitor events from Nostr relays. The subscription system is built around the `NDKSubscription` class, which manages connections to relays, event caching, and event emission.

### Key Subscription Concepts

1. **Filters**: Define what events to retrieve (kind, authors, tags, etc.)
2. **Options**: Control subscription behavior (caching, verification, grouping)
3. **Event Handlers**: Process events as they arrive
4. **Cache Integration**: Improve performance and offline capabilities
5. **Relay Management**: Control which relays receive subscription requests

## Subscription Options

NDK offers several configuration options to customize subscription behavior:

```typescript
interface NDKSubscriptionOptions {
    // Whether to close subscription when all relays have sent EOSE
    closeOnEose?: boolean;
    
    // How to use the cache
    cacheUsage?: NDKSubscriptionCacheUsage;
    
    // Whether to skip saving events to cache
    dontSaveToCache?: boolean;
    
    // Group similar subscriptions to reduce relay connections
    groupable?: boolean;
    
    // How long to wait before sending grouped subscriptions
    groupableDelay?: number;
    
    // Verification and validation controls
    skipVerification?: boolean;
    skipValidation?: boolean;
    
    // Cache-specific filtering options
    cacheUnconstrainFilter?: (keyof NDKFilter)[];
}
```

### Cache Usage Modes

- `CACHE_FIRST`: Try cache before hitting relays (default)
- `PARALLEL`: Query both cache and relays simultaneously
- `ONLY_CACHE`: Only use cached data, don't hit relays
- `ONLY_RELAY`: Skip cache entirely, always query relays

## Best Practices for Subscriptions

### 1. Effective Subscription Configuration

```typescript
const subscriptionOptions = {
    closeOnEose: true, // Close when all relays send EOSE
    cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST, // Try cache before hitting relays
    groupable: true, // Allow grouping similar subscriptions
    groupableDelay: 100, // Wait 100ms to group subscriptions
    skipVerification: false, // Verify signatures
    skipValidation: false // Validate event structure
};

const subscription = ndk.subscribe(
    { kinds: [1, 3], // Post and contact list events
      authors: [userPubkey] },
    subscriptionOptions
);
```

### 2. Event Handling

```typescript
subscription.on('event', (event, relay, sub, fromCache, optimisticPublish) => {
    // Process event
    
    // Check if this is from cache
    if (fromCache) {
        // Handle cached event (e.g., for initial UI render)
    } else {
        // Handle live event from relay (e.g., for updates)
    }
});

subscription.on('eose', (sub) => {
    // End of stored events - all historical data has been received
    // Good time to hide loading indicators
});

subscription.on('close', (sub) => {
    // Subscription closed - clean up any resources
});
```

### 3. Subscription Lifecycle Management

```typescript
// Start the subscription
subscription.start();

// When no longer needed
subscription.stop();
```

### 4. Error Handling

```typescript
subscription.on('error', (error, relay) => {
    console.error(`Subscription error from ${relay.url}:`, error);
    // Implement fallback strategy
});

subscription.on('closed', (relay, reason) => {
    console.log(`Relay ${relay.url} closed connection: ${reason}`);
    // Potentially reconnect or use alternative relays
});
```

## Contact List Handling

The `NDKUser` class provides utilities for working with contact lists (kind:3 events).

### Retrieving Contacts

```typescript
// Initialize user
const user = new NDKUser({ pubkey: userPubkey });
user.ndk = ndk;

// Get contacts as NDKUser objects
const follows = await user.follows();

// Get just the pubkeys
const followSet = await user.followSet();
```

### Managing Contacts

```typescript
// Add a new follow
const newFollow = new NDKUser({ pubkey: followPubkey });
await user.follow(newFollow);

// Remove a follow
await user.unfollow(userToUnfollow);

// Batch multiple operations
const currentFollows = await user.follows();
await user.follow(newFollow, currentFollows);
await user.follow(anotherFollow, currentFollows);
```

## Performance Optimization Patterns

### 1. Subscription Grouping

```typescript
// These will be grouped into a single subscription to the relay
// if created within 100ms of each other
const sub1 = ndk.subscribe(
    { kinds: [1], authors: [pubkey1] },
    { groupable: true, groupableDelay: 100 }
);

const sub2 = ndk.subscribe(
    { kinds: [1], authors: [pubkey2] },
    { groupable: true, groupableDelay: 100 }
);
```

### 2. Progressive Loading

```typescript
// Initial UI state from cache
const sub = ndk.subscribe(
    { kinds: [3], authors: [userPubkey] },
    { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
);

// Update as data comes in
sub.on('event', (event, relay, subscription, fromCache) => {
    if (fromCache) {
        // Update UI immediately with cached data
    } else {
        // Refresh UI with the latest data from relays
    }
});
```

### 3. Targeted Subscriptions

Limit the scope of subscriptions to reduce data load:

```typescript
// Use since/until filters to limit time range
const recentSub = ndk.subscribe({
    kinds: [1],
    authors: [userPubkey],
    since: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
});

// Use specific tag filters
const hashtagSub = ndk.subscribe({
    kinds: [1],
    "#t": ["workout", "fitness"]
});
```

## Reliability Implementation

### 1. Contact List Manager Class

```typescript
class ContactListManager {
    private contactList = new Set<string>();
    private subscription;
    private lastUpdated = 0;

    constructor(ndk, userPubkey) {
        this.subscription = ndk.subscribe({
            kinds: [3],
            authors: [userPubkey]
        });

        this.subscription.on('event', this.handleContactListUpdate.bind(this));
    }

    private handleContactListUpdate(event) {
        // Only update if this is a newer event
        if (event.created_at > this.lastUpdated) {
            this.contactList = new Set(
                event.tags
                    .filter(tag => tag[0] === 'p')
                    .map(tag => tag[1])
            );
            this.lastUpdated = event.created_at;
        }
    }

    getContacts() {
        return this.contactList;
    }

    cleanup() {
        this.subscription.stop();
    }
}
```

### 2. Implementing Retry Logic

```typescript
async function fetchContactListWithRetry(attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try {
            const user = new NDKUser({ pubkey: userPubkey });
            user.ndk = ndk;
            return await user.followSet();
        } catch (e) {
            if (i === attempts - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}
```

### 3. Custom Cache Implementation

For optimal performance, implement a custom cache adapter:

```typescript
const cacheAdapter = {
    async query(subscription) {
        // Return cached events matching subscription filters
        const results = await db.query(
            'SELECT * FROM events WHERE...',
            // Convert subscription filters to query
        );
        return results.map(row => new NDKEvent(ndk, JSON.parse(row.event)));
    },
    
    async setEvent(event, filters, relay) {
        // Store event in cache
        await db.run(
            'INSERT OR REPLACE INTO events VALUES...',
            [event.id, JSON.stringify(event), /* other fields */]
        );
    }
};

ndk.cacheAdapter = cacheAdapter;
```

## Application to POWR Social Features

### Social Feed Implementation

```typescript
function initializeSocialFeed() {
    // Following feed
    const followingFeed = ndk.subscribe({
        kinds: [1, 6], // Posts and reposts
        "#p": Array.from(contactList) // People the user follows
    }, {
        closeOnEose: false, // Keep subscription open for updates
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
    });
    
    followingFeed.on('event', (event) => {
        // Process feed events
        updateFeedUI(event);
    });
    
    // Global feed (limited to recent events)
    const globalFeed = ndk.subscribe({
        kinds: [1, 6],
        since: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
    });
    
    globalFeed.on('event', (event) => {
        // Process global feed events
        updateGlobalFeedUI(event);
    });
}
```

### Workout Sharing & Discovery

```typescript
function initializeWorkoutFeed() {
    // Workout-specific feed
    const workoutFeed = ndk.subscribe({
        kinds: [1301], // Workout records (from NIP-4e)
        "#t": ["workout", "fitness"] // Relevant hashtags
    });
    
    workoutFeed.on('event', (event) => {
        // Process workout events
        updateWorkoutFeedUI(event);
    });
}
```

## Conclusion

The NDK subscription system provides a powerful foundation for Nostr data management. By following these best practices, the POWR app can implement reliable, efficient data flows for social features, contact lists, and other Nostr-based functionality.

Key recommendations:
1. Use proper subscription options for each use case
2. Implement effective caching strategies
3. Handle subscription lifecycle properly
4. Use the `NDKUser` class for contact list operations
5. Group similar subscriptions where possible
6. Implement robust error handling and retry logic

## Related Documentation

- [NDK Comprehensive Guide](./comprehensive_guide.md) - Complete guide to NDK functionality
- [Nostr Exercise NIP](../nostr/exercise_nip.md) - Specification for workout events
- [Social Architecture](../../features/social/architecture.md) - Overall social feature architecture
