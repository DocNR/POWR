// lib/db/services/ExerciseService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Exercise, ExerciseType, ExerciseCategory, Equipment } from '@/types/exercise';
import { generateId } from '@/utils/ids';

export class ExerciseService {
  constructor(private db: SQLiteDatabase) {}

  // Add this new method
  async getAllExercises(): Promise<Exercise[]> {
    try {
      const exercises = await this.db.getAllAsync<any>(`
        SELECT * FROM exercises ORDER BY created_at DESC
      `);

      const exerciseIds = exercises.map(e => e.id);
      if (exerciseIds.length === 0) return [];

      const tags = await this.db.getAllAsync<{ exercise_id: string; tag: string }>(
        `SELECT exercise_id, tag 
         FROM exercise_tags 
         WHERE exercise_id IN (${exerciseIds.map(() => '?').join(',')})`,
        exerciseIds
      );

      const tagsByExercise = tags.reduce((acc, { exercise_id, tag }) => {
        acc[exercise_id] = acc[exercise_id] || [];
        acc[exercise_id].push(tag);
        return acc;
      }, {} as Record<string, string[]>);

      return exercises.map(exercise => ({
        ...exercise,
        tags: tagsByExercise[exercise.id] || [],
        format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
        format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
        availability: { source: [exercise.source] }
      }));
    } catch (error) {
      console.error('Error getting all exercises:', error);
      throw error;
    }
  }

  // Update createExercise to handle all required fields
  async createExercise(
    exercise: Omit<Exercise, 'id' | 'availability'>, 
    inTransaction: boolean = false
  ): Promise<string> {
    const id = generateId();
    const timestamp = Date.now();
  
    try {
      const runQueries = async () => {
        await this.db.runAsync(
          `INSERT INTO exercises (
            id, title, type, category, equipment, description,
            format_json, format_units_json, created_at, updated_at, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            exercise.title,
            exercise.type,
            exercise.category,
            exercise.equipment || null,
            exercise.description || null,
            exercise.format ? JSON.stringify(exercise.format) : null,
            exercise.format_units ? JSON.stringify(exercise.format_units) : null,
            timestamp,
            timestamp,
            exercise.source || 'local'
          ]
        );
  
        if (exercise.tags?.length) {
          for (const tag of exercise.tags) {
            await this.db.runAsync(
              'INSERT INTO exercise_tags (exercise_id, tag) VALUES (?, ?)',
              [id, tag]
            );
          }
        }
      };
  
      if (inTransaction) {
        await runQueries();
      } else {
        await this.db.withTransactionAsync(runQueries);
      }
  
      return id;
    } catch (error) {
      console.error('Error creating exercise:', error);
      throw error;
    }
  }

  async getExercise(id: string): Promise<Exercise | null> {
    try {
      // Get exercise data
      const exercise = await this.db.getFirstAsync<Exercise>(
        `SELECT * FROM exercises WHERE id = ?`,
        [id]
      );

      if (!exercise) return null;

      // Get tags
      const tags = await this.db.getAllAsync<{ tag: string }>(
        'SELECT tag FROM exercise_tags WHERE exercise_id = ?',
        [id]
      );

      return {
        ...exercise,
        format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
        format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
        tags: tags.map(t => t.tag)
      };
    } catch (error) {
      console.error('Error getting exercise:', error);
      throw error;
    }
  }

  async updateExercise(id: string, exercise: Partial<Exercise>): Promise<void> {
    const timestamp = Date.now();

    try {
      await this.db.withTransactionAsync(async () => {
        // Build update query dynamically based on provided fields
        const updates: string[] = [];
        const values: any[] = [];

        if (exercise.title !== undefined) {
          updates.push('title = ?');
          values.push(exercise.title);
        }

        if (exercise.type !== undefined) {
          updates.push('type = ?');
          values.push(exercise.type);
        }

        if (exercise.category !== undefined) {
          updates.push('category = ?');
          values.push(exercise.category);
        }

        if (exercise.equipment !== undefined) {
          updates.push('equipment = ?');
          values.push(exercise.equipment);
        }

        if (exercise.description !== undefined) {
          updates.push('description = ?');
          values.push(exercise.description);
        }

        if (exercise.format !== undefined) {
          updates.push('format_json = ?');
          values.push(JSON.stringify(exercise.format));
        }

        if (exercise.format_units !== undefined) {
          updates.push('format_units_json = ?');
          values.push(JSON.stringify(exercise.format_units));
        }

        if (updates.length > 0) {
          updates.push('updated_at = ?');
          values.push(timestamp);

          // Add id to values array
          values.push(id);

          await this.db.runAsync(
            `UPDATE exercises SET ${updates.join(', ')} WHERE id = ?`,
            values
          );
        }

        // Update tags if provided
        if (exercise.tags !== undefined) {
          // Delete existing tags
          await this.db.runAsync(
            'DELETE FROM exercise_tags WHERE exercise_id = ?',
            [id]
          );

          // Insert new tags
          for (const tag of exercise.tags) {
            await this.db.runAsync(
              'INSERT INTO exercise_tags (exercise_id, tag) VALUES (?, ?)',
              [id, tag]
            );
          }
        }
      });
    } catch (error) {
      console.error('Error updating exercise:', error);
      throw error;
    }
  }

  async deleteExercise(id: string): Promise<void> {
    try {
      console.log('Deleting exercise:', id);
      await this.db.withTransactionAsync(async () => {
        // Due to ON DELETE CASCADE, we only need to delete from exercises
        const result = await this.db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
        console.log('Delete result:', result);
      });
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  }

  async searchExercises(query?: string, filters?: {
    types?: ExerciseType[];
    categories?: ExerciseCategory[];
    equipment?: Equipment[];
    tags?: string[];
    source?: 'local' | 'powr' | 'nostr';
  }): Promise<Exercise[]> {
    try {
      let sql = `
        SELECT DISTINCT e.*
        FROM exercises e
        LEFT JOIN exercise_tags et ON e.id = et.exercise_id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Add search condition
      if (query) {
        sql += ' AND (e.title LIKE ? OR e.description LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
      }

      // Add filter conditions
      if (filters?.types?.length) {
        sql += ` AND e.type IN (${filters.types.map(() => '?').join(',')})`;
        params.push(...filters.types);
      }

      if (filters?.categories?.length) {
        sql += ` AND e.category IN (${filters.categories.map(() => '?').join(',')})`;
        params.push(...filters.categories);
      }

      if (filters?.equipment?.length) {
        sql += ` AND e.equipment IN (${filters.equipment.map(() => '?').join(',')})`;
        params.push(...filters.equipment);
      }

      if (filters?.source) {
        sql += ' AND e.source = ?';
        params.push(filters.source);
      }

      // Handle tag filtering
      if (filters?.tags?.length) {
        sql += `
          AND e.id IN (
            SELECT exercise_id 
            FROM exercise_tags 
            WHERE tag IN (${filters.tags.map(() => '?').join(',')})
            GROUP BY exercise_id
            HAVING COUNT(DISTINCT tag) = ?
          )
        `;
        params.push(...filters.tags, filters.tags.length);
      }

      // Add ordering
      sql += ' ORDER BY e.title ASC';

      // Get exercises
      const exercises = await this.db.getAllAsync<Exercise>(sql, params);

      // Get tags for all exercises
      const exerciseIds = exercises.map(e => e.id);
      if (exerciseIds.length) {
        const tags = await this.db.getAllAsync<{ exercise_id: string; tag: string }>(
          `SELECT exercise_id, tag 
           FROM exercise_tags 
           WHERE exercise_id IN (${exerciseIds.map(() => '?').join(',')})`,
          exerciseIds
        );

        // Group tags by exercise
        const tagsByExercise = tags.reduce((acc, { exercise_id, tag }) => {
          acc[exercise_id] = acc[exercise_id] || [];
          acc[exercise_id].push(tag);
          return acc;
        }, {} as Record<string, string[]>);

        // Add tags to exercises
        return exercises.map(exercise => ({
          ...exercise,
          format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
          format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
          tags: tagsByExercise[exercise.id] || []
        }));
      }

      return exercises;
    } catch (error) {
      console.error('Error searching exercises:', error);
      throw error;
    }
  }

  async getRecentExercises(limit: number = 10): Promise<Exercise[]> {
    try {
      const sql = `
        SELECT e.* 
        FROM exercises e
        ORDER BY e.updated_at DESC
        LIMIT ?
      `;

      const exercises = await this.db.getAllAsync<Exercise>(sql, [limit]);
      
      // Get tags for these exercises
      const exerciseIds = exercises.map(e => e.id);
      if (exerciseIds.length) {
        const tags = await this.db.getAllAsync<{ exercise_id: string; tag: string }>(
          `SELECT exercise_id, tag 
           FROM exercise_tags 
           WHERE exercise_id IN (${exerciseIds.map(() => '?').join(',')})`,
          exerciseIds
        );

        // Group tags by exercise
        const tagsByExercise = tags.reduce((acc, { exercise_id, tag }) => {
          acc[exercise_id] = acc[exercise_id] || [];
          acc[exercise_id].push(tag);
          return acc;
        }, {} as Record<string, string[]>);

        return exercises.map(exercise => ({
          ...exercise,
          format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
          format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
          tags: tagsByExercise[exercise.id] || []
        }));
      }

      return exercises;
    } catch (error) {
      console.error('Error getting recent exercises:', error);
      throw error;
    }
  }

  async getExerciseTags(): Promise<{ tag: string; count: number }[]> {
    try {
      return await this.db.getAllAsync<{ tag: string; count: number }>(
        `SELECT tag, COUNT(*) as count 
         FROM exercise_tags 
         GROUP BY tag 
         ORDER BY count DESC, tag ASC`
      );
    } catch (error) {
      console.error('Error getting exercise tags:', error);
      throw error;
    }
  }

  async bulkImport(exercises: Omit<Exercise, 'id'>[]): Promise<string[]> {
    const ids: string[] = [];
    
    try {
      await this.db.withTransactionAsync(async () => {
        for (const exercise of exercises) {
          const id = await this.createExercise(exercise);
          ids.push(id);
        }
      });
      
      return ids;
    } catch (error) {
      console.error('Error bulk importing exercises:', error);
      throw error;
    }
  }

  // Helper method to sync with Nostr events
  async syncWithNostrEvent(eventId: string, exercise: Omit<Exercise, 'id'>): Promise<string> {
    try {
      // Check if we already have this exercise
      const existing = await this.db.getFirstAsync<{ id: string }>(
        'SELECT id FROM exercises WHERE nostr_event_id = ?',
        [eventId]
      );

      if (existing) {
        // Update existing exercise
        await this.updateExercise(existing.id, exercise);
        return existing.id;
      } else {
        // Create new exercise with Nostr reference
        const id = generateId();
        const timestamp = Date.now();

        await this.db.withTransactionAsync(async () => {
          await this.db.runAsync(
            `INSERT INTO exercises (
              id, nostr_event_id, title, type, category, equipment, description,
              format_json, format_units_json, created_at, updated_at, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              eventId,
              exercise.title,
              exercise.type,
              exercise.category,
              exercise.equipment || null,
              exercise.description || null,
              exercise.format ? JSON.stringify(exercise.format) : null,
              exercise.format_units ? JSON.stringify(exercise.format_units) : null,
              timestamp,
              timestamp,
              'nostr'
            ]
          );

          if (exercise.tags?.length) {
            for (const tag of exercise.tags) {
              await this.db.runAsync(
                'INSERT INTO exercise_tags (exercise_id, tag) VALUES (?, ?)',
                [id, tag]
              );
            }
          }
        });

        return id;
      }
    } catch (error) {
      console.error('Error syncing exercise with Nostr event:', error);
      throw error;
    }
  }
}
// Helper function to create an instance
export const createExerciseService = (db: SQLiteDatabase) => new ExerciseService(db);

// Also export a type for the service if needed
export type ExerciseServiceType = ExerciseService;