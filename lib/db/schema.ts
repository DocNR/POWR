// lib/db/schema.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const SCHEMA_VERSION = 5; // Updated to version 5 for publication queue table

class Schema {
  private async getCurrentVersion(db: SQLiteDatabase): Promise<number> {
    try {
      const tableExists = await db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master 
         WHERE type='table' AND name='schema_version'`
      );

      if (!tableExists || tableExists.count === 0) {
        console.log('[Schema] No schema_version table found');
        return 0;
      }

      const version = await db.getFirstAsync<{ version: number }>(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      
      console.log(`[Schema] Current version: ${version?.version ?? 0}`);
      return version?.version ?? 0;
    } catch (error) {
      console.log('[Schema] Error getting version:', error);
      return 0;
    }
  }

  async createTables(db: SQLiteDatabase): Promise<void> {
    try {
      console.log(`[Schema] Initializing database on ${Platform.OS}`);
      const currentVersion = await this.getCurrentVersion(db);
      
      // Schema version tracking
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          updated_at INTEGER NOT NULL
        );
      `);

      if (currentVersion < 1) {
        console.log('[Schema] Performing fresh install');
        
        // Drop existing tables if they exist
        await db.execAsync(`DROP TABLE IF EXISTS exercise_tags`);
        await db.execAsync(`DROP TABLE IF EXISTS exercises`);
        await db.execAsync(`DROP TABLE IF EXISTS event_tags`);
        await db.execAsync(`DROP TABLE IF EXISTS nostr_events`);
        
        // Create base tables
        await db.execAsync(`
          CREATE TABLE exercises (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('strength', 'cardio', 'bodyweight')),
            category TEXT NOT NULL,
            equipment TEXT,
            description TEXT,
            format_json TEXT,
            format_units_json TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            source TEXT NOT NULL DEFAULT 'local'
          );
        `);

        await db.execAsync(`
          CREATE TABLE exercise_tags (
            exercise_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
            UNIQUE(exercise_id, tag)
          );
          CREATE INDEX idx_exercise_tags ON exercise_tags(tag);
        `);

        await db.runAsync(
          'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
          [1, Date.now()]
        );
        
        console.log('[Schema] Base tables created successfully');
      }

      // Update to version 2 if needed - Nostr support
      if (currentVersion < 2) {
        console.log('[Schema] Upgrading to version 2');
        
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS nostr_events (
            id TEXT PRIMARY KEY,
            pubkey TEXT NOT NULL,
            kind INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            content TEXT NOT NULL,
            sig TEXT,
            raw_event TEXT NOT NULL,
            received_at INTEGER NOT NULL
          );
        `);

        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS event_tags (
            event_id TEXT NOT NULL,
            name TEXT NOT NULL,
            value TEXT NOT NULL,
            index_num INTEGER NOT NULL,
            FOREIGN KEY(event_id) REFERENCES nostr_events(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_event_tags ON event_tags(name, value);
        `);

        // Add Nostr reference to exercises
        try {
          await db.execAsync(`ALTER TABLE exercises ADD COLUMN nostr_event_id TEXT REFERENCES nostr_events(id)`);
        } catch (e) {
          console.log('[Schema] Note: nostr_event_id column may already exist');
        }

        await db.runAsync(
          'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
          [2, Date.now()]
        );
        
        console.log('[Schema] Version 2 upgrade completed');
      }

      // Update to version 3 if needed - Event Cache
      if (currentVersion < 3) {
        console.log('[Schema] Upgrading to version 3');

        // Create cache metadata table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS cache_metadata (
            content_id TEXT PRIMARY KEY,
            content_type TEXT NOT NULL,
            last_accessed INTEGER NOT NULL,
            access_count INTEGER NOT NULL DEFAULT 0,
            cache_priority INTEGER NOT NULL DEFAULT 0
          );
        `);

        // Create media cache table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS exercise_media (
            exercise_id TEXT NOT NULL,
            media_type TEXT NOT NULL,
            content BLOB NOT NULL,
            thumbnail BLOB,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
          );
        `);

        await db.runAsync(
          'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
          [3, Date.now()]
        );
        
        console.log('[Schema] Version 3 upgrade completed');
      }

      // Update to version 4 if needed - User Profiles
      if (currentVersion < 4) {
        console.log('[Schema] Upgrading to version 4');

        // Create user profiles table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS user_profiles (
            pubkey TEXT PRIMARY KEY,
            name TEXT,
            display_name TEXT,
            about TEXT,
            website TEXT,
            picture TEXT,
            nip05 TEXT, 
            lud16 TEXT,
            last_updated INTEGER
          );
        `);

        // Create index for faster lookup
        await db.execAsync(`
          CREATE INDEX IF NOT EXISTS idx_user_profiles_last_updated 
          ON user_profiles(last_updated DESC);
        `);

        // Create user relays table for storing preferred relays
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS user_relays (
            pubkey TEXT NOT NULL,
            relay_url TEXT NOT NULL,
            read BOOLEAN NOT NULL DEFAULT 1,
            write BOOLEAN NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            PRIMARY KEY (pubkey, relay_url),
            FOREIGN KEY(pubkey) REFERENCES user_profiles(pubkey) ON DELETE CASCADE
          );
        `);

        await db.runAsync(
          'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
          [4, Date.now()]
        );
        
        console.log('[Schema] Version 4 upgrade completed');
      }

      // Update to version 5 if needed - Publication Queue
      if (currentVersion < 5) {
        console.log('[Schema] Upgrading to version 5');

        // Create publication queue table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS publication_queue (
            event_id TEXT PRIMARY KEY,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            last_attempt INTEGER,
            payload TEXT NOT NULL,
            FOREIGN KEY(event_id) REFERENCES nostr_events(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_publication_queue_created 
          ON publication_queue(created_at ASC);
        `);

        // Create app status table for tracking connectivity
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS app_status (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );
        `);

        await db.runAsync(
          'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
          [5, Date.now()]
        );
        
        console.log('[Schema] Version 5 upgrade completed');
      }

      // Verify final schema
      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      console.log('[Schema] Final tables:', tables.map(t => t.name).join(', '));
      console.log(`[Schema] Database initialized at version ${await this.getCurrentVersion(db)}`);
    } catch (error) {
      console.error('[Schema] Error creating tables:', error);
      throw error;
    }
  }
}

export const schema = new Schema();