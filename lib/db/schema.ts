// lib/db/schema.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const SCHEMA_VERSION = 3; // Incrementing version for new tables

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