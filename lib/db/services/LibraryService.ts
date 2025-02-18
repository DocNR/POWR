// lib/db/services/LibraryService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { DbService } from '../db-service';
import { BaseExercise, Exercise } from '@/types/exercise';
import { StorageSource } from '@/types/shared';
import { generateId } from '@/utils/ids';

export class LibraryService {
  private readonly db: DbService;
  private readonly DEBUG = __DEV__;

  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
  }

  async getExercises(): Promise<Exercise[]> {
    try {
      const result = await this.db.getAllAsync<{
        id: string;
        title: string;
        type: string;
        category: string;
        equipment: string | null;
        description: string | null;
        instructions: string | null;
        tags: string | null;
        created_at: number;
        source: string;
        format_json: string | null;
        format_units_json: string | null;
      }>(
        `SELECT 
          e.*,
          GROUP_CONCAT(DISTINCT t.tag) as tags
        FROM exercises e 
        LEFT JOIN exercise_tags t ON e.id = t.exercise_id 
        GROUP BY e.id
        ORDER BY e.title`
      );
  
      return result.map(row => ({
        id: row.id,
        title: row.title,
        type: row.type as Exercise['type'],
        category: row.category as Exercise['category'],
        equipment: row.equipment as Exercise['equipment'] || undefined,
        description: row.description || undefined,
        instructions: row.instructions ? row.instructions.split(',') : undefined,
        tags: row.tags ? row.tags.split(',') : [],
        created_at: row.created_at,
        source: row.source as Exercise['source'],
        availability: {
          source: [row.source as StorageSource]
        },
        format_json: row.format_json || undefined,
        format_units_json: row.format_units_json || undefined
      }));
    } catch (error) {
      console.error('Error getting exercises:', error);
      throw error;
    }
  }

  async addExercise(exercise: Omit<Exercise, 'id'>): Promise<string> {
    try {
      const id = generateId();      
      const timestamp = Date.now(); // Use same timestamp for both created_at and updated_at initially
      
      await this.db.withTransactionAsync(async () => {
        // Insert main exercise data
        await this.db.runAsync(
          `INSERT INTO exercises (
            id, title, type, category, equipment, description, 
            created_at, updated_at, source, format_json, format_units_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            exercise.title,
            exercise.type,
            exercise.category,
            exercise.equipment || null,
            exercise.description || null,
            timestamp, // created_at
            timestamp, // updated_at
            exercise.source,
            exercise.format_json || null,
            exercise.format_units_json || null
          ]
        );

        // Insert tags
        if (exercise.tags?.length) {
          for (const tag of exercise.tags) {
            await this.db.runAsync(
              `INSERT INTO exercise_tags (exercise_id, tag) VALUES (?, ?)`,
              [id, tag]
            );
          }
        }

        // Insert instructions
        if (exercise.instructions?.length) {
          for (const [index, instruction] of exercise.instructions.entries()) {
            await this.db.runAsync(
              `INSERT INTO exercise_instructions (
                exercise_id, instruction, display_order
              ) VALUES (?, ?, ?)`,
              [id, instruction, index]
            );
          }
        }
      });

      return id;
    } catch (error) {
      console.error('Error adding exercise:', error);
      throw error;
    }
  }

  async deleteExercise(id: string): Promise<void> {
    try {
      const result = await this.db.runAsync(
        'DELETE FROM exercises WHERE id = ?',
        [id]
      );

      if (!result.changes) {
        throw new Error('Exercise not found');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  }
}