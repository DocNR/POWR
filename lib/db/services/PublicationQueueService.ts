// lib/db/services/PublicationQueueService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import NDK, { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { NostrEvent } from '@/types/nostr';

export class PublicationQueueService {
  private db: SQLiteDatabase;
  private ndk: NDK | null = null;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  setNDK(ndk: NDK) {
    this.ndk = ndk;
  }

  /**
   * Queue an event for publishing
   * @param event The Nostr event to queue
   * @returns Promise that resolves when the event is queued
   */
  async queueEvent(event: NostrEvent | NDKEvent): Promise<void> {
    try {
      // Convert to the right format for storage
      const eventId = event instanceof NDKEvent ? event.id : event.id || '';
      const payload = event instanceof NDKEvent ? 
        JSON.stringify(event.rawEvent()) : 
        JSON.stringify(event);
      
      // Cache the event if NDK is available
      if (this.ndk && event instanceof NDKEvent) {
        // NDK handles caching internally during sign and publish
        if (!event.sig) {
          await event.sign();
        }
      }
      
      // Add to publication queue
      await this.db.runAsync(
        `INSERT OR REPLACE INTO publication_queue 
         (event_id, attempts, created_at, payload) 
         VALUES (?, ?, ?, ?)`,
        [
          eventId,
          0, 
          Date.now(), 
          payload
        ]
      );
      
      console.log(`[Queue] Event ${eventId} queued for publishing`);
    } catch (error) {
      console.error('[Queue] Error queueing event:', error);
      throw error;
    }
  }

  /**
   * Get all pending events in the queue
   * @param limit Maximum number of events to return
   * @returns Array of queued events
   */
  async getPendingEvents(limit: number = 10): Promise<{
    id: string;
    attempts: number;
    created_at: number;
    payload: NostrEvent;
  }[]> {
    try {
      const rows = await this.db.getAllAsync<{
        event_id: string;
        attempts: number;
        created_at: number;
        payload: string;
      }>(
        `SELECT event_id, attempts, created_at, payload
         FROM publication_queue
         WHERE attempts < 5
         ORDER BY attempts ASC, created_at ASC
         LIMIT ?`,
        [limit]
      );

      return rows.map(row => ({
        id: row.event_id,
        attempts: row.attempts,
        created_at: row.created_at,
        payload: JSON.parse(row.payload) as NostrEvent
      }));
    } catch (error) {
      console.error('[Queue] Error getting pending events:', error);
      return [];
    }
  }

  /**
   * Process pending events using NDK
   * @returns Promise that resolves when processing is complete
   */
  async processQueue(): Promise<void> {
    if (!this.ndk) {
      console.log('[Queue] NDK not available, skipping queue processing');
      return;
    }
    
    try {
      const pendingEvents = await this.getPendingEvents();
      console.log(`[Queue] Processing ${pendingEvents.length} pending events`);
      
      for (const item of pendingEvents) {
        try {
          // Update attempt count
          await this.incrementAttempt(item.id);
          
          // Create NDK event and publish
          const event = new NDKEvent(this.ndk);
          const rawEvent = item.payload;
          
          // Copy properties from raw event
          event.id = rawEvent.id || '';
          event.pubkey = rawEvent.pubkey || '';
          event.kind = rawEvent.kind || 0;
          event.created_at = rawEvent.created_at || Math.floor(Date.now() / 1000);
          event.content = rawEvent.content || '';
          event.tags = rawEvent.tags || [];
          event.sig = rawEvent.sig || '';
          
          // Publish
          await event.publish();
          
          // Remove from queue on success
          await this.removeEvent(item.id);
        } catch (error) {
          console.error(`[Queue] Failed to publish event ${item.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[Queue] Error processing queue:', error);
    }
  }

  /**
   * Update the attempt count for an event
   * @param eventId ID of the event
   * @returns Promise that resolves when the event is updated
   */
  async incrementAttempt(eventId: string): Promise<void> {
    try {
      await this.db.runAsync(
        `UPDATE publication_queue 
         SET attempts = attempts + 1, last_attempt = ?
         WHERE event_id = ?`,
        [Date.now(), eventId]
      );
    } catch (error) {
      console.error('[Queue] Error incrementing attempt:', error);
    }
  }

  /**
   * Remove an event from the queue (when successfully published)
   * @param eventId ID of the event to remove
   * @returns Promise that resolves when the event is removed
   */
  async removeEvent(eventId: string): Promise<void> {
    try {
      await this.db.runAsync(
        `DELETE FROM publication_queue WHERE event_id = ?`,
        [eventId]
      );
      console.log(`[Queue] Event ${eventId} removed from queue`);
    } catch (error) {
      console.error('[Queue] Error removing event:', error);
    }
  }

  /**
   * Get the number of pending events in the queue
   * @returns Promise that resolves with the count
   */
  async getPendingCount(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM publication_queue WHERE attempts < 5`
      );
      return result?.count || 0;
    } catch (error) {
      console.error('[Queue] Error getting pending count:', error);
      return 0;
    }
  }

  /**
   * Set the online status in the app_status table
   * @param isOnline Whether the app is online
   */
  async setOnlineStatus(isOnline: boolean): Promise<void> {
    try {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO app_status (key, value, updated_at)
         VALUES (?, ?, ?)`,
        ['online_status', isOnline ? 'online' : 'offline', Date.now()]
      );
    } catch (error) {
      console.error('[Queue] Error setting online status:', error);
    }
  }

  /**
   * Get the current online status
   * @returns Promise that resolves with the online status
   */
  async getOnlineStatus(): Promise<boolean | null> {
    try {
      const result = await this.db.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_status WHERE key = ?`,
        ['online_status']
      );
      
      if (result) {
        return result.value === 'online';
      }
      return null;
    } catch (error) {
      console.error('[Queue] Error getting online status:', error);
      return null;
    }
  }
}