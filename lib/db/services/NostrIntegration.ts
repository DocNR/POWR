// lib/db/services/NostrIntegration.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { findTagValue, getTagValues } from '@/utils/nostr-utils';
import { 
  BaseExercise, 
  ExerciseType, 
  ExerciseCategory, 
  Equipment, 
  ExerciseFormat, 
  ExerciseFormatUnits 
} from '@/types/exercise';
import { 
  WorkoutTemplate, 
  TemplateType, 
  TemplateCategory, 
  TemplateExerciseConfig 
} from '@/types/templates';
import { generateId } from '@/utils/ids';

/**
 * Helper class for converting between Nostr events and local models
 */
export class NostrIntegration {
  private db: SQLiteDatabase;
  
  constructor(db: SQLiteDatabase) {
    this.db = db;
  }
  
  /**
   * Convert a Nostr exercise event to a local Exercise model
   */
  convertNostrExerciseToLocal(exerciseEvent: NDKEvent): BaseExercise {
    const id = generateId();
    const title = findTagValue(exerciseEvent.tags, 'title') || 'Unnamed Exercise';
    const equipmentTag = findTagValue(exerciseEvent.tags, 'equipment') || 'barbell';
    const difficultyTag = findTagValue(exerciseEvent.tags, 'difficulty') || '';
    const formatTag = exerciseEvent.tags.find(t => t[0] === 'format');
    const formatUnitsTag = exerciseEvent.tags.find(t => t[0] === 'format_units');
    
    // Get tags
    const tags = getTagValues(exerciseEvent.tags, 't');
    
    // Map equipment to valid type
    const equipment: Equipment = this.mapToValidEquipment(equipmentTag);
    
    // Map to valid exercise type
    const type: ExerciseType = this.mapEquipmentToType(equipment);
    
    // Map to valid category (using first tag if available)
    const category: ExerciseCategory = this.mapToCategory(tags[0] || '');
    
    // Parse format and format_units
    const format: ExerciseFormat = {};
    const formatUnits: ExerciseFormatUnits = {};
    
    if (formatTag && formatUnitsTag && formatTag.length > 1 && formatUnitsTag.length > 1) {
      // Process format parameters
      for (let i = 1; i < formatTag.length; i++) {
        const param = formatTag[i];
        const unit = formatUnitsTag[i] || '';
        
        if (param === 'weight') {
          format.weight = true;
          formatUnits.weight = (unit === 'kg' || unit === 'lbs') ? unit : 'kg';
        } else if (param === 'reps') {
          format.reps = true;
          formatUnits.reps = 'count';
        } else if (param === 'rpe') {
          format.rpe = true;
          formatUnits.rpe = '0-10';
        } else if (param === 'set_type') {
          format.set_type = true;
          formatUnits.set_type = 'warmup|normal|drop|failure';
        }
      }
    } else {
      // Set default format if none provided
      format.weight = true;
      format.reps = true;
      format.rpe = true;
      format.set_type = true;
      
      formatUnits.weight = 'kg';
      formatUnits.reps = 'count';
      formatUnits.rpe = '0-10';
      formatUnits.set_type = 'warmup|normal|drop|failure';
    }
    
    // Create the exercise object
    const exercise: BaseExercise = {
      id,
      title,
      type,
      category,
      equipment,
      description: exerciseEvent.content,
      tags,
      format,
      format_units: formatUnits,
      availability: {
        source: ['nostr'],
      },
      created_at: exerciseEvent.created_at ? exerciseEvent.created_at * 1000 : Date.now()
    };
    
    return exercise;
  }
  
  /**
   * Map string to valid Equipment type
   */
  private mapToValidEquipment(equipment: string): Equipment {
    switch (equipment.toLowerCase()) {
      case 'barbell':
        return 'barbell';
      case 'dumbbell':
        return 'dumbbell';
      case 'kettlebell':
        return 'kettlebell';
      case 'machine':
        return 'machine';
      case 'cable':
        return 'cable';
      case 'bodyweight':
        return 'bodyweight';
      default:
        return 'other';
    }
  }
  
  /**
   * Map Equipment value to exercise type
   */
  private mapEquipmentToType(equipment: Equipment): ExerciseType {
    switch (equipment) {
      case 'barbell':
      case 'dumbbell':
      case 'kettlebell':
      case 'machine':
      case 'cable':
      case 'other':
        return 'strength';
      case 'bodyweight':
        return 'bodyweight';
      default:
        return 'strength';
    }
  }
  
  /**
   * Map string to valid category
   */
  private mapToCategory(category: string): ExerciseCategory {
    const normalized = category.toLowerCase();
    
    if (normalized.includes('push')) return 'Push';
    if (normalized.includes('pull')) return 'Pull';
    if (normalized.includes('leg')) return 'Legs';
    if (normalized.includes('core') || normalized.includes('abs')) return 'Core';
    
    // Default to Push if no match
    return 'Push';
  }
  
  /**
   * Convert a Nostr template event to a local Template model
   */
  convertNostrTemplateToLocal(templateEvent: NDKEvent): WorkoutTemplate {
    const id = generateId();
    const title = findTagValue(templateEvent.tags, 'title') || 'Unnamed Template';
    const typeTag = findTagValue(templateEvent.tags, 'type') || 'strength';
    
    // Convert string to valid TemplateType
    const type: TemplateType = 
      (typeTag === 'strength' || typeTag === 'circuit' || 
       typeTag === 'emom' || typeTag === 'amrap') ? 
        typeTag as TemplateType : 'strength';
    
    // Get rounds, duration, interval if available
    const rounds = parseInt(findTagValue(templateEvent.tags, 'rounds') || '0') || undefined;
    const duration = parseInt(findTagValue(templateEvent.tags, 'duration') || '0') || undefined;
    const interval = parseInt(findTagValue(templateEvent.tags, 'interval') || '0') || undefined;
    
    // Get tags
    const tags = getTagValues(templateEvent.tags, 't');
    
    // Map to valid category
    const category: TemplateCategory = this.mapToTemplateCategory(tags[0] || '');
    
    // Create exercises placeholder (will be populated later)
    const exercises: TemplateExerciseConfig[] = [];
    
    // Create the template object
    const template: WorkoutTemplate = {
      id,
      title,
      type,
      category,
      description: templateEvent.content,
      tags,
      rounds,
      duration,
      interval,
      exercises,
      isPublic: true,
      version: 1,
      availability: {
        source: ['nostr']
      },
      created_at: templateEvent.created_at ? templateEvent.created_at * 1000 : Date.now(),
      lastUpdated: Date.now(),
      nostrEventId: templateEvent.id
    };
    
    return template;
  }
  
  /**
   * Map string to valid template category
   */
  private mapToTemplateCategory(category: string): TemplateCategory {
    const normalized = category.toLowerCase();
    
    if (normalized.includes('full') && normalized.includes('body')) return 'Full Body';
    if (normalized.includes('push') || normalized.includes('pull') || normalized.includes('leg')) return 'Push/Pull/Legs';
    if (normalized.includes('upper') || normalized.includes('lower')) return 'Upper/Lower';
    if (normalized.includes('cardio')) return 'Cardio';
    if (normalized.includes('crossfit')) return 'CrossFit';
    if (normalized.includes('strength')) return 'Strength';
    if (normalized.includes('condition')) return 'Conditioning';
    
    // Default if no match
    return 'Custom';
  }
  
  /**
   * Get exercise references from a template event
   */
  getTemplateExerciseRefs(templateEvent: NDKEvent): string[] {
    const exerciseRefs: string[] = [];
    
    for (const tag of templateEvent.tags) {
      if (tag[0] === 'exercise' && tag.length > 1) {
        exerciseRefs.push(tag[1]);
      }
    }
    
    return exerciseRefs;
  }
  
  /**
   * Save an imported exercise to the database
   */
  async saveImportedExercise(exercise: BaseExercise): Promise<string> {
    try {
      // Convert format objects to JSON strings
      const formatJson = JSON.stringify(exercise.format || {});
      const formatUnitsJson = JSON.stringify(exercise.format_units || {});
      
      await this.db.runAsync(
        `INSERT INTO exercises 
         (id, title, type, category, equipment, description, format_json, format_units_json, 
          created_at, updated_at, source, nostr_event_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exercise.id,
          exercise.title,
          exercise.type,
          exercise.category,
          exercise.equipment || 'other',
          exercise.description || '',
          formatJson,
          formatUnitsJson,
          exercise.created_at,
          Date.now(),
          'nostr',
          exercise.id // Using exercise ID as nostr_event_id since we don't have the actual event ID
        ]
      );
      
      // Save tags
      if (exercise.tags && exercise.tags.length > 0) {
        for (const tag of exercise.tags) {
          await this.db.runAsync(
            `INSERT INTO exercise_tags (exercise_id, tag) VALUES (?, ?)`,
            [exercise.id, tag]
          );
        }
      }
      
      return exercise.id;
    } catch (error) {
      console.error('Error saving imported exercise:', error);
      throw error;
    }
  }
  
  /**
   * Save an imported template to the database
   */
  async saveImportedTemplate(template: WorkoutTemplate): Promise<string> {
    try {
      await this.db.runAsync(
        `INSERT INTO templates 
         (id, title, type, description, created_at, updated_at, source, nostr_event_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          template.id,
          template.title,
          template.type,
          template.description || '',
          template.created_at,
          template.lastUpdated || Date.now(),
          'nostr',
          template.nostrEventId || null
        ]
      );
      
      return template.id;
    } catch (error) {
      console.error('Error saving imported template:', error);
      throw error;
    }
  }
  
  /**
   * Save template exercise relationships
   */
  async saveTemplateExercisesWithParams(
    templateId: string, 
    exerciseIds: string[], 
    exerciseRefs: string[]
  ): Promise<void> {
    try {
      console.log(`Saving ${exerciseIds.length} exercise relationships for template ${templateId}`);
      
      // Create template exercise records
      for (const [index, exerciseId] of exerciseIds.entries()) {
        const templateExerciseId = generateId();
        const now = Date.now();
        
        // Get the corresponding exercise reference with parameters
        const exerciseRef = exerciseRefs[index] || '';
        
        // Parse the reference format: kind:pubkey:d-tag::sets:reps:weight
        let targetSets = null;
        let targetReps = null;
        let targetWeight = null;
        
        // Check if reference contains parameters
        if (exerciseRef.includes('::')) {
          const parts = exerciseRef.split('::');
          if (parts.length > 1) {
            const params = parts[1].split(':');
            if (params.length > 0) targetSets = parseInt(params[0]) || null;
            if (params.length > 1) targetReps = parseInt(params[1]) || null;
            if (params.length > 2) targetWeight = parseFloat(params[2]) || null;
          }
        }
        
        console.log(`Template exercise ${index}: ${exerciseId} with sets=${targetSets}, reps=${targetReps}, weight=${targetWeight}`);
        
        await this.db.runAsync(
          `INSERT INTO template_exercises 
           (id, template_id, exercise_id, display_order, target_sets, target_reps, target_weight, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            templateExerciseId,
            templateId,
            exerciseId,
            index,
            targetSets,
            targetReps,
            targetWeight,
            now,
            now
          ]
        );
      }
      
      console.log(`Successfully saved all template-exercise relationships for template ${templateId}`);
    } catch (error) {
      console.error('Error saving template exercises with parameters:', error);
      throw error;
    }
  }
}