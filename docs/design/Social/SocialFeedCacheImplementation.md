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

### Global Transaction Lock Mechanism

To prevent transaction conflicts between different services (such as SocialFeedCache and ContactCacheService), we've implemented a global transaction lock mechanism in the SocialFeedCache class:

```typescript
// Global transaction lock to prevent transaction conflicts across services
private static transactionLock: boolean = false;
private static transactionQueue: (() => Promise<void>)[] = [];
private static processingQueue: boolean = false;

/**
 * Acquire the global transaction lock
 * @returns True if lock was acquired, false otherwise
 */
private static acquireTransactionLock(): boolean {
  if (SocialFeedCache.transactionLock) {
    return false;
  }
  SocialFeedCache.transactionLock = true;
  return true;
}

/**
 * Release the global transaction lock
 */
private static releaseTransactionLock(): void {
  SocialFeedCache.transactionLock = false;
  // Process the next transaction in queue if any
  if (SocialFeedCache.transactionQueue.length > 0 && !SocialFeedCache.processingQueue) {
    SocialFeedCache.processTransactionQueue();
  }
}

/**
 * Add a transaction to the queue
 * @param transaction Function that performs the transaction
 */
private static enqueueTransaction(transaction: () => Promise<void>): void {
  SocialFeedCache.transactionQueue.push(transaction);
  // Start processing the queue if not already processing
  if (!SocialFeedCache.processingQueue) {
    SocialFeedCache.processTransactionQueue();
  }
}

/**
 * Process the transaction queue
 */
private static async processTransactionQueue(): Promise<void> {
  if (SocialFeedCache.processingQueue || SocialFeedCache.transactionQueue.length === 0) {
    return;
  }
  
  SocialFeedCache.processingQueue = true;
  
  try {
    while (SocialFeedCache.transactionQueue.length > 0) {
      // Wait until we can acquire the lock
      if (!SocialFeedCache.acquireTransactionLock()) {
        // If we can't acquire the lock, wait and try again
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // Get the next transaction
      const transaction = SocialFeedCache.transactionQueue.shift();
      if (!transaction) {
        SocialFeedCache.releaseTransactionLock();
        continue;
      }
      
      try {
        // Execute the transaction
        await transaction();
      } catch (error) {
        console.error('[SocialFeedCache] Error executing queued transaction:', error);
      } finally {
        // Release the lock
        SocialFeedCache.releaseTransactionLock();
      }
    }
  } finally {
    SocialFeedCache.processingQueue = false;
  }
}

/**
 * Execute a transaction with the global lock
 * @param transaction Function that performs the transaction
 */
public static async executeWithLock(transaction: () => Promise<void>): Promise<void> {
  // Add the transaction to the queue
  SocialFeedCache.enqueueTransaction(transaction);
}
```

This mechanism ensures that only one transaction is active at any given time, preventing the "cannot start a transaction within a transaction" error that can occur when two services try to start transactions simultaneously.

The `executeWithLock` method can be used by other services to coordinate their database transactions with SocialFeedCache:

```typescript
// Example usage in ContactCacheService
async cacheContacts(ownerPubkey: string, contacts: string[]): Promise<void> {
  if (!ownerPubkey || !contacts.length) return;
  
  try {
    // Use the global transaction lock to prevent conflicts with other services
    await SocialFeedCache.executeWithLock(async () => {
      try {
        // Use a transaction for better performance
        await this.db.withTransactionAsync(async () => {
          // Database operations...
        });
      } catch (error) {
        console.error('[ContactCacheService] Error in transaction:', error);
        throw error; // Rethrow to ensure the transaction is marked as failed
      }
    });
  } catch (error) {
    console.error('[ContactCacheService] Error caching contacts:', error);
  }
}
```

### Enhanced Write Buffer System

The write buffer system has been enhanced with exponential backoff and improved error handling:

```typescript
private async flushWriteBuffer() {
  if (this.writeBuffer.length === 0 || this.processingTransaction) return;
  
  // Check if database is available
  if (!this.isDbAvailable()) {
    console.log('[SocialFeedCache] Database not available, delaying flush');
    this.scheduleNextFlush(true); // Schedule with backoff
    return;
  }
  
  // Take only a batch of operations to process at once
  const bufferCopy = [...this.writeBuffer].slice(0, this.maxBatchSize);
  this.writeBuffer = this.writeBuffer.slice(bufferCopy.length);
  
  this.processingTransaction = true;
  
  // Use the transaction lock to prevent conflicts
  try {
    // Check if we've exceeded the maximum retry count
    if (this.retryCount > this.maxRetryCount) {
      console.warn(`[SocialFeedCache] Exceeded maximum retry count (${this.maxRetryCount}), dropping ${bufferCopy.length} operations`);
      // Reset retry count but don't retry these operations
      this.retryCount = 0;
      this.processingTransaction = false;
      this.scheduleNextFlush();
      return;
    }
    
    // Increment retry count before attempting transaction
    this.retryCount++;
    
    // Execute the transaction with the global lock
    await SocialFeedCache.executeWithLock(async () => {
      try {
        // Execute the transaction
        await this.db.withTransactionAsync(async () => {
          for (const { query, params } of bufferCopy) {
            try {
              await this.db.runAsync(query, params);
            } catch (innerError) {
              // Log individual query errors but continue with other queries
              console.error(`[SocialFeedCache] Error executing query: ${query}`, innerError);
              // Don't rethrow to allow other queries to proceed
            }
          }
        });
        
        // Success - reset retry count
        this.retryCount = 0;
        this.dbAvailable = true; // Mark database as available
      } catch (error) {
        console.error('[SocialFeedCache] Error in transaction:', error);
        
        // Check for database connection errors
        if (error instanceof Error && 
            (error.message.includes('closed resource') || 
            error.message.includes('Database not available'))) {
          // Mark database as unavailable
          this.dbAvailable = false;
          console.warn('[SocialFeedCache] Database connection issue detected, marking as unavailable');
          
          // Add all operations back to the buffer
          this.writeBuffer = [...bufferCopy, ...this.writeBuffer];
        } else {
          // For other errors, add operations back to the buffer
          // but only if they're not already there (avoid duplicates)
          for (const op of bufferCopy) {
            if (!this.writeBuffer.some(item => 
              item.query === op.query && 
              JSON.stringify(item.params) === JSON.stringify(op.params)
            )) {
              // Add back to the beginning of the buffer to retry sooner
              this.writeBuffer.unshift(op);
            }
          }
        }
        
        // Rethrow to ensure the transaction is marked as failed
        throw error;
      }
    });
  } catch (error) {
    console.error('[SocialFeedCache] Error flushing write buffer:', error);
  } finally {
    this.processingTransaction = false;
    this.scheduleNextFlush();
  }
}

/**
 * Schedule the next buffer flush with optional backoff
 */
private scheduleNextFlush(withBackoff: boolean = false) {
  if (this.bufferFlushTimer) {
    clearTimeout(this.bufferFlushTimer);
    this.bufferFlushTimer = null;
  }
  
  if (this.writeBuffer.length > 0) {
    let delay = this.bufferFlushTimeout;
    
    if (withBackoff) {
      // Use exponential backoff based on retry count
      delay = Math.min(
        this.bufferFlushTimeout * Math.pow(2, this.retryCount),
        this.maxBackoffTime
      );
    }
    
    console.log(`[SocialFeedCache] Scheduling next flush in ${delay}ms (retry: ${this.retryCount})`);
    this.bufferFlushTimer = setTimeout(() => this.flushWriteBuffer(), delay);
  }
}
```

## Benefits

1. **Eliminated Transaction Conflicts**: The global transaction lock mechanism prevents transaction conflicts between different services.
2. **Improved Reliability**: The transaction queue ensures that all transactions are processed even if they can't be executed immediately.
3. **Enhanced Error Recovery**: The exponential backoff and retry mechanism improves recovery from temporary database errors.
4. **Better Offline Stability**: The system handles database unavailability gracefully, enabling seamless offline operation.
5. **Reduced Database Contention**: Coordinated transactions reduce contention on the database.
6. **Improved Performance**: The LRU cache reduces redundant database operations.
7. **Better Error Handling**: The system includes robust error handling to prevent cascading failures.
8. **Offline Support**: The cache system provides offline access to social feed data.
9. **Reduced Network Usage**: The system reduces network usage by caching events locally.

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
