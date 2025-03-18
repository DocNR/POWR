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
  
  // Add this updated method to the NostrIntegration class

  getTemplateExerciseRefs(templateEvent: NDKEvent): string[] {
    const exerciseTags = templateEvent.getMatchingTags('exercise');
    const exerciseRefs: string[] = [];
    
    for (const tag of exerciseTags) {
      if (tag.length < 2) continue;
      
      let ref = tag[1];
      
      // Build a complete reference that includes relay hints
      const relayHints: string[] = [];
      
      // Check for relay hints in the main reference (if it has commas)
      if (ref.includes(',')) {
        const [baseRef, ...hints] = ref.split(',');
        ref = baseRef;
        hints.filter(h => h.startsWith('wss://')).forEach(h => relayHints.push(h));
      }
      
      // Also check for relay hints in the tag itself (additional elements)
      for (let i = 2; i < tag.length; i++) {
        if (tag[i].startsWith('wss://')) {
          relayHints.push(tag[i]);
        }
      }
      
      // Add parameters if available
      let fullRef = ref;
      
      // Check if params start after tag[1]
      if (tag.length > 2 && !tag[2].startsWith('wss://')) {
        let paramStart = 2;
        
        // Find all non-relay parameters
        const params: string[] = [];
        for (let i = paramStart; i < tag.length; i++) {
          if (!tag[i].startsWith('wss://')) {
            params.push(tag[i]);
          }
        }
        
        if (params.length > 0) {
          // Add parameters with "::" separator
          fullRef += `::${params.join(':')}`;
        }
      }
      
      // Reconstruct the reference with relay hints
      if (relayHints.length > 0) {
        fullRef += `,${relayHints.join(',')}`;
      }
      
      exerciseRefs.push(fullRef);
      console.log(`Extracted reference from template: ${fullRef}`);
    }
    
    return exerciseRefs;
  }

  // Add this updated method to the NostrIntegration class

  async findExercisesByNostrReference(refs: string[]): Promise<Map<string, string>> {
    try {
      const result = new Map<string, string>();
      
      for (const ref of refs) {
        // Split the reference to separate the base reference from relay hints
        const [baseRefWithParams, ...relayHints] = ref.split(',');
        
        // Further split to get the basic reference and parameters
        let baseRef = baseRefWithParams;
        if (baseRefWithParams.includes('::')) {
          baseRef = baseRefWithParams.split('::')[0];
        }
        
        const refParts = baseRef.split(':');
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
        
        // If not found, try matching by Nostr event ID
        if (!exercise) {
          exercise = await this.db.getFirstAsync<{ id: string }>(
            `SELECT id FROM exercises WHERE nostr_event_id = ?`,
            [refDTag]
          );
        }
        
        // If still not found, try a direct ID match (in case dTag is an event ID)
        if (!exercise) {
          exercise = await this.db.getFirstAsync<{ id: string }>(
            `SELECT id FROM exercises WHERE nostr_event_id = ?`,
            [refDTag]
          );
        }
        
        if (exercise) {
          result.set(ref, exercise.id);
          console.log(`Matched exercise reference ${ref} to local ID ${exercise.id}`);
          
          // Also store the base reference for easier future lookup
          result.set(baseRef, exercise.id);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error finding exercises by Nostr reference:', error);
      return new Map();
    }
  }
  
  // Add this method to the NostrIntegration class

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
      
      // Get relay hints from the event if available
      const relayHints: string[] = [];
      if (originalEvent) {
        originalEvent.getMatchingTags('r').forEach(tag => {
          if (tag.length > 1 && tag[1].startsWith('wss://')) {
            relayHints.push(tag[1]);
          }
        });
      }
      
      // Store the d-tag and relay hints in metadata
      const nostrMetadata = JSON.stringify({
        pubkey: originalEvent?.pubkey || exercise.availability?.lastSynced?.nostr?.metadata?.pubkey,
        dTag: dTag,
        eventId: nostrEventId,
        relays: relayHints
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
      console.log(`=== SAVING TEMPLATE EXERCISES ===`);
      console.log(`Template ID: ${templateId}`);
      console.log(`Exercise IDs (${exerciseIds.length}):`, exerciseIds);
      console.log(`Exercise Refs (${exerciseRefs.length}):`, exerciseRefs);
      
      // Check if nostr_reference column exists
      const hasNostrReference = await this.columnExists('template_exercises', 'nostr_reference');
      
      if (!hasNostrReference) {
        console.log("Adding nostr_reference column to template_exercises table");
        await this.db.execAsync(`ALTER TABLE template_exercises ADD COLUMN nostr_reference TEXT`);
      }
      
      // Check if relay_hints column exists
      const hasRelayHints = await this.columnExists('template_exercises', 'relay_hints');
      
      if (!hasRelayHints) {
        console.log("Adding relay_hints column to template_exercises table");
        await this.db.execAsync(`ALTER TABLE template_exercises ADD COLUMN relay_hints TEXT`);
      }
      
      // Clear out any existing entries for this template
      await this.db.runAsync(
        `DELETE FROM template_exercises WHERE template_id = ?`,
        [templateId]
      );
      
      // Create template exercise records
      for (let i = 0; i < exerciseIds.length; i++) {
        const exerciseId = exerciseIds[i];
        const templateExerciseId = generateId();
        const now = Date.now();
        
        // Get the corresponding exercise reference with parameters
        const exerciseRef = exerciseRefs[i] || '';
        console.log(`Processing reference: ${exerciseRef}`);
        
        // Extract relay hints from the reference
        const parts = exerciseRef.split(',');
        const baseRefWithParams = parts[0]; // This might include ::params
        const relayHints = parts.slice(1).filter(r => r.startsWith('wss://'));
        
        // Parse the reference format: kind:pubkey:d-tag::sets:reps:weight
        let targetSets = null;
        let targetReps = null;
        let targetWeight = null;
        let setType = null;
        
        // Check if reference contains parameters
        if (baseRefWithParams.includes('::')) {
          const [_, paramString] = baseRefWithParams.split('::');
          const params = paramString.split(':');
          
          if (params.length > 0) targetSets = params[0] ? parseInt(params[0]) : null;
          if (params.length > 1) targetReps = params[1] ? parseInt(params[1]) : null;
          if (params.length > 2) targetWeight = params[2] ? parseFloat(params[2]) : null;
          if (params.length > 3) setType = params[3] || null;
          
          console.log(`Parsed parameters: sets=${targetSets}, reps=${targetReps}, weight=${targetWeight}, type=${setType}`);
        }
        
        // Store relay hints in JSON
        const relayHintsJson = relayHints.length > 0 ? JSON.stringify(relayHints) : null;
        
        await this.db.runAsync(
          `INSERT INTO template_exercises 
          (id, template_id, exercise_id, display_order, target_sets, target_reps, target_weight, created_at, updated_at
            ${hasNostrReference ? ', nostr_reference' : ''}${hasRelayHints ? ', relay_hints' : ''}) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?${hasNostrReference ? ', ?' : ''}${hasRelayHints ? ', ?' : ''})`,
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
            ...(hasNostrReference ? [exerciseRef] : []),
            ...(hasRelayHints ? [relayHintsJson] : [])
          ]
        );
        
        console.log(`Saved template-exercise relationship: template=${templateId}, exercise=${exerciseId} with ${relayHints.length} relay hints`);
      }
      
      // Verify the relationships were saved
      const savedRelationships = await this.db.getAllAsync<{id: string, exercise_id: string}>(
        `SELECT id, exercise_id FROM template_exercises WHERE template_id = ?`,
        [templateId]
      );
      
      console.log(`Saved ${savedRelationships.length} template-exercise relationships for template ${templateId}`);
      savedRelationships.forEach(rel => console.log(`  - Exercise ID: ${rel.exercise_id}`));
      console.log(`=== END SAVING TEMPLATE EXERCISES ===`);
    } catch (error) {
      console.error('Error saving template exercises with parameters:', error);
      throw error;
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