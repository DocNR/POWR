// lib/db/services/SocialFeedCache.ts
import { SQLiteDatabase } from 'expo-sqlite';
import NDK, { NDKEvent, NDKFilter, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk-mobile';
import { EventCache } from './EventCache';
import { DbService } from '../db-service';
import { POWR_EVENT_KINDS } from '@/types/nostr-workout';
import { FeedItem } from '@/lib/hooks/useSocialFeed';
import { LRUCache } from 'typescript-lru-cache';

/**
 * Service for caching social feed events
 * This service provides offline access to social feed data
 */
export class SocialFeedCache {
  private db: DbService;
  private eventCache: EventCache;
  private ndk: NDK | null = null;
  
  // Write buffer for database operations
  private writeBuffer: { query: string; params: any[] }[] = [];
  private bufferFlushTimer: NodeJS.Timeout | null = null;
  private bufferFlushTimeout: number = 100; // milliseconds
  private processingTransaction: boolean = false;
  private retryCount: number = 0;
  private maxRetryCount: number = 5;
  private maxBackoffTime: number = 30000; // 30 seconds max backoff
  private maxBatchSize: number = 20; // Maximum operations per batch
  private dbAvailable: boolean = true; // Track database availability
  
  // Global transaction lock to prevent transaction conflicts across services
  private static transactionLock: boolean = false;
  private static transactionQueue: (() => Promise<void>)[] = [];
  private static processingQueue: boolean = false;
  
  // LRU cache for tracking known events
  private knownEventIds: LRUCache<string, number>; // Event ID -> timestamp

  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
    this.eventCache = new EventCache(database);
    
    // Initialize LRU cache for known events (limit to 1000 entries)
    this.knownEventIds = new LRUCache<string, number>({ maxSize: 1000 });
    
    // Ensure feed_cache table exists
    this.initializeTable();
  }
  
  /**
   * Set the NDK instance
   * @param ndk NDK instance
   */
  setNDK(ndk: NDK) {
    this.ndk = ndk;
  }
  
  /**
   * Add a database operation to the write buffer
   * @param query SQL query
   * @param params Query parameters
   */
  private bufferWrite(query: string, params: any[]) {
    // Limit buffer size to prevent memory issues
    if (this.writeBuffer.length >= 1000) {
      console.warn('[SocialFeedCache] Write buffer is full, dropping oldest operation');
      this.writeBuffer.shift(); // Remove oldest operation
    }
    
    this.writeBuffer.push({ query, params });
    
    if (!this.bufferFlushTimer) {
      this.bufferFlushTimer = setTimeout(() => this.flushWriteBuffer(), this.bufferFlushTimeout);
    }
  }

  /**
   * Check if the database is available
   * @returns True if the database is available
   */
  private isDbAvailable(): boolean {
    return this.dbAvailable && !!this.db;
  }

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
  
  /**
   * Flush the write buffer, executing queued operations in a transaction
   */
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
  
  /**
   * Initialize the feed cache table
   */
  private async initializeTable(): Promise<void> {
    try {
      // Create feed_cache table if it doesn't exist
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS feed_cache (
          event_id TEXT NOT NULL,
          feed_type TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          cached_at INTEGER NOT NULL,
          PRIMARY KEY (event_id, feed_type)
        )
      `);
      
      // Create index for faster queries
      await this.db.runAsync(`
        CREATE INDEX IF NOT EXISTS idx_feed_cache_type_time 
        ON feed_cache (feed_type, created_at DESC)
      `);
      
      console.log('[SocialFeedCache] Feed cache table initialized');
    } catch (error) {
      console.error('[SocialFeedCache] Error initializing table:', error);
    }
  }
  
  /**
   * Cache a feed event
   * @param event NDK event to cache
   * @param feedType Type of feed (following, powr, global)
   */
  async cacheEvent(event: NDKEvent, feedType: string): Promise<void> {
    if (!event.id || !event.created_at) return;
    
    try {
      // Skip if we've already seen this event with a newer or equal timestamp
      const existingTimestamp = this.knownEventIds.get(event.id);
      if (existingTimestamp && existingTimestamp >= event.created_at) {
        return;
      }
      
      // Update our in-memory cache
      this.knownEventIds.set(event.id, event.created_at);
      
      // Check if event already exists in the event cache
      const existingEvent = await this.eventCache.getEvent(event.id);
      
      // If the event doesn't exist in cache, we'll add it
      if (!existingEvent) {
        // Buffer the event insert
        const eventData = {
          id: event.id,
          pubkey: event.pubkey || '',
          kind: event.kind || 0,
          created_at: event.created_at,
          content: event.content || '',
          sig: event.sig || '',
          tags: event.tags || []
        };
        
        // Buffer the event insert
        this.bufferWrite(
          `INSERT OR REPLACE INTO nostr_events 
           (id, pubkey, kind, created_at, content, sig, raw_event, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eventData.id,
            eventData.pubkey,
            eventData.kind,
            eventData.created_at,
            eventData.content,
            eventData.sig,
            JSON.stringify(eventData),
            Date.now()
          ]
        );
        
        // Buffer the tag deletes and inserts
        this.bufferWrite(
          'DELETE FROM event_tags WHERE event_id = ?',
          [eventData.id]
        );
        
        if (eventData.tags && eventData.tags.length > 0) {
          for (let i = 0; i < eventData.tags.length; i++) {
            const tag = eventData.tags[i];
            if (tag.length >= 2) {
              this.bufferWrite(
                'INSERT INTO event_tags (event_id, name, value, index_num) VALUES (?, ?, ?, ?)',
                [eventData.id, tag[0], tag[1], i]
              );
            }
          }
        }
      }
      
      // Always add to feed cache
      this.bufferWrite(
        `INSERT OR REPLACE INTO feed_cache 
         (event_id, feed_type, created_at, cached_at)
         VALUES (?, ?, ?, ?)`,
        [
          event.id,
          feedType,
          event.created_at,
          Date.now()
        ]
      );
    } catch (error) {
      console.error('[SocialFeedCache] Error caching event:', error);
    }
  }
  
  /**
   * Get cached events for a feed
   * @param feedType Type of feed (following, powr, global)
   * @param limit Maximum number of events to return
   * @param since Timestamp to fetch events since (inclusive)
   * @param until Timestamp to fetch events until (inclusive)
   * @returns Array of cached events
   */
  async getCachedEvents(
    feedType: string,
    limit: number = 20,
    since?: number,
    until?: number
  ): Promise<NDKEvent[]> {
    try {
      // Build query
      let query = `
        SELECT event_id 
        FROM feed_cache 
        WHERE feed_type = ?
      `;
      
      const params: any[] = [feedType];
      
      if (since) {
        query += ' AND created_at >= ?';
        params.push(since);
      }
      
      if (until) {
        query += ' AND created_at <= ?';
        params.push(until);
      }
      
      // Order by created_at descending (newest first)
      query += ' ORDER BY created_at DESC';
      
      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }
      
      // Get event IDs
      const rows = await this.db.getAllAsync<{ event_id: string }>(query, params);
      
      // Get full events
      const events: NDKEvent[] = [];
      
      for (const row of rows) {
        const event = await this.eventCache.getEvent(row.event_id);
        if (event && this.ndk) {
      // Convert to NDKEvent
      const ndkEvent = new NDKEvent(this.ndk);
      if (event.id) {
        ndkEvent.id = event.id;
      } else {
        // Skip events without an ID
        continue;
      }
          ndkEvent.pubkey = event.pubkey || '';
          ndkEvent.kind = event.kind || 0;
          ndkEvent.created_at = event.created_at || Math.floor(Date.now() / 1000);
          ndkEvent.content = event.content || '';
          ndkEvent.sig = event.sig || '';
          ndkEvent.tags = event.tags || [];
          
          events.push(ndkEvent);
        }
      }
      
      return events;
    } catch (error) {
      console.error('[SocialFeedCache] Error getting cached events:', error);
      return [];
    }
  }
  
  /**
   * Cache a referenced event (quoted content)
   * @param eventId ID of the referenced event
   * @param kind Kind of the referenced event
   */
  async cacheReferencedEvent(eventId: string, kind: number): Promise<NDKEvent | null> {
    if (!this.ndk) return null;
    
    try {
      // Check if already cached
      const cachedEvent = await this.eventCache.getEvent(eventId);
      if (cachedEvent) {
      // Convert to NDKEvent
      const ndkEvent = new NDKEvent(this.ndk);
      if (cachedEvent.id) {
        ndkEvent.id = cachedEvent.id;
      } else {
        // Skip events without an ID
        return null;
      }
        ndkEvent.pubkey = cachedEvent.pubkey || '';
        ndkEvent.kind = cachedEvent.kind || 0;
        ndkEvent.created_at = cachedEvent.created_at || Math.floor(Date.now() / 1000);
        ndkEvent.content = cachedEvent.content || '';
        ndkEvent.sig = cachedEvent.sig || '';
        ndkEvent.tags = cachedEvent.tags || [];
        
        return ndkEvent;
      }
      
      // Not cached, try to fetch from network
      const filter: NDKFilter = {
        ids: [eventId] as string[],
        kinds: [kind] as number[],
      };
      
      const events = await this.ndk.fetchEvents(filter, {
        cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
      });
      
      if (events.size > 0) {
        const event = Array.from(events)[0];
        
        try {
          // Cache the event
          await this.eventCache.setEvent({
            id: event.id,
            pubkey: event.pubkey || '',
            kind: event.kind || 0,
            created_at: event.created_at || Math.floor(Date.now() / 1000),
            content: event.content || '',
            sig: event.sig || '',
            tags: event.tags || []
          }, true); // Skip if already exists
        } catch (error) {
          console.error('[SocialFeedCache] Error caching referenced event:', error);
          // Continue even if caching fails - we can still return the event
        }
        
        return event;
      }
      
      return null;
    } catch (error) {
      console.error('[SocialFeedCache] Error caching referenced event:', error);
      return null;
    }
  }
  
  /**
   * Get a cached event by ID
   * @param eventId Event ID
   * @returns Cached event or null
   */
  async getCachedEvent(eventId: string): Promise<NDKEvent | null> {
    if (!this.ndk) return null;
    
    try {
      const event = await this.eventCache.getEvent(eventId);
      if (!event) return null;
      
      // Convert to NDKEvent
      const ndkEvent = new NDKEvent(this.ndk);
      if (event.id) {
        ndkEvent.id = event.id;
      } else {
        // Skip events without an ID
        return null;
      }
      ndkEvent.pubkey = event.pubkey || '';
      ndkEvent.kind = event.kind || 0;
      ndkEvent.created_at = event.created_at || Math.floor(Date.now() / 1000);
      ndkEvent.content = event.content || '';
      ndkEvent.sig = event.sig || '';
      ndkEvent.tags = event.tags || [];
      
      return ndkEvent;
    } catch (error) {
      console.error('[SocialFeedCache] Error getting cached event:', error);
      return null;
    }
  }
  
  /**
   * Clear old cached events
   * @param maxAgeDays Maximum age in days (default: 7)
   */
  async clearOldCache(maxAgeDays: number = 7): Promise<void> {
    try {
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - maxAgeMs;
      const cutoffTimestamp = Math.floor(cutoffTime / 1000);
      
      // Get old event IDs
      const oldEvents = await this.db.getAllAsync<{ event_id: string }>(
        `SELECT event_id FROM feed_cache WHERE created_at < ?`,
        [cutoffTimestamp]
      );
      
      // Delete from feed_cache
      await this.db.runAsync(
        `DELETE FROM feed_cache WHERE created_at < ?`,
        [cutoffTimestamp]
      );
      
      console.log(`[SocialFeedCache] Cleared ${oldEvents.length} old events from feed cache`);
    } catch (error) {
      console.error('[SocialFeedCache] Error clearing old cache:', error);
    }
  }
}

// Create singleton instance
let socialFeedCache: SocialFeedCache | null = null;

export function getSocialFeedCache(database: SQLiteDatabase): SocialFeedCache {
  if (!socialFeedCache) {
    socialFeedCache = new SocialFeedCache(database);
  }
  return socialFeedCache;
}
