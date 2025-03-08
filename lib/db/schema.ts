// lib/db/schema.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const SCHEMA_VERSION = 2; // Increment since we're adding new tables

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
      
      // First, ensure schema_version table exists since we need it for version checking
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          updated_at INTEGER NOT NULL
        );
      `);
      
      const currentVersion = await this.getCurrentVersion(db);
      console.log(`[Schema] Current version: ${currentVersion}, Target version: ${SCHEMA_VERSION}`);
      
      // If we already have the current version, no need to recreate tables
      if (currentVersion === SCHEMA_VERSION) {
        console.log(`[Schema] Database already at version ${SCHEMA_VERSION}`);
        return;
      }
      
      console.log(`[Schema] Upgrading from version ${currentVersion} to ${SCHEMA_VERSION}`);
      
      try {
        // Use a transaction to ensure all-or-nothing table creation
        await db.withTransactionAsync(async () => {
          // Drop all existing tables (except schema_version)
          await this.dropAllTables(db);
          
          // Create all tables in their latest form
          await this.createAllTables(db);
          
          // Update schema version at the end of the transaction
          await this.updateSchemaVersion(db);
        });
        
        console.log(`[Schema] Database successfully upgraded to version ${SCHEMA_VERSION}`);
      } catch (txError) {
        console.error('[Schema] Transaction error during schema upgrade:', txError);
        
        // If transaction failed, try a non-transactional approach as fallback
        console.log('[Schema] Attempting non-transactional schema upgrade...');
        
        // Drop all existing tables except schema_version
        await this.dropAllTables(db);
        
        // Create all tables in their latest form
        await this.createAllTables(db);
        
        // Update schema version
        await this.updateSchemaVersion(db);
        
        console.log('[Schema] Non-transactional schema upgrade completed');
      }
    } catch (error) {
      console.error('[Schema] Error creating tables:', error);
      throw error;
    }
  }
  
  private async dropAllTables(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('[Schema] Getting list of tables to drop...');
      
      // Get list of all tables excluding schema_version
      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name != 'schema_version'"
      );
      
      console.log(`[Schema] Found ${tables.length} tables to drop`);
      
      // Drop each table
      for (const { name } of tables) {
        try {
          await db.execAsync(`DROP TABLE IF EXISTS ${name}`);
          console.log(`[Schema] Dropped table: ${name}`);
        } catch (dropError) {
          console.error(`[Schema] Error dropping table ${name}:`, dropError);
          // Continue with other tables even if one fails
        }
      }
    } catch (error) {
      console.error('[Schema] Error in dropAllTables:', error);
      throw error;
    }
  }
  
  private async createAllTables(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('[Schema] Creating all database tables...');
      
      // Create exercises table
      console.log('[Schema] Creating exercises table...');
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
      console.log('[Schema] Creating exercise_tags table...');
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
      console.log('[Schema] Creating nostr_events table...');
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
      console.log('[Schema] Creating event_tags table...');
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
      console.log('[Schema] Creating cache_metadata table...');
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
      console.log('[Schema] Creating exercise_media table...');
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
      console.log('[Schema] Creating user_profiles table...');
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
      console.log('[Schema] Creating user_relays table...');
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
      console.log('[Schema] Creating publication_queue table...');
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
      console.log('[Schema] Creating app_status table...');
      await db.execAsync(`
        CREATE TABLE app_status (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      
      // Create NDK cache table
      console.log('[Schema] Creating ndk_cache table...');
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
      console.log('[Schema] Creating favorites table...');
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

      // === NEW TABLES === //

      // Create workouts table
      console.log('[Schema] Creating workouts table...');
      await db.execAsync(`
        CREATE TABLE workouts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          is_completed BOOLEAN NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          template_id TEXT,
          nostr_event_id TEXT,
          share_status TEXT NOT NULL DEFAULT 'local',
          source TEXT NOT NULL DEFAULT 'local',
          total_volume REAL,
          total_reps INTEGER,
          notes TEXT
        );
        CREATE INDEX idx_workouts_start_time ON workouts(start_time);
        CREATE INDEX idx_workouts_template_id ON workouts(template_id);
      `);

      // Create workout_exercises table
      console.log('[Schema] Creating workout_exercises table...');
      await db.execAsync(`
        CREATE TABLE workout_exercises (
          id TEXT PRIMARY KEY,
          workout_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          display_order INTEGER NOT NULL,
          notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
      `);

      // Create workout_sets table
      console.log('[Schema] Creating workout_sets table...');
      await db.execAsync(`
        CREATE TABLE workout_sets (
          id TEXT PRIMARY KEY,
          workout_exercise_id TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'normal',
          weight REAL,
          reps INTEGER,
          rpe REAL,
          duration INTEGER,
          is_completed BOOLEAN NOT NULL DEFAULT 0,
          completed_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_workout_sets_exercise_id ON workout_sets(workout_exercise_id);
      `);

      // Create templates table
      console.log('[Schema] Creating templates table...');
      await db.execAsync(`
        CREATE TABLE templates (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          nostr_event_id TEXT,
          source TEXT NOT NULL DEFAULT 'local',
          parent_id TEXT
        );
        CREATE INDEX idx_templates_updated_at ON templates(updated_at);
      `);

      // Create template_exercises table
      console.log('[Schema] Creating template_exercises table...');
      await db.execAsync(`
        CREATE TABLE template_exercises (
          id TEXT PRIMARY KEY,
          template_id TEXT NOT NULL,
          exercise_id TEXT NOT NULL,
          display_order INTEGER NOT NULL,
          target_sets INTEGER,
          target_reps INTEGER,
          target_weight REAL,
          notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_template_exercises_template_id ON template_exercises(template_id);
      `);
      
      console.log('[Schema] All tables created successfully');
    } catch (error) {
      console.error('[Schema] Error in createAllTables:', error);
      throw error;
    }
  }
  
  private async updateSchemaVersion(db: SQLiteDatabase): Promise<void> {
    try {
      console.log(`[Schema] Updating schema version to ${SCHEMA_VERSION}`);
      
      // Delete any existing schema version records
      await db.runAsync('DELETE FROM schema_version');
      
      // Insert the current version
      await db.runAsync(
        'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
        [SCHEMA_VERSION, Date.now()]
      );
      
      console.log('[Schema] Schema version updated successfully');
    } catch (error) {
      console.error('[Schema] Error updating schema version:', error);
      throw error;
    }
  }
  
  async resetDatabase(db: SQLiteDatabase): Promise<void> {
    if (!__DEV__) {
      console.log('[Schema] Database reset is only available in development mode');
      return;
    }
    
    try {
      console.log('[Schema] Resetting database...');
      
      // Clear schema_version to force recreation of all tables
      await db.execAsync('DROP TABLE IF EXISTS schema_version');
      console.log('[Schema] Dropped schema_version table');
      
      // Now create tables from scratch
      await this.createTables(db);
      
      console.log('[Schema] Database reset complete');
    } catch (error) {
      console.error('[Schema] Error resetting database:', error);
      throw error;
    }
  }
}

export const schema = new Schema();