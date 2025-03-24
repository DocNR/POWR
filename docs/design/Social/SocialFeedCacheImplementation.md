# Social Feed Cache Implementation

## Overview

This document outlines the implementation of the Social Feed Cache system in the POWR app. The cache system is designed to provide offline access to social feed data, reduce network usage, and improve performance.

## Key Components

1. **SocialFeedCache**: The main service that handles caching of social feed events
2. **EventCache**: A service for caching individual Nostr events
3. **useSocialFeed**: A hook that provides access to the social feed data
4. **RelayInitializer**: A component that initializes the cache system

## Implementation Details

### Write Buffer System

The SocialFeedCache uses a write buffer system to batch database operations and reduce transaction conflicts. This approach is inspired by the Olas NDK Mobile implementation.

```typescript
private writeBuffer: { query: string; params: any[] }[] = [];
private bufferFlushTimer: NodeJS.Timeout | null = null;
private bufferFlushTimeout: number = 100; // milliseconds
private processingTransaction: boolean = false;

private bufferWrite(query: string, params: any[]) {
  this.writeBuffer.push({ query, params });
  
  if (!this.bufferFlushTimer) {
    this.bufferFlushTimer = setTimeout(() => this.flushWriteBuffer(), this.bufferFlushTimeout);
  }
}

private async flushWriteBuffer() {
  if (this.writeBuffer.length === 0 || this.processingTransaction) return;
  
  const bufferCopy = [...this.writeBuffer];
  this.writeBuffer = [];
  
  this.processingTransaction = true;
  
  try {
    await this.db.withTransactionAsync(async () => {
      for (const { query, params } of bufferCopy) {
        await this.db.runAsync(query, params);
      }
    });
  } catch (error) {
    console.error('[SocialFeedCache] Error flushing write buffer:', error);
    // If there was an error, add the operations back to the buffer
    for (const op of bufferCopy) {
      if (!this.writeBuffer.some(item => 
        item.query === op.query && 
        JSON.stringify(item.params) === JSON.stringify(op.params)
      )) {
        this.writeBuffer.push(op);
      }
    }
  } finally {
    this.processingTransaction = false;
  }
  
  this.bufferFlushTimer = null;
  
  // If there are more operations, start a new timer
  if (this.writeBuffer.length > 0) {
    this.bufferFlushTimer = setTimeout(() => this.flushWriteBuffer(), this.bufferFlushTimeout);
  }
}
```

### In-Memory Tracking with LRU Cache

To prevent redundant database operations, the SocialFeedCache uses an LRU (Least Recently Used) cache to track known events:

```typescript
private knownEventIds: LRUCache<string, number>; // Event ID -> timestamp

constructor(database: SQLiteDatabase) {
  this.db = new DbService(database);
  this.eventCache = new EventCache(database);
  
  // Initialize LRU cache for known events (limit to 1000 entries)
  this.knownEventIds = new LRUCache<string, number>({ maxSize: 1000 });
  
  // Ensure feed_cache table exists
  this.initializeTable();
}
```

### Debounced Subscriptions

The `useSocialFeed` hook implements debouncing to prevent rapid resubscriptions:

```typescript
// Subscription cooldown to prevent rapid resubscriptions
const subscriptionCooldown = useRef<NodeJS.Timeout | null>(null);
const cooldownPeriod = 2000; // 2 seconds
const subscriptionAttempts = useRef(0);
const maxSubscriptionAttempts = 3;

// In loadFeed function:
// Prevent rapid resubscriptions
if (subscriptionCooldown.current) {
  console.log('[useSocialFeed] Subscription on cooldown, skipping');
  return;
}

// Track subscription attempts to prevent infinite loops
subscriptionAttempts.current += 1;
if (subscriptionAttempts.current > maxSubscriptionAttempts) {
  console.error(`[useSocialFeed] Too many subscription attempts (${subscriptionAttempts.current}), giving up`);
  setLoading(false);
  return;
}

// Set a cooldown to prevent rapid resubscriptions
subscriptionCooldown.current = setTimeout(() => {
  subscriptionCooldown.current = null;
  // Reset attempt counter after cooldown period
  subscriptionAttempts.current = 0;
}, cooldownPeriod);
```

### Proper Initialization

The RelayInitializer component ensures that the SocialFeedCache is properly initialized with the NDK instance:

```typescript
// Initialize ProfileImageCache and SocialFeedCache with NDK instance
useEffect(() => {
  if (ndk) {
    console.log('[RelayInitializer] Setting NDK instance in ProfileImageCache');
    profileImageCache.setNDK(ndk);
    
    // Initialize SocialFeedCache with NDK instance
    if (db) {
      try {
        const socialFeedCache = getSocialFeedCache(db);
        socialFeedCache.setNDK(ndk);
        console.log('[RelayInitializer] SocialFeedCache initialized with NDK');
      } catch (error) {
        console.error('[RelayInitializer] Error initializing SocialFeedCache:', error);
      }
    }
  }
}, [ndk, db]);
```

## Benefits

1. **Reduced Transaction Conflicts**: The write buffer system prevents transaction conflicts by batching operations.
2. **Improved Performance**: The LRU cache reduces redundant database operations.
3. **Better Error Handling**: The system includes robust error handling to prevent cascading failures.
4. **Offline Support**: The cache system provides offline access to social feed data.
5. **Reduced Network Usage**: The system reduces network usage by caching events locally.

## Debugging

The Following screen includes debug information to help troubleshoot issues:

```typescript
// Debug controls component - memoized
const DebugControls = useCallback(() => (
  <View className="bg-gray-100 p-4 rounded-lg mx-4 mb-4">
    <Text className="font-bold mb-2">Debug Info:</Text>
    <Text>User: {currentUser?.pubkey?.substring(0, 8)}...</Text>
    <Text>Feed Items: {entries.length}</Text>
    <Text>Loading: {loading ? "Yes" : "No"}</Text>
    <Text>Offline: {isOffline ? "Yes" : "No"}</Text>
    <Text>Contacts: {contacts.length}</Text>
    <Text>Loading Contacts: {isLoadingContacts ? "Yes" : "No"}</Text>
    
    <View className="flex-row mt-4 justify-between">
      <TouchableOpacity 
        className="bg-blue-500 p-2 rounded flex-1 mr-2"
        onPress={checkRelayConnections}
      >
        <Text className="text-white text-center">Check Relays</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        className="bg-green-500 p-2 rounded flex-1"
        onPress={handleRefresh}
      >
        <Text className="text-white text-center">Force Refresh</Text>
      </TouchableOpacity>
    </View>
  </View>
), [currentUser?.pubkey, entries.length, loading, isOffline, contacts.length, isLoadingContacts, checkRelayConnections, handleRefresh]);
```

## Future Improvements

1. **Automatic Cache Cleanup**: Implement automatic cleanup of old cached events.
2. **Cache Synchronization**: Implement synchronization between the cache and the server.
3. **Cache Compression**: Implement compression of cached data to reduce storage usage.
4. **Cache Encryption**: Implement encryption of cached data to improve security.
5. **Cache Analytics**: Implement analytics to track cache usage and performance.
