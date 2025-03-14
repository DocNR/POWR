// lib/db/services/NostrIntegration.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
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
    const title = exerciseEvent.tagValue('title') || 'Unnamed Exercise';
    const equipmentTag = exerciseEvent.tagValue('equipment') || 'barbell';
    const difficultyTag = exerciseEvent.tagValue('difficulty') || '';
    const formatTag = exerciseEvent.getMatchingTags('format');
    const formatUnitsTag = exerciseEvent.getMatchingTags('format_units');
    
    // Get tags
    const tags = exerciseEvent.getMatchingTags('t').map(tag => tag[1]);
    
    // Map equipment to valid type
    const equipment: Equipment = this.mapToValidEquipment(equipmentTag);
    
    // Map to valid exercise type
    const type: ExerciseType = this.mapEquipmentToType(equipment);
    
    // Map to valid category (using first tag if available)
    const category: ExerciseCategory = this.mapToCategory(tags[0] || '');
    
    // Parse format and format_units
    const format: ExerciseFormat = {};
    const formatUnits: ExerciseFormatUnits = {};
    
    if (formatTag.length > 0 && formatUnitsTag.length > 0 && formatTag[0].length > 1 && formatUnitsTag[0].length > 1) {
      // Process format parameters
      for (let i = 1; i < formatTag[0].length; i++) {
        const param = formatTag[0][i];
        const unit = formatUnitsTag[0][i] || '';
        
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
    
    // Get d-tag for identification
    const dTag = exerciseEvent.tagValue('d');
    
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
        lastSynced: {
          nostr: {
            timestamp: Date.now(), // Make sure this is included
            metadata: {
              id: exerciseEvent.id,           // Add this
              pubkey: exerciseEvent.pubkey,
              relayUrl: "",                   // Add this
              created_at: exerciseEvent.created_at || Math.floor(Date.now() / 1000), // Add this
              dTag: dTag || '',
              eventId: exerciseEvent.id
            }
          }
        }
      },
      created_at: exerciseEvent.created_at ? exerciseEvent.created_at * 1000 : Date.now()
    };

    return exercise;
  } // Fixed missing closing brace
  
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
    const title = templateEvent.tagValue('title') || 'Unnamed Template';
    const typeTag = templateEvent.tagValue('type') || 'strength';
    
    // Convert string to valid TemplateType
    const type: TemplateType = 
      (typeTag === 'strength' || typeTag === 'circuit' || 
       typeTag === 'emom' || typeTag === 'amrap') ? 
        typeTag as TemplateType : 'strength';
    
    // Get rounds, duration, interval if available
    const rounds = parseInt(templateEvent.tagValue('rounds') || '0') || undefined;
    const duration = parseInt(templateEvent.tagValue('duration') || '0') || undefined;
    const interval = parseInt(templateEvent.tagValue('interval') || '0') || undefined;
    
    // Get tags
    const tags = templateEvent.getMatchingTags('t').map(tag => tag[1]);
    
    // Map to valid category
    const category: TemplateCategory = this.mapToTemplateCategory(tags[0] || '');
    
    // Create exercises placeholder (will be populated later)
    const exercises: TemplateExerciseConfig[] = [];
    
    // Get d-tag for identification
    const dTag = templateEvent.tagValue('d');
    
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
        source: ['nostr'],
        lastSynced: {
          nostr: {
            timestamp: Date.now(), // Add timestamp
            metadata: {
              id: templateEvent.id, // Fixed: changed from exerciseEvent to templateEvent
              pubkey: templateEvent.pubkey, // Fixed: changed from exerciseEvent to templateEvent
              relayUrl: "",
              created_at: templateEvent.created_at || Math.floor(Date.now() / 1000), // Fixed: changed from exerciseEvent to templateEvent
              dTag: dTag || '',
              eventId: templateEvent.id // Fixed: changed from exerciseEvent to templateEvent
            }
          }
        }
      },
      created_at: templateEvent.created_at ? templateEvent.created_at * 1000 : Date.now(),
      lastUpdated: Date.now(),
      nostrEventId: templateEvent.id,
      authorPubkey: templateEvent.pubkey
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
    const exerciseTags = templateEvent.getMatchingTags('exercise');
    const exerciseRefs: string[] = [];
    
    for (const tag of exerciseTags) {
      if (tag.length > 1) {
        // Get the reference exactly as it appears in the tag
        const ref = tag[1];
        
        // Add parameters if available
        if (tag.length > 2) {
          // Add parameters with "::" separator
          const params = tag.slice(2).join(':');
          exerciseRefs.push(`${ref}::${params}`);
        } else {
          exerciseRefs.push(ref);
        }
        
        // Log the exact reference for debugging
        console.log(`Extracted reference from template: ${exerciseRefs[exerciseRefs.length-1]}`);
      }
    }
    
    return exerciseRefs;
  }
  
  /**
   * Save an imported exercise to the database
   */
  async saveImportedExercise(exercise: BaseExercise, originalEvent?: NDKEvent): Promise<string> {
    try {
      // Convert format objects to JSON strings
      const formatJson = JSON.stringify(exercise.format || {});
      const formatUnitsJson = JSON.stringify(exercise.format_units || {});
      
      // Get the Nostr event ID and d-tag if available
      const nostrEventId = originalEvent?.id || 
                          (exercise.availability?.lastSynced?.nostr?.metadata?.eventId || null);
      
      // Get d-tag for identification (very important for future references)
      const dTag = originalEvent?.tagValue('d') || 
                  (exercise.availability?.lastSynced?.nostr?.metadata?.dTag || null);
      
      // Store the d-tag in a JSON metadata field for easier searching
      const nostrMetadata = JSON.stringify({
        pubkey: originalEvent?.pubkey || exercise.availability?.lastSynced?.nostr?.metadata?.pubkey,
        dTag: dTag,
        eventId: nostrEventId
      });
      
      // Check if nostr_metadata column exists
      const hasNostrMetadata = await this.columnExists('exercises', 'nostr_metadata');
      
      if (!hasNostrMetadata) {
        console.log("Adding nostr_metadata column to exercises table");
        await this.db.execAsync(`ALTER TABLE exercises ADD COLUMN nostr_metadata TEXT`);
      }
      
      await this.db.runAsync(
        `INSERT INTO exercises 
         (id, title, type, category, equipment, description, format_json, format_units_json, 
          created_at, updated_at, source, nostr_event_id${hasNostrMetadata ? ', nostr_metadata' : ''}) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasNostrMetadata ? ', ?' : ''})`,
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
          nostrEventId,
          ...(hasNostrMetadata ? [nostrMetadata] : [])
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
  async saveImportedTemplate(template: WorkoutTemplate, originalEvent?: NDKEvent): Promise<string> {
    try {
      // Get d-tag for identification
      const dTag = originalEvent?.tagValue('d') || 
                  (template.availability?.lastSynced?.nostr?.metadata?.dTag || null);
      
      // Store the d-tag in a JSON metadata field for easier searching
      const nostrMetadata = JSON.stringify({
        pubkey: template.authorPubkey || originalEvent?.pubkey,
        dTag: dTag,
        eventId: template.nostrEventId
      });
      
      // Check if nostr_metadata column exists
      const hasNostrMetadata = await this.columnExists('templates', 'nostr_metadata');
      
      if (!hasNostrMetadata) {
        console.log("Adding nostr_metadata column to templates table");
        await this.db.execAsync(`ALTER TABLE templates ADD COLUMN nostr_metadata TEXT`);
      }
      
      await this.db.runAsync(
        `INSERT INTO templates 
         (id, title, type, description, created_at, updated_at, source, nostr_event_id, author_pubkey, is_archived${hasNostrMetadata ? ', nostr_metadata' : ''}) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?${hasNostrMetadata ? ', ?' : ''})`,
        [
          template.id,
          template.title,
          template.type,
          template.description || '',
          template.created_at,
          template.lastUpdated || Date.now(),
          'nostr',
          template.nostrEventId || null,
          template.authorPubkey || null,
          template.isArchived ? 1 : 0,
          ...(hasNostrMetadata ? [nostrMetadata] : [])
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
      
      // Check if nostr_reference column exists
      const hasNostrReference = await this.columnExists('template_exercises', 'nostr_reference');
      
      if (!hasNostrReference) {
        console.log("Adding nostr_reference column to template_exercises table");
        await this.db.execAsync(`ALTER TABLE template_exercises ADD COLUMN nostr_reference TEXT`);
      }
      
      // Create template exercise records
      for (let i = 0; i < exerciseIds.length; i++) {
        const exerciseId = exerciseIds[i];
        const templateExerciseId = generateId();
        const now = Date.now();
        
        // Get the corresponding exercise reference with parameters
        const exerciseRef = exerciseRefs[i] || '';
        console.log(`Processing reference: ${exerciseRef}`);
        
        // Parse the reference format: kind:pubkey:d-tag::sets:reps:weight
        let targetSets = null;
        let targetReps = null;
        let targetWeight = null;
        let setType = null;
        
        // Check if reference contains parameters
        if (exerciseRef.includes('::')) {
          const [_, paramString] = exerciseRef.split('::');
          const params = paramString.split(':');
          
          if (params.length > 0) targetSets = params[0] ? parseInt(params[0]) : null;
          if (params.length > 1) targetReps = params[1] ? parseInt(params[1]) : null;
          if (params.length > 2) targetWeight = params[2] ? parseFloat(params[2]) : null;
          if (params.length > 3) setType = params[3] || null;
          
          console.log(`Parsed parameters: sets=${targetSets}, reps=${targetReps}, weight=${targetWeight}, type=${setType}`);
        }
        
        await this.db.runAsync(
          `INSERT INTO template_exercises 
           (id, template_id, exercise_id, display_order, target_sets, target_reps, target_weight, created_at, updated_at${hasNostrReference ? ', nostr_reference' : ''}) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${hasNostrReference ? ', ?' : ''})`,
          [
            templateExerciseId,
            templateId,
            exerciseId,
            i,
            targetSets,
            targetReps,
            targetWeight,
            now,
            now,
            ...(hasNostrReference ? [exerciseRef] : [])
          ]
        );
        
        console.log(`Saved template-exercise relationship: template=${templateId}, exercise=${exerciseId}`);
      }
      
      console.log(`Successfully saved ${exerciseIds.length} template-exercise relationships for template ${templateId}`);
    } catch (error) {
      console.error('Error saving template exercises with parameters:', error);
      throw error;
    }
  }
  
  /**
   * Find exercises by Nostr reference
   * This method helps match references in templates to actual exercises
   */
  async findExercisesByNostrReference(refs: string[]): Promise<Map<string, string>> {
    try {
      const result = new Map<string, string>();
      
      for (const ref of refs) {
        const refParts = ref.split('::')[0].split(':');
        if (refParts.length < 3) continue;
        
        const refKind = refParts[0];
        const refPubkey = refParts[1];
        const refDTag = refParts[2];
        
        // Try to find by d-tag and pubkey in nostr_metadata if available
        const hasNostrMetadata = await this.columnExists('exercises', 'nostr_metadata');
        
        let exercise = null;
        
        if (hasNostrMetadata) {
          exercise = await this.db.getFirstAsync<{ id: string }>(
            `SELECT id FROM exercises WHERE 
             JSON_EXTRACT(nostr_metadata, '$.pubkey') = ? AND 
             JSON_EXTRACT(nostr_metadata, '$.dTag') = ?`,
            [refPubkey, refDTag]
          );
        }
        
        // Fallback: try to match by event ID
        if (!exercise) {
          exercise = await this.db.getFirstAsync<{ id: string }>(
            `SELECT id FROM exercises WHERE nostr_event_id = ?`,
            [refDTag]
          );
        }
        
        if (exercise) {
          result.set(ref, exercise.id);
          console.log(`Matched exercise reference ${ref} to local ID ${exercise.id}`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error finding exercises by Nostr reference:', error);
      return new Map();
    }
  }
  
  /**
   * Check if a column exists in a table
   */
  private async columnExists(table: string, column: string): Promise<boolean> {
    try {
      const result = await this.db.getAllAsync<{ name: string }>(
        `PRAGMA table_info(${table})`
      );
      
      return result.some(col => col.name === column);
    } catch (error) {
      console.error(`Error checking if column ${column} exists in table ${table}:`, error);
      return false;
    }
  }
}