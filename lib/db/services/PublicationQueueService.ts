// lib/db/services/PublicationQueueService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { NostrEvent } from '@/types/nostr';
import { EventCache } from './EventCache';

export class PublicationQueueService {
  private db: SQLiteDatabase;
  private eventCache: EventCache;

  constructor(db: SQLiteDatabase, eventCache: EventCache) {
    this.db = db;
    this.eventCache = eventCache;
  }

  /**
   * Queue an event for publishing
   * @param event The Nostr event to queue
   * @returns Promise that resolves when the event is queued
   */
  async queueEvent(event: NostrEvent): Promise<void> {
    try {
      // First, ensure the event is cached
      await this.eventCache.setEvent(event);
      
      // Then add to publication queue
      const payload = JSON.stringify(event);
      
      await this.db.runAsync(
        `INSERT OR REPLACE INTO publication_queue 
         (event_id, attempts, created_at, payload) 
         VALUES (?, ?, ?, ?)`,
        [
          event.id || '', // Add default empty string if undefined
          0, 
          Date.now(), 
          JSON.stringify(event)
        ]
      );
      
      console.log(`[Queue] Event ${event.id} queued for publishing`);
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