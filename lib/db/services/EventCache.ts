// lib/db/services/EventCache.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { NostrEvent } from '@/types/nostr';

export class EventCache {
  private db: SQLiteDatabase;
  private writeBuffer: { query: string; params: any[] }[] = [];

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  async setEvent(event: NostrEvent, inTransaction: boolean = false): Promise<void> {
    try {
      // Store queries to execute
      const queries = [
        {
          query: `INSERT OR REPLACE INTO nostr_events 
                  (id, pubkey, kind, created_at, content, sig, raw_event, received_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            event.id || '',  // Convert undefined to empty string
            event.pubkey || '',
            event.kind,
            event.created_at,
            event.content,
            event.sig || '',
            JSON.stringify(event),
            Date.now()
          ]
        },
        // Add metadata query
        {
          query: `INSERT OR REPLACE INTO cache_metadata 
                  (content_id, content_type, last_accessed, access_count)
                  VALUES (?, ?, ?, 1)
                  ON CONFLICT(content_id) DO UPDATE SET
                  last_accessed = ?,
                  access_count = access_count + 1`,
          params: [
            event.id || '',
            'event',
            Date.now(),
            Date.now()
          ]
        }
      ];

      // Add tag queries
      event.tags.forEach((tag, index) => {
        queries.push({
          query: `INSERT OR REPLACE INTO event_tags 
                  (event_id, name, value, index_num)
                  VALUES (?, ?, ?, ?)`,
          params: [
            event.id || '',
            tag[0] || '',
            tag[1] || '',
            index
          ]
        });
      });

      // If we're already in a transaction, just execute the queries
      if (inTransaction) {
        for (const { query, params } of queries) {
          await this.db.runAsync(query, params);
        }
      } else {
        // Otherwise, wrap in our own transaction
        await this.db.withTransactionAsync(async () => {
          for (const { query, params } of queries) {
            await this.db.runAsync(query, params);
          }
        });
      }
    } catch (error) {
      console.error('Error caching event:', error);
      throw error;
    }
  }

  async getEvent(id: string): Promise<NostrEvent | null> {
    try {
      const event = await this.db.getFirstAsync<any>(
        `SELECT * FROM nostr_events WHERE id = ?`,
        [id]
      );

      if (!event) return null;

      // Get tags
      const tags = await this.db.getAllAsync<{ name: string; value: string }>(
        `SELECT name, value FROM event_tags WHERE event_id = ? ORDER BY index_num`,
        [id]
      );

      // Update access metadata
      await this.db.runAsync(
        `UPDATE cache_metadata 
         SET last_accessed = ?, access_count = access_count + 1
         WHERE content_id = ?`,
        [Date.now(), id]
      );

      return {
        ...event,
        tags: tags.map(tag => [tag.name, tag.value])
      };
    } catch (error) {
      console.error('Error getting event from cache:', error);
      return null;
    }
  }
}