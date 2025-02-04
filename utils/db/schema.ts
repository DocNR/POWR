// utils/db/schema.ts
import { DbService } from './db-service';

export const SCHEMA_VERSION = 3;

class Schema {
  private db: DbService;

  constructor() {
    this.db = new DbService('powr.db');
  }

  async createTables(): Promise<void> {
    try {
      await this.db.executeWriteMany([
        // Version tracking
        {
          sql: `CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            updated_at INTEGER NOT NULL
          );`
        },
        // Exercise table with updated fields
        {
          sql: `CREATE TABLE IF NOT EXISTS exercises (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('strength', 'cardio', 'bodyweight')),
            category TEXT NOT NULL CHECK(category IN ('Push', 'Pull', 'Legs', 'Core')),
            equipment TEXT CHECK(equipment IN ('bodyweight', 'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'other')),
            description TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            source TEXT NOT NULL DEFAULT 'local'
          );`
        },
        // Exercise instructions
        {
          sql: `CREATE TABLE IF NOT EXISTS exercise_instructions (
            exercise_id TEXT NOT NULL,
            instruction TEXT NOT NULL,
            display_order INTEGER NOT NULL,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
          );`
        },
        // Exercise tags
        {
          sql: `CREATE TABLE IF NOT EXISTS exercise_tags (
            exercise_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
            UNIQUE(exercise_id, tag)
          );`
        },
        // Exercise format settings
        {
          sql: `CREATE TABLE IF NOT EXISTS exercise_format (
            exercise_id TEXT PRIMARY KEY,
            format_json TEXT NOT NULL,
            units_json TEXT,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
          );`
        },
        // Workout templates
        {
          sql: `CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('strength', 'circuit', 'emom', 'amrap')),
            category TEXT NOT NULL CHECK(category IN ('Full Body', 'Custom', 'Push/Pull/Legs', 'Upper/Lower', 'Cardio', 'CrossFit', 'Strength')),
            description TEXT,
            author_name TEXT,
            author_pubkey TEXT,
            rounds INTEGER,
            duration INTEGER,
            interval_time INTEGER,
            rest_between_rounds INTEGER,
            is_public BOOLEAN NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            metadata_json TEXT,
            availability_json TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'local'
          );`
        },
        // Template exercises (junction table)
        {
          sql: `CREATE TABLE IF NOT EXISTS template_exercises (
            template_id TEXT NOT NULL,
            exercise_id TEXT NOT NULL,
            target_sets INTEGER,
            target_reps INTEGER,
            target_weight REAL,
            target_rpe INTEGER CHECK(target_rpe BETWEEN 0 AND 10),
            notes TEXT,
            display_order INTEGER NOT NULL,
            FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
            PRIMARY KEY(template_id, exercise_id, display_order)
          );`
        },
        // Template tags
        {
          sql: `CREATE TABLE IF NOT EXISTS template_tags (
            template_id TEXT NOT NULL,
            tag TEXT NOT NULL,
            FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE,
            UNIQUE(template_id, tag)
          );`
        }
      ]);
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async migrate(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    
    if (currentVersion < SCHEMA_VERSION) {
      if (currentVersion < 1) {
        await this.createTables();
        await this.setVersion(1);
      }
      
      // Migration to version 2 - Add format table
      if (currentVersion < 2) {
        await this.db.executeWrite(`
          CREATE TABLE IF NOT EXISTS exercise_format (
            exercise_id TEXT PRIMARY KEY,
            format_json TEXT NOT NULL,
            units_json TEXT,
            FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
          );
        `);
        await this.setVersion(2);
      }

      // Migration to version 3 - Add template tables
      if (currentVersion < 3) {
        await this.db.executeWriteMany([
          {
            sql: `CREATE TABLE IF NOT EXISTS templates (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              type TEXT NOT NULL CHECK(type IN ('strength', 'circuit', 'emom', 'amrap')),
              category TEXT NOT NULL CHECK(category IN ('Full Body', 'Custom', 'Push/Pull/Legs', 'Upper/Lower', 'Cardio', 'CrossFit', 'Strength')),
              description TEXT,
              author_name TEXT,
              author_pubkey TEXT,
              rounds INTEGER,
              duration INTEGER,
              interval_time INTEGER,
              rest_between_rounds INTEGER,
              is_public BOOLEAN NOT NULL DEFAULT 0,
              created_at INTEGER NOT NULL,
              updated_at INTEGER NOT NULL,
              metadata_json TEXT,
              availability_json TEXT NOT NULL,
              source TEXT NOT NULL DEFAULT 'local'
            );`
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS template_exercises (
              template_id TEXT NOT NULL,
              exercise_id TEXT NOT NULL,
              target_sets INTEGER,
              target_reps INTEGER,
              target_weight REAL,
              target_rpe INTEGER CHECK(target_rpe BETWEEN 0 AND 10),
              notes TEXT,
              display_order INTEGER NOT NULL,
              FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE,
              FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
              PRIMARY KEY(template_id, exercise_id, display_order)
            );`
          },
          {
            sql: `CREATE TABLE IF NOT EXISTS template_tags (
              template_id TEXT NOT NULL,
              tag TEXT NOT NULL,
              FOREIGN KEY(template_id) REFERENCES templates(id) ON DELETE CASCADE,
              UNIQUE(template_id, tag)
            );`
          }
        ]);
        await this.setVersion(3);
      }
    }
  }

  private async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.db.executeSql(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      return result.rows.length > 0 ? result.rows.item(0).version : 0;
    } catch (error) {
      console.error('Error getting schema version:', error);
      return 0;
    }
  }

  private async setVersion(version: number): Promise<void> {
    try {
      await this.db.executeSql(
        'DELETE FROM schema_version WHERE version = ?',
        [version]
      );
      await this.db.executeSql(
        'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
        [version, Date.now()]
      );
    } catch (error) {
      console.error('Error setting schema version:', error);
      throw error;
    }
  }
}

export const schema = new Schema();