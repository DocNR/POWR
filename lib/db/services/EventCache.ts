// lib/db/services/EventCache.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { NostrEvent } from '@/types/nostr';
import { DbService } from '../db-service';

export class EventCache {
  private db: DbService;

  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
  }

  /**
   * Store a Nostr event in the cache
   */
  async setEvent(event: NostrEvent, skipExisting: boolean = false): Promise<void> {
    if (!event.id) return;

    try {
      // Check if event already exists
      if (skipExisting) {
        const exists = await this.db.getFirstAsync<{ id: string }>(
          'SELECT id FROM nostr_events WHERE id = ?',
          [event.id]
        );
        
        if (exists) return;
      }

      // Store the event
      await this.db.withTransactionAsync(async () => {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO nostr_events 
           (id, pubkey, kind, created_at, content, sig, raw_event, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            event.id,
            event.pubkey || '',
            event.kind,
            event.created_at,
            event.content,
            event.sig || '',
            JSON.stringify(event),
            Date.now()
          ]
        );

        // Store event tags
        if (event.tags && event.tags.length > 0) {
          // Delete existing tags first
          await this.db.runAsync(
            'DELETE FROM event_tags WHERE event_id = ?',
            [event.id]
          );
          
          // Insert new tags
          for (let i = 0; i < event.tags.length; i++) {
            const tag = event.tags[i];
            if (tag.length >= 2) {
              await this.db.runAsync(
                'INSERT INTO event_tags (event_id, name, value, index_num) VALUES (?, ?, ?, ?)',
                [event.id, tag[0], tag[1], i]
              );
            }
          }
        }
      });
    } catch (error) {
      console.error('Error caching event:', error);
      throw error;
    }
  }

  /**
   * Store a Nostr event in the cache without using a transaction
   * This is used when the caller is already managing a transaction
   */
  async setEventWithoutTransaction(event: NostrEvent, skipExisting: boolean = false): Promise<void> {
    if (!event.id) return;

    try {
      // Check if event already exists
      if (skipExisting) {
        const exists = await this.db.getFirstAsync<{ id: string }>(
          'SELECT id FROM nostr_events WHERE id = ?',
          [event.id]
        );
        
        if (exists) return;
      }

      // Store the event without a transaction
      await this.db.runAsync(
        `INSERT OR REPLACE INTO nostr_events 
         (id, pubkey, kind, created_at, content, sig, raw_event, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          event.pubkey || '',
          event.kind,
          event.created_at,
          event.content,
          event.sig || '',
          JSON.stringify(event),
          Date.now()
        ]
      );

      // Delete existing tags
      await this.db.runAsync(
        'DELETE FROM event_tags WHERE event_id = ?',
        [event.id]
      );
      
      // Insert new tags
      if (event.tags && event.tags.length > 0) {
        for (let i = 0; i < event.tags.length; i++) {
          const tag = event.tags[i];
          if (tag.length >= 2) {
            await this.db.runAsync(
              'INSERT INTO event_tags (event_id, name, value, index_num) VALUES (?, ?, ?, ?)',
              [event.id, tag[0], tag[1], i]
            );
          }
        }
      }
    } catch (error) {
      console.error('Error caching event without transaction:', error);
      throw error;
    }
  }

  /**
   * Get an event from the cache by ID
   */
  async getEvent(id: string): Promise<NostrEvent | null> {
    try {
      const event = await this.db.getFirstAsync<{
        id: string;
        pubkey: string;
        kind: number;
        created_at: number;
        content: string;
        sig: string;
        raw_event: string;
      }>(
        'SELECT * FROM nostr_events WHERE id = ?',
        [id]
      );

      if (!event) return null;

      // Get tags
      const tags = await this.db.getAllAsync<{
        name: string;
        value: string;
        index_num: number;
      }>(
        'SELECT name, value, index_num FROM event_tags WHERE event_id = ? ORDER BY index_num',
        [id]
      );

      // Build the event object
      const nostrEvent: NostrEvent = {
        id: event.id,
        pubkey: event.pubkey,
        kind: event.kind,
        created_at: event.created_at,
        content: event.content,
        sig: event.sig,
        tags: tags.map(tag => [tag.name, tag.value])
      };

      return nostrEvent;
    } catch (error) {
      console.error('Error retrieving event:', error);
      return null;
    }
  }
}
