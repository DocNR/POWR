// lib/db/services/TemplateService.ts
import { SQLiteDatabase, openDatabaseSync } from 'expo-sqlite';
import { 
  WorkoutTemplate, 
  TemplateExerciseConfig 
} from '@/types/templates';
import { Workout } from '@/types/workout';
import { generateId } from '@/utils/ids';
import { DbService } from '../db-service';
import { ExerciseService } from './ExerciseService';
import { BaseExercise, ExerciseDisplay } from '@/types/exercise';

interface TemplateExerciseWithData {
  id: string;
  exercise: BaseExercise | ExerciseDisplay;
  displayOrder: number;
  targetSets?: number; // Changed from number | null to number | undefined
  targetReps?: number; // Changed from number | null to number | undefined
  targetWeight?: number; // Changed from number | null to number | undefined
  notes?: string;
  nostrReference?: string;
}

export class TemplateService {
  private db: DbService;
  
  constructor(db: SQLiteDatabase, private exerciseService: ExerciseService) {
    // Convert SQLiteDatabase to DbService
    this.db = db as unknown as DbService;
  }

  /**
   * Get all templates
   */
  async getAllTemplates(limit: number = 50, offset: number = 0): Promise<WorkoutTemplate[]> {
    try {
      // Add source logging
      const sourceCount = await this.db.getAllAsync<{source: string, count: number}>(
        'SELECT source, COUNT(*) as count FROM templates GROUP BY source'
      );
      console.log('[TemplateService] Template sources:');
      sourceCount.forEach(s => console.log(`  - ${s.source}: ${s.count}`));
      
      const templates = await this.db.getAllAsync<{
        id: string;
        title: string;
        type: string;
        description: string;
        created_at: number;
        updated_at: number;
        nostr_event_id: string | null;
        source: string;
        parent_id: string | null;
        author_pubkey: string | null;
        is_archived: number;
      }>(
        `SELECT * FROM templates WHERE is_archived = 0 ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      console.log(`[TemplateService] Found ${templates.length} templates`);
      // Log each template for debugging
      templates.forEach(t => console.log(`  - ${t.title} (${t.id}) [source: ${t.source}]`));
      
      const result: WorkoutTemplate[] = [];
      
      for (const template of templates) {
        // Get exercises for this template
        const exercises = await this.getTemplateExercises(template.id);
        
        result.push({
          id: template.id,
          title: template.title,
          type: template.type as any,
          description: template.description,
          category: 'Custom', 
          created_at: template.created_at,
          lastUpdated: template.updated_at,
          nostrEventId: template.nostr_event_id || undefined,
          parentId: template.parent_id || undefined,
          authorPubkey: template.author_pubkey || undefined,
          isArchived: template.is_archived === 1,
          exercises,
          availability: {
            source: [template.source as any]
          },
          isPublic: false,
          version: 1,
          tags: []
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  }
  
  /**
   * Get all archived templates
   */
  async getArchivedTemplates(limit: number = 50, offset: number = 0): Promise<WorkoutTemplate[]> {
    try {
      const templates = await this.db.getAllAsync<{
        id: string;
        title: string;
        type: string;
        description: string;
        created_at: number;
        updated_at: number;
        nostr_event_id: string | null;
        source: string;
        parent_id: string | null;
        author_pubkey: string | null;
        is_archived: number;
      }>(
        `SELECT * FROM templates WHERE is_archived = 1 ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      const result: WorkoutTemplate[] = [];
      
      for (const template of templates) {
        // Get exercises for this template
        const exercises = await this.getTemplateExercises(template.id);
        
        result.push({
          id: template.id,
          title: template.title,
          type: template.type as any,
          description: template.description,
          category: 'Custom', 
          created_at: template.created_at,
          lastUpdated: template.updated_at,
          nostrEventId: template.nostr_event_id || undefined,
          parentId: template.parent_id || undefined,
          authorPubkey: template.author_pubkey || undefined,
          isArchived: true,
          exercises,
          availability: {
            source: [template.source as any]
          },
          isPublic: false,
          version: 1,
          tags: []
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting archived templates:', error);
      return [];
    }
  }
  
  /**
   * Get a template by ID
   */
  async getTemplate(id: string): Promise<WorkoutTemplate | null> {
    try {
      const template = await this.db.getFirstAsync<{
        id: string;
        title: string;
        type: string;
        description: string;
        created_at: number;
        updated_at: number;
        nostr_event_id: string | null;
        source: string;
        parent_id: string | null;
        author_pubkey: string | null;
        is_archived: number;
      }>(
        `SELECT * FROM templates WHERE id = ?`,
        [id]
      );
      
      if (!template) return null;
      
      // Get exercises for this template
      const exercises = await this.getTemplateExercises(id);
      
      return {
        id: template.id,
        title: template.title,
        type: template.type as any,
        description: template.description,
        category: 'Custom', 
        created_at: template.created_at,
        lastUpdated: template.updated_at,
        nostrEventId: template.nostr_event_id || undefined,
        parentId: template.parent_id || undefined,
        authorPubkey: template.author_pubkey || undefined,
        isArchived: template.is_archived === 1,
        exercises,
        availability: {
          source: [template.source as any]
        },
        isPublic: false,
        version: 1,
        tags: []
      };
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }
  
  /**
   * Create a new template
   */
  async createTemplate(template: Omit<WorkoutTemplate, 'id'>): Promise<string> {
    try {
      const id = generateId();
      const timestamp = Date.now();
      
      await this.db.withTransactionAsync(async () => {
        // Insert template
        await this.db.runAsync(
          `INSERT INTO templates (
            id, title, type, description, created_at, updated_at,
            nostr_event_id, source, parent_id, author_pubkey, is_archived
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            template.title,
            template.type || 'strength',
            template.description || null,
            timestamp,
            timestamp,
            template.nostrEventId || null,
            template.availability?.source[0] || 'local',
            template.parentId || null,
            template.authorPubkey || null,
            template.isArchived ? 1 : 0
          ]
        );
        
        // Insert exercises
        if (template.exercises?.length) {
          for (let i = 0; i < template.exercises.length; i++) {
            const exercise = template.exercises[i];
            
            await this.db.runAsync(
              `INSERT INTO template_exercises (
                id, template_id, exercise_id, display_order,
                target_sets, target_reps, target_weight, notes,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                exercise.id || generateId(),
                id,
                exercise.exercise.id,
                i,
                exercise.targetSets || null,
                exercise.targetReps || null,
                exercise.targetWeight || null,
                exercise.notes || null,
                timestamp,
                timestamp
              ]
            );
          }
        }
      });
      
      return id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing template
   */
  async updateTemplate(id: string, updates: Partial<WorkoutTemplate>): Promise<void> {
    try {
      const timestamp = Date.now();
      
      await this.db.withTransactionAsync(async () => {
        // Update template record
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        
        if (updates.title !== undefined) {
          updateFields.push('title = ?');
          updateValues.push(updates.title);
        }
        
        if (updates.type !== undefined) {
          updateFields.push('type = ?');
          updateValues.push(updates.type);
        }
        
        if (updates.description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(updates.description);
        }
        
        if (updates.nostrEventId !== undefined) {
          updateFields.push('nostr_event_id = ?');
          updateValues.push(updates.nostrEventId);
        }
        
        if (updates.authorPubkey !== undefined) {
          updateFields.push('author_pubkey = ?');
          updateValues.push(updates.authorPubkey);
        }
        if (updates.isArchived !== undefined) {
          updateFields.push('is_archived = ?');
          updateValues.push(updates.isArchived ? 1 : 0);
        }
        
        // Always update the timestamp
        updateFields.push('updated_at = ?');
        updateValues.push(timestamp);
        
        // Add the ID for the WHERE clause
        updateValues.push(id);
        
        if (updateFields.length > 0) {
          await this.db.runAsync(
            `UPDATE templates SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
          );
        }
        
        // Update exercises if provided
        if (updates.exercises) {
          // Delete existing exercises
          await this.db.runAsync(
            'DELETE FROM template_exercises WHERE template_id = ?',
            [id]
          );
          
          // Insert new exercises
          if (updates.exercises.length > 0) {
            for (let i = 0; i < updates.exercises.length; i++) {
              const exercise = updates.exercises[i];
              
              await this.db.runAsync(
                `INSERT INTO template_exercises (
                  id, template_id, exercise_id, display_order,
                  target_sets, target_reps, target_weight, notes,
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  exercise.id || generateId(),
                  id,
                  exercise.exercise.id,
                  i,
                  exercise.targetSets || null,
                  exercise.targetReps || null,
                  exercise.targetWeight || null,
                  exercise.notes || null,
                  timestamp,
                  timestamp
                ]
              );
            }
          }
        }
      });
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }
  
  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      await this.db.withTransactionAsync(async () => {
        // Delete template exercises
        await this.db.runAsync(
          'DELETE FROM template_exercises WHERE template_id = ?',
          [id]
        );
        
        // Delete template
        await this.db.runAsync(
          'DELETE FROM templates WHERE id = ?',
          [id]
        );
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
  
  /**
   * Update template with Nostr event ID
   */
  async updateNostrEventId(templateId: string, eventId: string): Promise<void> {
    try {
      await this.db.runAsync(
        `UPDATE templates SET nostr_event_id = ? WHERE id = ?`,
        [eventId, templateId]
      );
    } catch (error) {
      console.error('Error updating template nostr event ID:', error);
      throw error;
    }
  }
  
  /**
   * Archive a template
   */
  async archiveTemplate(id: string, archive: boolean = true): Promise<void> {
    try {
      await this.db.runAsync(
        'UPDATE templates SET is_archived = ? WHERE id = ?',
        [archive ? 1 : 0, id]
      );
    } catch (error) {
      console.error('Error archiving template:', error);
      throw error;
    }
  }
  
  /**
   * Remove template from library
   */
  async removeFromLibrary(id: string): Promise<void> {
    try {
      await this.db.withTransactionAsync(async () => {
        // Delete template-exercise relationships
        await this.db.runAsync(
          'DELETE FROM template_exercises WHERE template_id = ?',
          [id]
        );
        
        // Delete template
        await this.db.runAsync(
          'DELETE FROM templates WHERE id = ?',
          [id]
        );
        
        // Update powr_pack_items to mark as not imported
        await this.db.runAsync(
          'UPDATE powr_pack_items SET is_imported = 0 WHERE item_id = ? AND item_type = "template"',
          [id]
        );
      });
    } catch (error) {
      console.error('Error removing template from library:', error);
      throw error;
    }
  }
  
  /**
   * Delete template from Nostr
   */
  async deleteFromNostr(id: string, ndk: any): Promise<void> {
    try {
      // Get template details
      const template = await this.getTemplate(id);
      if (!template || !template.nostrEventId) {
        throw new Error('Template not found or not from Nostr');
      }
      
      // Create deletion event
      const event = new ndk.NDKEvent(ndk);
      event.kind = 5; // Deletion event
      event.tags.push(['e', template.nostrEventId]); // Reference to template event
      event.content = '';
      
      // Sign and publish
      await event.sign();
      await event.publish();
      
      // Remove from database
      await this.removeFromLibrary(id);
    } catch (error) {
      console.error('Error deleting template from Nostr:', error);
      throw error;
    }
  }
  
  // Helper methods
  async getTemplateExercises(templateId: string): Promise<TemplateExerciseWithData[]> {
    try {
      console.log(`Fetching exercises for template ${templateId}`);
      
      const exercises = await this.db.getAllAsync<{
        id: string;
        exercise_id: string;
        display_order: number;
        target_sets: number | null;
        target_reps: number | null;
        target_weight: number | null;
        notes: string | null;
        nostr_reference: string | null;
      }>(
        `SELECT id, exercise_id, display_order, target_sets, target_reps, target_weight, notes, nostr_reference
         FROM template_exercises
         WHERE template_id = ?
         ORDER BY display_order`,
        [templateId]
      );
      
      console.log(`Found ${exercises.length} template exercises in database`);
      
      if (exercises.length === 0) {
        return [];
      }
      
      // Get the actual exercise data for each template exercise
      const result: TemplateExerciseWithData[] = [];
      
      for (const exerciseRow of exercises) {
        const exerciseData = await this.exerciseService.getExercise(exerciseRow.exercise_id);
        
        if (exerciseData) {
          result.push({
            id: exerciseRow.id,
            exercise: exerciseData,
            displayOrder: exerciseRow.display_order,
            targetSets: exerciseRow.target_sets ?? undefined, // Convert null to undefined
            targetReps: exerciseRow.target_reps ?? undefined, // Convert null to undefined
            targetWeight: exerciseRow.target_weight ?? undefined, // Convert null to undefined
            notes: exerciseRow.notes ?? undefined, // Convert null to undefined
            nostrReference: exerciseRow.nostr_reference ?? undefined, // Convert null to undefined
          });
        }
      }
      
      console.log(`Returning ${result.length} template exercises`);
      return result;
    } catch (error) {
      console.error('Error getting template exercises:', error);
      return [];
    }
  }

  // Static helper methods used by the workout store
  static async updateExistingTemplate(workout: Workout): Promise<boolean> {
    try {
      // Make sure workout has a templateId
      if (!workout.templateId) {
        return false;
      }
      
      // Get database access
      const db = openDatabaseSync('powr.db');
      const service = new TemplateService(db, new ExerciseService(db))
      
      // Get the existing template
      const template = await service.getTemplate(workout.templateId);
      if (!template) {
        console.log('Template not found for updating:', workout.templateId);
        return false;
      }
      
      // Convert workout exercises to template format
      const exercises: TemplateExerciseConfig[] = workout.exercises.map(ex => ({
        id: generateId(),
        exercise: {
          id: ex.id,
          title: ex.title,
          type: ex.type,
          category: ex.category,
          equipment: ex.equipment,
          tags: ex.tags || [], // Required property
          availability: { source: ['local'] }, // Required property
          created_at: ex.created_at // Required property
        },
        targetSets: ex.sets.length,
        targetReps: ex.sets[0]?.reps || 0,
        targetWeight: ex.sets[0]?.weight || 0
      }));
      
      // Update the template
      await service.updateTemplate(template.id, {
        lastUpdated: Date.now(),
        exercises
      });
      
      console.log('Template updated successfully:', template.id);
      return true;
    } catch (error) {
      console.error('Error updating template from workout:', error);
      return false;
    }
  }
  
  static async saveAsNewTemplate(workout: Workout, name: string): Promise<string | null> {
    try {
      // Get database access
      const db = openDatabaseSync('powr.db');
      const service = new TemplateService(db, new ExerciseService(db));
      
      // Convert workout exercises to template format
      const exercises: TemplateExerciseConfig[] = workout.exercises.map(ex => ({
        id: generateId(),
        exercise: {
          id: ex.id,
          title: ex.title,
          type: ex.type,
          category: ex.category,
          equipment: ex.equipment,
          tags: ex.tags || [], // Required property
          availability: { source: ['local'] }, // Required property
          created_at: ex.created_at // Required property
        },
        targetSets: ex.sets.length,
        targetReps: ex.sets[0]?.reps || 0,
        targetWeight: ex.sets[0]?.weight || 0
      }));
      
      // Create the new template
      const templateId = await service.createTemplate({
        title: name,
        type: workout.type,
        description: workout.notes,
        category: 'Custom', 
        exercises,
        created_at: Date.now(),
        parentId: workout.templateId, // Link to original template if this was derived
        availability: {
          source: ['local']
        },
        isPublic: false,
        version: 1,
        tags: [],
        isArchived: false
      });
      
      console.log('New template created from workout:', templateId);
      return templateId;
    } catch (error) {
      console.error('Error creating template from workout:', error);
      return null;
    }
  }
  
  static hasTemplateChanges(workout: Workout): boolean {
    // Simple implementation - in a real app, you'd compare with the original template
    return workout.templateId !== undefined;
  }
}