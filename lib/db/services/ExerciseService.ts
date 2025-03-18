// lib/db/services/ExerciseService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { 
  BaseExercise,
  ExerciseDisplay,
  ExerciseType, 
  ExerciseCategory, 
  Equipment,
  toExerciseDisplay
} from '@/types/exercise';
import { generateId } from '@/utils/ids';

export class ExerciseService {
  constructor(private db: SQLiteDatabase) {}

  async getAllExercises(): Promise<ExerciseDisplay[]> {
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

      return exercises.map(exercise => {
        const baseExercise: BaseExercise = {
          ...exercise,
          tags: tagsByExercise[exercise.id] || [],
          format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
          format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
          availability: { source: [exercise.source] }
        };
        return toExerciseDisplay(baseExercise);
      });
    } catch (error) {
      console.error('Error getting all exercises:', error);
      throw error;
    }
  }

  async getExercise(id: string): Promise<ExerciseDisplay | null> {
    try {
      // Get exercise data
      const exercise = await this.db.getFirstAsync<any>(
        `SELECT * FROM exercises WHERE id = ?`,
        [id]
      );

      if (!exercise) return null;

      // Get tags
      const tags = await this.db.getAllAsync<{ tag: string }>(
        'SELECT tag FROM exercise_tags WHERE exercise_id = ?',
        [id]
      );

      const baseExercise: BaseExercise = {
        ...exercise,
        format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
        format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
        tags: tags.map(t => t.tag),
        availability: { source: [exercise.source] }
      };

      return toExerciseDisplay(baseExercise);
    } catch (error) {
      console.error('Error getting exercise:', error);
      throw error;
    }
  }

  async createExercise(
    exercise: Omit<BaseExercise, 'id'>, 
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
            exercise.availability.source[0]
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

  async searchExercises(query?: string, filters?: {
    types?: ExerciseType[];
    categories?: ExerciseCategory[];
    equipment?: Equipment[];
    tags?: string[];
    source?: 'local' | 'powr' | 'nostr';
  }): Promise<ExerciseDisplay[]> {
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
      const exercises = await this.db.getAllAsync<any>(sql, params);

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

        // Convert to ExerciseDisplay
        return exercises.map(exercise => {
          const baseExercise: BaseExercise = {
            ...exercise,
            format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
            format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
            tags: tagsByExercise[exercise.id] || [],
            availability: { source: [exercise.source] }
          };
          return toExerciseDisplay(baseExercise);
        });
      }

      return [];
    } catch (error) {
      console.error('Error searching exercises:', error);
      throw error;
    }
  }

  async getRecentExercises(limit: number = 10): Promise<ExerciseDisplay[]> {
    try {
      const sql = `
        SELECT e.* 
        FROM exercises e
        ORDER BY e.updated_at DESC
        LIMIT ?
      `;

      const exercises = await this.db.getAllAsync<any>(sql, [limit]);
      
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

        return exercises.map(exercise => {
          const baseExercise: BaseExercise = {
            ...exercise,
            format: exercise.format_json ? JSON.parse(exercise.format_json) : undefined,
            format_units: exercise.format_units_json ? JSON.parse(exercise.format_units_json) : undefined,
            tags: tagsByExercise[exercise.id] || [],
            availability: { source: [exercise.source] }
          };
          return toExerciseDisplay(baseExercise);
        });
      }

      return [];
    } catch (error) {
      console.error('Error getting recent exercises:', error);
      throw error;
    }
  }

  async updateExercise(id: string, exercise: Partial<BaseExercise>): Promise<void> {
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

        if (exercise.availability !== undefined) {
          updates.push('source = ?');
          values.push(exercise.availability.source[0]);
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

  // Add this to lib/db/services/ExerciseService.ts
  async deleteExercise(id: string): Promise<boolean> {
    try {
      // First check if the exercise is from a POWR Pack
      const exercise = await this.db.getFirstAsync<{ source: string }>(
        'SELECT source FROM exercises WHERE id = ?',
        [id]
      );
      
      if (!exercise) {
        throw new Error(`Exercise with ID ${id} not found`);
      }
      
      if (exercise.source === 'nostr' || exercise.source === 'powr') {
        // This is a POWR Pack exercise - don't allow direct deletion
        throw new Error('This exercise is part of a POWR Pack and cannot be deleted individually. You can remove the entire POWR Pack from the settings menu.');
      }
      
      // For local exercises, proceed with deletion
      await this.db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
      
      // Also delete any references in template_exercises
      await this.db.runAsync('DELETE FROM template_exercises WHERE exercise_id = ?', [id]);
      
      return true;
    } catch (error) {
      console.error('Error deleting exercise:', error);
      throw error;
    }
  }

  async syncWithNostrEvent(eventId: string, exercise: Omit<BaseExercise, 'id'>): Promise<string> {
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