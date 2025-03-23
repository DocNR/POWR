// lib/db/migrations/add-nostr-fields-to-workouts.ts
import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Add Nostr-specific fields to the workouts table
 * This migration adds fields for tracking Nostr publication status
 */
export async function addNostrFieldsToWorkouts(db: SQLiteDatabase): Promise<void> {
  try {
    console.log('[Migration] Adding Nostr fields to workouts table');
    
    // Check if the workouts table exists
    const tableExists = await db.getFirstAsync<{ count: number }>(
      `SELECT count(*) as count FROM sqlite_master 
       WHERE type='table' AND name='workouts'`
    );
    
    if (!tableExists || tableExists.count === 0) {
      console.log('[Migration] Workouts table does not exist, skipping migration');
      return;
    }
    
    // Get current columns in the workouts table
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(workouts)"
    );
    
    const columnNames = columns.map(col => col.name);
    
    // Add nostr_published_at if it doesn't exist
    if (!columnNames.includes('nostr_published_at')) {
      console.log('[Migration] Adding nostr_published_at column to workouts table');
      await db.execAsync('ALTER TABLE workouts ADD COLUMN nostr_published_at INTEGER');
    }
    
    // Add nostr_relay_count if it doesn't exist
    if (!columnNames.includes('nostr_relay_count')) {
      console.log('[Migration] Adding nostr_relay_count column to workouts table');
      await db.execAsync('ALTER TABLE workouts ADD COLUMN nostr_relay_count INTEGER');
    }
    
    // Add nostr_event_id if it doesn't exist (this might already exist but we check anyway)
    if (!columnNames.includes('nostr_event_id')) {
      console.log('[Migration] Adding nostr_event_id column to workouts table');
      await db.execAsync('ALTER TABLE workouts ADD COLUMN nostr_event_id TEXT');
    }
    
    console.log('[Migration] Successfully added Nostr fields to workouts table');
  } catch (error) {
    console.error('[Migration] Error adding Nostr fields to workouts:', error);
    throw error;
  }
}

/**
 * Create a table for tracking Nostr workout events
 * This table will store Nostr event IDs and their associated workout IDs
 */
export async function createNostrWorkoutsTable(db: SQLiteDatabase): Promise<void> {
  try {
    console.log('[Migration] Creating nostr_workouts table');
    
    // Check if the nostr_workouts table already exists
    const tableExists = await db.getFirstAsync<{ count: number }>(
      `SELECT count(*) as count FROM sqlite_master 
       WHERE type='table' AND name='nostr_workouts'`
    );
    
    if (tableExists && tableExists.count > 0) {
      console.log('[Migration] nostr_workouts table already exists, skipping creation');
      return;
    }
    
    // Create the nostr_workouts table
    await db.execAsync(`
      CREATE TABLE nostr_workouts (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        pubkey TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        relay_urls TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_nostr_workouts_workout_id ON nostr_workouts(workout_id);
      CREATE INDEX idx_nostr_workouts_event_id ON nostr_workouts(event_id);
    `);
    
    console.log('[Migration] Successfully created nostr_workouts table');
  } catch (error) {
    console.error('[Migration] Error creating nostr_workouts table:', error);
    throw error;
  }
}
