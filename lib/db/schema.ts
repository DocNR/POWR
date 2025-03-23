// lib/db/schema.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

export const SCHEMA_VERSION = 11;

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

  // Version 8 migration - add template archive and author pubkey
  async migrate_v8(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('[Schema] Running migration v8 - Template management');
      
      // Check if is_archived column already exists in templates table
      const columnsResult = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(templates)"
      );
      
      const columnNames = columnsResult.map(col => col.name);
      
      // Add is_archived if it doesn't exist
      if (!columnNames.includes('is_archived')) {
        console.log('[Schema] Adding is_archived column to templates table');
        await db.execAsync('ALTER TABLE templates ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0');
      }
      
      // Add author_pubkey if it doesn't exist
      if (!columnNames.includes('author_pubkey')) {
        console.log('[Schema] Adding author_pubkey column to templates table');
        await db.execAsync('ALTER TABLE templates ADD COLUMN author_pubkey TEXT');
      }
      
      console.log('[Schema] Migration v8 completed successfully');
    } catch (error) {
      console.error('[Schema] Error in migration v8:', error);
      throw error;
    }
  }

  async migrate_v9(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('[Schema] Running migration v9 - Enhanced Nostr metadata');
      
      // Add columns for better Nostr integration
      
      // 1. Add nostr_metadata to exercises
      const exerciseColumns = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(exercises)"
      );
      
      if (!exerciseColumns.some(col => col.name === 'nostr_metadata')) {
        console.log('[Schema] Adding nostr_metadata column to exercises table');
        await db.execAsync('ALTER TABLE exercises ADD COLUMN nostr_metadata TEXT');
      }
      
      // 2. Add nostr_metadata to templates
      const templateColumns = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(templates)"
      );
      
      if (!templateColumns.some(col => col.name === 'nostr_metadata')) {
        console.log('[Schema] Adding nostr_metadata column to templates table');
        await db.execAsync('ALTER TABLE templates ADD COLUMN nostr_metadata TEXT');
      }
      
      // 3. Add nostr_reference to template_exercises
      const templateExerciseColumns = await db.getAllAsync<{ name: string }>(
        "PRAGMA table_info(template_exercises)"
      );
      
      if (!templateExerciseColumns.some(col => col.name === 'nostr_reference')) {
        console.log('[Schema] Adding nostr_reference column to template_exercises table');
        await db.execAsync('ALTER TABLE template_exercises ADD COLUMN nostr_reference TEXT');
      }
      
      console.log('[Schema] Migration v9 completed successfully');
    } catch (error) {
      console.error('[Schema] Error in migration v9:', error);
      throw error;
    }
  }

  async migrate_v10(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('[Schema] Running migration v10 - Adding Favorites table');
      
      // Create favorites table if it doesn't exist
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          content_type TEXT NOT NULL,
          content_id TEXT NOT NULL,
          content TEXT NOT NULL,
          pubkey TEXT,
          created_at INTEGER NOT NULL,
          UNIQUE(content_type, content_id)
        );
        CREATE INDEX IF NOT EXISTS idx_favorites_content ON favorites(content_type, content_id);
      `);
      
      console.log('[Schema] Migration v10 completed successfully');
    } catch (error) {
      console.error('[Schema] Error in migration v10:', error);
      throw error;
    }
  }
  
  async migrate_v11(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('[Schema] Running migration v11 - Adding Nostr fields to workouts');
      
      // Import the migration functions
      const { addNostrFieldsToWorkouts, createNostrWorkoutsTable } = await import('./migrations/add-nostr-fields-to-workouts');
      
      // Run the migrations
      await addNostrFieldsToWorkouts(db);
      await createNostrWorkoutsTable(db);
      
      console.log('[Schema] Migration v11 completed successfully');
    } catch (error) {
      console.error('[Schema] Error in migration v11:', error);
      throw error;
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
      
      // If we already have the current version, check for missing tables
      if (currentVersion === SCHEMA_VERSION) {
        console.log(`[Schema] Database already at version ${SCHEMA_VERSION}, checking for missing tables`);
        await this.ensureCriticalTablesExist(db);
        return;
      }
      
      // Handle higher version numbers - especially important for Android
      if (currentVersion > SCHEMA_VERSION) {
        console.log(`[Schema] Database version ${currentVersion} is newer than target ${SCHEMA_VERSION}, checking for missing tables`);
        await this.ensureCriticalTablesExist(db);
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
          
          // Run migrations if needed
          if (currentVersion < 8) {
            console.log(`[Schema] Running migration from version ${currentVersion} to 8`);
            await this.migrate_v8(db);
          }
          
          if (currentVersion < 9) {
            console.log(`[Schema] Running migration from version ${currentVersion} to 9`);
            await this.migrate_v9(db);
          }
          
          if (currentVersion < 10) {
            console.log(`[Schema] Running migration from version ${currentVersion} to 10`);
            await this.migrate_v10(db);
          }
          
          if (currentVersion < 11) {
            console.log(`[Schema] Running migration from version ${currentVersion} to 11`);
            await this.migrate_v11(db);
          }
          
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
        
        // Run migrations if needed (same as in transaction)
        if (currentVersion < 8) {
          console.log(`[Schema] Running migration from version ${currentVersion} to 8`);
          await this.migrate_v8(db);
        }
        
        if (currentVersion < 9) {
          console.log(`[Schema] Running migration from version ${currentVersion} to 9`);
          await this.migrate_v9(db);
        }
        
        if (currentVersion < 10) {
          console.log(`[Schema] Running migration from version ${currentVersion} to 10`);
          await this.migrate_v10(db);
        }
        
        if (currentVersion < 11) {
          console.log(`[Schema] Running migration from version ${currentVersion} to 11`);
          await this.migrate_v11(db);
        }
        
        // Update schema version
        await this.updateSchemaVersion(db);
        
        console.log('[Schema] Non-transactional schema upgrade completed');
      }
    } catch (error) {
      console.error('[Schema] Error creating tables:', error);
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
      
      // Create templates table with new columns
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
          parent_id TEXT,
          is_archived BOOLEAN NOT NULL DEFAULT 0,
          author_pubkey TEXT
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

      // Create powr_packs table
      console.log('[Schema] Creating powr_packs table...');
      await db.execAsync(`
        CREATE TABLE powr_packs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          author_pubkey TEXT,
          nostr_event_id TEXT,
          import_date INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX idx_powr_packs_import_date ON powr_packs(import_date DESC);
      `);

      // Create powr_pack_items table
      console.log('[Schema] Creating powr_pack_items table...');
      await db.execAsync(`
        CREATE TABLE powr_pack_items (
          pack_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL CHECK(item_type IN ('exercise', 'template')),
          item_order INTEGER,
          is_imported BOOLEAN NOT NULL DEFAULT 0,
          nostr_event_id TEXT,
          PRIMARY KEY (pack_id, item_id),
          FOREIGN KEY (pack_id) REFERENCES powr_packs(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_powr_pack_items_type ON powr_pack_items(item_type);
      `);
      
      // Create favorites table - moved inside the try block
      console.log('[Schema] Creating favorites table...');
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS favorites (
          id TEXT PRIMARY KEY,
          content_type TEXT NOT NULL,
          content_id TEXT NOT NULL,
          content TEXT NOT NULL,
          pubkey TEXT,
          created_at INTEGER NOT NULL,
          UNIQUE(content_type, content_id)
        );
        CREATE INDEX IF NOT EXISTS idx_favorites_content ON favorites(content_type, content_id);
      `);
      
      console.log('[Schema] All tables created successfully');
    } catch (error) {
      console.error('[Schema] Error in createAllTables:', error);
      throw error;
    }
  }

  async ensureCriticalTablesExist(db: SQLiteDatabase): Promise<void> {
    try {
      console.log('[Schema] Checking for missing critical tables...');
      
      // Check if workouts table exists
      const workoutsTableExists = await db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master 
         WHERE type='table' AND name='workouts'`
      );
      
      if (!workoutsTableExists || workoutsTableExists.count === 0) {
        console.log('[Schema] Creating missing workouts tables...');
        
        // Create workouts table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS workouts (
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
          CREATE INDEX IF NOT EXISTS idx_workouts_start_time ON workouts(start_time);
          CREATE INDEX IF NOT EXISTS idx_workouts_template_id ON workouts(template_id);
        `);
        
        // Create workout_exercises table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS workout_exercises (
            id TEXT PRIMARY KEY,
            workout_id TEXT NOT NULL,
            exercise_id TEXT NOT NULL,
            display_order INTEGER NOT NULL,
            notes TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
        `);
        
        // Create workout_sets table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS workout_sets (
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
          CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(workout_exercise_id);
        `);
      }
      
      // Check if templates table exists
      const templatesTableExists = await db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master 
         WHERE type='table' AND name='templates'`
      );
      
      if (!templatesTableExists || templatesTableExists.count === 0) {
        console.log('[Schema] Creating missing templates tables...');
        
        // Create templates table with new columns is_archived and author_pubkey
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            nostr_event_id TEXT,
            source TEXT NOT NULL DEFAULT 'local',
            parent_id TEXT,
            is_archived BOOLEAN NOT NULL DEFAULT 0,
            author_pubkey TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at);
        `);
        
        // Create template_exercises table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS template_exercises (
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
          CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);
        `);
      } else {
        // If templates table exists, ensure new columns are added
        await this.migrate_v8(db);
      }

      // Check if favorites table exists
      const favoritesTableExists = await db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master 
          WHERE type='table' AND name='favorites'`
      );

      if (!favoritesTableExists || favoritesTableExists.count === 0) {
        console.log('[Schema] Creating missing favorites table...');
        
        // Create favorites table
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS favorites (
            id TEXT PRIMARY KEY,
            content_type TEXT NOT NULL,
            content_id TEXT NOT NULL,
            content TEXT NOT NULL,
            pubkey TEXT,
            created_at INTEGER NOT NULL,
            UNIQUE(content_type, content_id)
          );
          CREATE INDEX IF NOT EXISTS idx_favorites_content ON favorites(content_type, content_id);
        `);
      }
      
      console.log('[Schema] Critical tables check complete');
    } catch (error) {
      console.error('[Schema] Error ensuring critical tables exist:', error);
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
  
  async resetDatabaseCompletely(db: SQLiteDatabase): Promise<void> {
    if (!__DEV__) {
      console.log('[Schema] Database reset is only available in development mode');
      return;
    }
    
    try {
      console.log('[Schema] Completely resetting database...');
      
      // Get all tables
      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      
      // Drop all tables including schema_version
      for (const { name } of tables) {
        try {
          await db.execAsync(`DROP TABLE IF EXISTS ${name}`);
          console.log(`[Schema] Dropped table: ${name}`);
        } catch (dropError) {
          console.error(`[Schema] Error dropping table ${name}:`, dropError);
        }
      }
      
      // Create tables from scratch
      await this.createTables(db);
      
      console.log('[Schema] Database completely reset');
    } catch (error) {
      console.error('[Schema] Error completely resetting database:', error);
      throw error;
    }
  }
}

export const schema = new Schema();
