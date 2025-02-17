import { SQLiteDatabase } from 'expo-sqlite';

export const SCHEMA_VERSION = 1;

class Schema {
  async createTables(db: SQLiteDatabase): Promise<void> {
    try {
      // Version tracking
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          updated_at INTEGER NOT NULL
        );
      `);

      // Exercise Definitions
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          equipment TEXT,
          description TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // Exercise Tags
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS exercise_tags (
          exercise_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
          UNIQUE(exercise_id, tag)
        );

        CREATE INDEX IF NOT EXISTS idx_exercise_tags ON exercise_tags(tag);
      `);

      // Set initial schema version if not exists
      const version = await db.getFirstAsync<{ version: number }>(
        'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
      );
      
      if (!version) {
        await db.runAsync(
          'INSERT INTO schema_version (version, updated_at) VALUES (?, ?)',
          [SCHEMA_VERSION, Date.now()]
        );
      }
    } catch (error) {
      console.error('[Schema] Error creating tables:', error);
      throw error;
    }
  }
}

export const schema = new Schema();