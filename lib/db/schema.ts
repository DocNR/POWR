// lib/db/schema.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const SCHEMA_VERSION = 1;

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
      
      // If we already have the current version, no need to recreate tables
      if (currentVersion === SCHEMA_VERSION) {
        console.log(`[Schema] Database already at version ${SCHEMA_VERSION}`);
        return;
      }
      
      console.log(`[Schema] Creating tables for version ${SCHEMA_VERSION}`);
      
      // Schema version tracking
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          updated_at INTEGER NOT NULL
        );
      `);

      // Drop all existing tables (except schema_version)
      await this.dropAllTables(db);
      
      // Create all tables in their latest form
      await this.createAllTables(db);
      
      // Update schema version
      await this.updateSchemaVersion(db);
      
      console.log(`[Schema] Database initialized at version ${SCHEMA_VERSION}`);
    } catch (error) {
      console.error('[Schema] Error creating tables:', error);
      throw error;
    }
  }
  
  private async dropAllTables(db: SQLiteDatabase): Promise<void> {
    // Get list of all tables excluding schema_version
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name != 'schema_version'"
    );
    
    // Drop each table
    for (const { name } of tables) {
      await db.execAsync(`DROP TABLE IF EXISTS ${name}`);
      console.log(`[Schema] Dropped table: ${name}`);
    }
  }
  
  private async createAllTables(db: SQLiteDatabase): Promise<void> {
    // Create exercises table
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
        source TEXT NOT NULL DEFAULT 'local',
        nostr_event_id TEXT
      );
    `);

    // Create exercise_tags table
    await db.execAsync(`
      CREATE TABLE exercise_tags (
        exercise_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
        UNIQUE(exercise_id, tag)
      );
      CREATE INDEX idx_exercise_tags ON exercise_tags(tag);
    `);
    
    // Create nostr_events table
    await db.execAsync(`
      CREATE TABLE nostr_events (
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

    // Create event_tags table
    await db.execAsync(`
      CREATE TABLE event_tags (
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        index_num INTEGER NOT NULL,
        FOREIGN KEY(event_id) REFERENCES nostr_events(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_event_tags ON event_tags(name, value);
    `);
    
    // Create cache metadata table
    await db.execAsync(`
      CREATE TABLE cache_metadata (
        content_id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        last_accessed INTEGER NOT NULL,
        access_count INTEGER NOT NULL DEFAULT 0,
        cache_priority INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Create media cache table
    await db.execAsync(`
      CREATE TABLE exercise_media (
        exercise_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        content BLOB NOT NULL,
        thumbnail BLOB,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );
    `);
    
    // Create user profiles table
    await db.execAsync(`
      CREATE TABLE user_profiles (
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
      CREATE INDEX idx_user_profiles_last_updated ON user_profiles(last_updated DESC);
    `);

    // Create user relays table
    await db.execAsync(`
      CREATE TABLE user_relays (
        pubkey TEXT NOT NULL,
        relay_url TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT 1,
        write BOOLEAN NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (pubkey, relay_url),
        FOREIGN KEY(pubkey) REFERENCES user_profiles(pubkey) ON DELETE CASCADE
      );
    `);
    
    // Create publication queue table
    await db.execAsync(`
      CREATE TABLE publication_queue (
        event_id TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_attempt INTEGER,
        payload TEXT NOT NULL,
        FOREIGN KEY(event_id) REFERENCES nostr_events(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_publication_queue_created ON publication_queue(created_at ASC);
    `);

    // Create app status table
    await db.execAsync(`
      CREATE TABLE app_status (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    
    // Create NDK cache table
    await db.execAsync(`
      CREATE TABLE ndk_cache (
        id TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        kind INTEGER NOT NULL
      );
      CREATE INDEX idx_ndk_cache_kind ON ndk_cache(kind);
      CREATE INDEX idx_ndk_cache_created ON ndk_cache(created_at);
    `);
    
    // Create favorites table
    await db.execAsync(`
      CREATE TABLE favorites (
        id TEXT PRIMARY KEY,
        content_type TEXT NOT NULL,
        content_id TEXT NOT NULL,
        content TEXT NOT NULL,
        pubkey TEXT,
        created_at INTEGER NOT NULL,
        UNIQUE(content_type, content_id)
      );
      CREATE INDEX idx_favorites_content_type ON favorites(content_type);
      CREATE INDEX idx_favorites_content_id ON favorites(content_id);
    `);
  }
  
  private async updateSchemaVersion(db: SQLiteDatabase): Promise<void> {
    // Delete any existing schema version records
    await db.runAsync('DELETE FROM schema_version');
    
    // Insert the current version
    await db.runAsync(
      'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
      [SCHEMA_VERSION, Date.now()]
    );
  }
  
  async resetDatabase(db: SQLiteDatabase): Promise<void> {
    if (!__DEV__) return; // Only allow in development
    
    try {
      console.log('[Schema] Resetting database...');
      
      await this.dropAllTables(db);
      await this.createAllTables(db);
      await this.updateSchemaVersion(db);
      
      console.log('[Schema] Database reset complete');
    } catch (error) {
      console.error('[Schema] Error resetting database:', error);
      throw error;
    }
  }
}

export const schema = new Schema();