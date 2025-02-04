// services/LibraryService.ts
import { DbService } from '@/utils/db/db-service';
import { generateId } from '@/utils/ids';
import { 
  BaseExercise, 
  ExerciseCategory, 
  Equipment,
  LibraryContent
} from '@/types/exercise';
import { WorkoutTemplate } from '@/types/workout';

class LibraryService {
  private db: DbService;

  constructor() {
    this.db = new DbService('powr.db');
  }

  async addExercise(exercise: Omit<BaseExercise, 'id' | 'created_at' | 'availability'>): Promise<string> {
    const id = generateId();
    const timestamp = Date.now();

    try {
      await this.db.withTransaction(async () => {
        // Insert main exercise data
        await this.db.executeWrite(
          `INSERT INTO exercises (
            id, title, type, category, equipment, description, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            exercise.title,
            exercise.type,
            exercise.category,
            exercise.equipment || null,
            exercise.description || null,
            timestamp,
            timestamp
          ]
        );

        // Insert instructions if provided
        if (exercise.instructions?.length) {
          for (const [index, instruction] of exercise.instructions.entries()) {
            await this.db.executeWrite(
              `INSERT INTO exercise_instructions (
                exercise_id, instruction, display_order
              ) VALUES (?, ?, ?)`,
              [id, instruction, index]
            );
          }
        }

        // Insert tags if provided
        if (exercise.tags?.length) {
          for (const tag of exercise.tags) {
            await this.db.executeWrite(
              `INSERT INTO exercise_tags (exercise_id, tag) VALUES (?, ?)`,
              [id, tag]
            );
          }
        }

        // Insert format settings if provided
        if (exercise.format) {
          await this.db.executeWrite(
            `INSERT INTO exercise_format (
              exercise_id, format_json, units_json
            ) VALUES (?, ?, ?)`,
            [
              id,
              JSON.stringify(exercise.format),
              JSON.stringify(exercise.format_units || {})
            ]
          );
        }
      });

      return id;
    } catch (error) {
      console.error('Error adding exercise:', error);
      throw error;
    }
  }

  async getExercise(id: string): Promise<BaseExercise | null> {
    try {
      const result = await this.db.executeSql(
        `SELECT 
          e.*,
          GROUP_CONCAT(DISTINCT i.instruction) as instructions,
          GROUP_CONCAT(DISTINCT t.tag) as tags,
          f.format_json,
          f.units_json
        FROM exercises e
        LEFT JOIN exercise_instructions i ON e.id = i.exercise_id
        LEFT JOIN exercise_tags t ON e.id = t.exercise_id
        LEFT JOIN exercise_format f ON e.id = f.exercise_id
        WHERE e.id = ?
        GROUP BY e.id`,
        [id]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows.item(0);
      return {
        id: row.id,
        title: row.title,
        type: row.type,
        category: row.category as ExerciseCategory,
        equipment: row.equipment as Equipment,
        description: row.description,
        instructions: row.instructions ? row.instructions.split(',') : [],
        tags: row.tags ? row.tags.split(',') : [],
        format: row.format_json ? JSON.parse(row.format_json) : undefined,
        format_units: row.units_json ? JSON.parse(row.units_json) : undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        availability: {
          source: ['local']
        }
      };
    } catch (error) {
      console.error('Error getting exercise:', error);
      throw error;
    }
  }

  async getExercises(category?: ExerciseCategory): Promise<BaseExercise[]> {
    try {
      const query = `
        SELECT 
          e.*,
          GROUP_CONCAT(DISTINCT i.instruction) as instructions,
          GROUP_CONCAT(DISTINCT t.tag) as tags,
          f.format_json,
          f.units_json
        FROM exercises e
        LEFT JOIN exercise_instructions i ON e.id = i.exercise_id
        LEFT JOIN exercise_tags t ON e.id = t.exercise_id
        LEFT JOIN exercise_format f ON e.id = f.exercise_id
        ${category ? 'WHERE e.category = ?' : ''}
        GROUP BY e.id
        ORDER BY e.title
      `;

      const result = await this.db.executeSql(query, category ? [category] : []);

      return Array.from({ length: result.rows.length }, (_, i) => {
        const row = result.rows.item(i);
        return {
          id: row.id,
          title: row.title,
          type: row.type,
          category: row.category as ExerciseCategory,
          equipment: row.equipment as Equipment,
          description: row.description,
          instructions: row.instructions ? row.instructions.split(',') : [],
          tags: row.tags ? row.tags.split(',') : [],
          format: row.format_json ? JSON.parse(row.format_json) : undefined,
          format_units: row.units_json ? JSON.parse(row.units_json) : undefined,
          created_at: row.created_at,
          updated_at: row.updated_at,
          availability: {
            source: ['local']
          }
        };
      });
    } catch (error) {
      console.error('Error getting exercises:', error);
      throw error;
    }
  }

  async getTemplates(): Promise<LibraryContent[]> {
    try {
      // First get exercises
      const exercises = await this.getExercises();
      const exerciseContent = exercises.map(exercise => ({
        id: exercise.id,
        title: exercise.title,
        type: 'exercise' as const,
        description: exercise.description,
        category: exercise.category,
        equipment: exercise.equipment,
        source: 'local' as const,
        tags: exercise.tags,
        created_at: exercise.created_at,
        availability: {
          source: ['local']
        }
      }));

      // Get workout templates
      const templatesQuery = `
        SELECT 
          t.*,
          GROUP_CONCAT(tt.tag) as tags
        FROM templates t
        LEFT JOIN template_tags tt ON t.id = tt.template_id
        GROUP BY t.id
        ORDER BY t.updated_at DESC
      `;

      const result = await this.db.executeSql(templatesQuery);
      const templateContent: LibraryContent[] = Array.from({ length: result.rows.length }, (_, i) => {
        const row = result.rows.item(i);
        return {
          id: row.id,
          title: row.title,
          type: 'workout' as const,
          description: row.description,
          author: row.author_name ? {
            name: row.author_name,
            pubkey: row.author_pubkey
          } : undefined,
          source: row.source as 'local' | 'pow' | 'nostr',
          tags: row.tags ? row.tags.split(',') : [],
          created_at: row.created_at,
          availability: JSON.parse(row.availability_json)
        };
      });

      return [...exerciseContent, ...templateContent];
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  async getTemplate(id: string): Promise<WorkoutTemplate | null> {
    try {
      // Get main template data
      const templateResult = await this.db.executeSql(
        `SELECT t.*, GROUP_CONCAT(tt.tag) as tags
         FROM templates t
         LEFT JOIN template_tags tt ON t.id = tt.template_id
         WHERE t.id = ?
         GROUP BY t.id`,
        [id]
      );

      if (templateResult.rows.length === 0) return null;

      const templateRow = templateResult.rows.item(0);
      const exercises = await this.getTemplateExercises(id);

      return {
        id: templateRow.id,
        title: templateRow.title,
        type: templateRow.type,
        category: templateRow.category,
        description: templateRow.description,
        author: templateRow.author_name ? {
          name: templateRow.author_name,
          pubkey: templateRow.author_pubkey
        } : undefined,
        exercises,
        tags: templateRow.tags ? templateRow.tags.split(',') : [],
        rounds: templateRow.rounds,
        duration: templateRow.duration,
        interval: templateRow.interval_time,
        restBetweenRounds: templateRow.rest_between_rounds,
        isPublic: Boolean(templateRow.is_public),
        created_at: templateRow.created_at,
        metadata: templateRow.metadata_json ? JSON.parse(templateRow.metadata_json) : undefined,
        availability: JSON.parse(templateRow.availability_json)
      };
    } catch (error) {
      console.error('Error getting template:', error);
      throw error;
    }
  }

  private async getTemplateExercises(templateId: string): Promise<Array<{
    exercise: BaseExercise;
    targetSets?: number;
    targetReps?: number;
    notes?: string;
  }>> {
    try {
      const result = await this.db.executeSql(
        `SELECT te.*, e.*
         FROM template_exercises te
         JOIN exercises e ON te.exercise_id = e.id
         WHERE te.template_id = ?
         ORDER BY te.display_order`,
        [templateId]
      );

      return Promise.all(
        Array.from({ length: result.rows.length }, async (_, i) => {
          const row = result.rows.item(i);
          const exercise = await this.getExercise(row.exercise_id);
          if (!exercise) throw new Error(`Exercise ${row.exercise_id} not found`);
          
          return {
            exercise,
            targetSets: row.target_sets,
            targetReps: row.target_reps,
            notes: row.notes
          };
        })
      );
    } catch (error) {
      console.error('Error getting template exercises:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const libraryService = new LibraryService();