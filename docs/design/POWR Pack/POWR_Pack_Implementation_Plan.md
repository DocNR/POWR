# Updated POWR Pack Integration Plan

## Current Status Assessment

Based on the current implementation of POWR Packs, we've identified several issues that need to be addressed:

1. **Missing Template-Exercise Relationships**: Templates are being imported but not properly linked to their associated exercises
2. **Parameter Extraction Issues**: The system isn't correctly parsing parameters from exercise references
3. **Lack of Future Extensibility**: The current approach doesn't adequately support future changes to the NIP-4e specification
4. **Template Management**: Tools for template archiving and deletion are incomplete

## Implementation Plan

This plan outlines both immediate fixes and longer-term improvements for a more extensible architecture.

### Phase 1: Critical Fixes (Immediate)

#### 1. Fix Template-Exercise Relationship

**Problem**: Templates are imported but show 0 exercises because the references aren't correctly matched.

**Solution**:

- Update `POWRPackService.ts` to correctly parse exercise references by d-tag
- Improve the exercise matching logic to use the correct format (`33401:pubkey:d-tag`)
- Add detailed logging for troubleshooting

```typescript
// Find the corresponding imported exercise IDs
const templateExerciseIds: string[] = [];
const matchedRefs: string[] = [];

for (const ref of exerciseRefs) {
  // Extract the base reference (before any parameters)
  const refParts = ref.split('::');
  const baseRef = refParts[0];
  
  console.log(`Looking for matching exercise for reference: ${baseRef}`);
  
  // Parse the reference format: kind:pubkey:d-tag
  const refSegments = baseRef.split(':');
  if (refSegments.length < 3) {
    console.log(`Invalid reference format: ${baseRef}`);
    continue;
  }
  
  const refKind = refSegments[0];
  const refPubkey = refSegments[1];
  const refDTag = refSegments[2];
  
  // Find the event that matches by d-tag
  const matchingEvent = exercises.find(e => {
    const dTag = findTagValue(e.tags, 'd');
    if (!dTag || e.pubkey !== refPubkey) return false;
    
    const match = dTag === refDTag;
    if (match) {
      console.log(`Found matching event: ${e.id} with d-tag: ${dTag}`);
    }
    
    return match;
  });
  
  if (matchingEvent && exerciseIdMap.has(matchingEvent.id)) {
    const localExerciseId = exerciseIdMap.get(matchingEvent.id) || '';
    templateExerciseIds.push(localExerciseId);
    matchedRefs.push(ref); // Keep the full reference including parameters
    
    console.log(`Mapped Nostr event ${matchingEvent.id} to local exercise ID ${localExerciseId}`);
  } else {
    console.log(`No matching exercise found for reference: ${baseRef}`);
  }
}
```

#### 2. Fix Parameter Extraction in NostrIntegration.ts

**Problem**: Parameter values from exercise references aren't being properly extracted.

**Solution**:

```typescript
async saveTemplateExercisesWithParams(
  templateId: string, 
  exerciseIds: string[], 
  exerciseRefs: string[]
): Promise<void> {
  try {
    console.log(`Saving ${exerciseIds.length} exercise relationships for template ${templateId}`);
    
    // Create template exercise records
    for (let i = 0; i < exerciseIds.length; i++) {
      const exerciseId = exerciseIds[i];
      const templateExerciseId = generateId();
      const now = Date.now();
      
      // Get the corresponding exercise reference with parameters
      const exerciseRef = exerciseRefs[i] || '';
      
      // Parse the reference format: kind:pubkey:d-tag::sets:reps:weight
      let targetSets = null;
      let targetReps = null;
      let targetWeight = null;
      
      // Check if reference contains parameters
      if (exerciseRef.includes('::')) {
        const parts = exerciseRef.split('::');
        if (parts.length > 1) {
          const params = parts[1].split(':');
          if (params.length > 0 && params[0]) targetSets = parseInt(params[0]) || null;
          if (params.length > 1 && params[1]) targetReps = parseInt(params[1]) || null;
          if (params.length > 2 && params[2]) targetWeight = parseFloat(params[2]) || null;
        }
      }
      
      console.log(`Template exercise ${i}: ${exerciseId} with sets=${targetSets}, reps=${targetReps}, weight=${targetWeight}`);
      
      await this.db.runAsync(
        `INSERT INTO template_exercises 
         (id, template_id, exercise_id, display_order, target_sets, target_reps, target_weight, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          templateExerciseId,
          templateId,
          exerciseId,
          i,
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
```

#### 3. Add Template Management Functions

**Problem**: Need better tools for template archiving and deletion.

**Solution**:

- Add an `is_archived` column to templates table
- Create archive/unarchive functions
- Implement safe template removal with dependency handling

```typescript
// Schema update
await db.execAsync(`
  ALTER TABLE templates ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0;
  ALTER TABLE templates ADD COLUMN author_pubkey TEXT;
`);

// Template management functions
async archiveTemplate(id: string, archive: boolean = true): Promise<void> {
  await this.db.runAsync(
    'UPDATE templates SET is_archived = ? WHERE id = ?',
    [archive ? 1 : 0, id]
  );
}

async removeFromLibrary(id: string): Promise<void> {
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
}
```

### Phase 2: Extensibility Improvements (Short-term)

#### 1. Schema Updates for Extensibility

**Problem**: Schema is too rigid for future extensions to exercise parameters and workout types.

**Solution**:

```typescript
// Add schema update in a migration file or update schema.ts
async function addExtensibilityColumns(db: SQLiteDatabase): Promise<void> {
  // Add params_json to template_exercises for extensible parameters
  await db.execAsync(`
    ALTER TABLE template_exercises ADD COLUMN params_json TEXT;
  `);
  
  // Add workout_type_config to templates for type-specific configurations
  await db.execAsync(`
    ALTER TABLE templates ADD COLUMN workout_type_config TEXT;
  `);
}
```

#### 2. Flexible Parameter Extraction

**Problem**: Current parameter extraction is hardcoded for a limited set of parameters.

**Solution**:

- Create a parameter mapper service
- Implement dynamic parameter extraction based on exercise format

```typescript
class ExerciseParameterMapper {
  // Extract parameters from a Nostr reference based on exercise format
  static extractParameters(exerciseRef: string, formatJson?: string): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    // If no reference with parameters, return empty object
    if (!exerciseRef || !exerciseRef.includes('::')) {
      return parameters;
    }
    
    const [baseRef, paramString] = exerciseRef.split('::');
    if (!paramString) return parameters;
    
    const paramValues = paramString.split(':');
    
    // If we have format information, use it to map parameters
    if (formatJson) {
      try {
        const format = JSON.parse(formatJson);
        const formatKeys = Object.keys(format).filter(key => format[key] === true);
        
        formatKeys.forEach((key, index) => {
          if (index < paramValues.length && paramValues[index]) {
            // Convert value to appropriate type based on parameter name
            if (key === 'weight') {
              parameters[key] = parseFloat(paramValues[index]) || null;
            } else if (['reps', 'sets', 'duration'].includes(key)) {
              parameters[key] = parseInt(paramValues[index]) || null;
            } else {
              // For other parameters, keep as string
              parameters[key] = paramValues[index];
            }
          }
        });
        
        return parameters;
      } catch (error) {
        console.warn('Error parsing format JSON:', error);
        // Fall back to default mapping below
      }
    }
    
    // Default parameter mapping if no format or error parsing
    if (paramValues.length > 0) parameters.target_sets = parseInt(paramValues[0]) || null;
    if (paramValues.length > 1) parameters.target_reps = parseInt(paramValues[1]) || null;
    if (paramValues.length > 2) parameters.target_weight = parseFloat(paramValues[2]) || null;
    if (paramValues.length > 3) parameters.set_type = paramValues[3];
    
    return parameters;
  }
  
  // Convert parameters back to Nostr reference format
  static formatParameters(parameters: Record<string, any>, formatJson?: string): string {
    if (!Object.keys(parameters).length) return '';
    
    let paramArray: (string | number | null)[] = [];
    
    // If we have format information, use it for parameter ordering
    if (formatJson) {
      try {
        const format = JSON.parse(formatJson);
        const formatKeys = Object.keys(format).filter(key => format[key] === true);
        
        paramArray = formatKeys.map(key => parameters[key] ?? '');
      } catch (error) {
        console.warn('Error parsing format JSON:', error);
        // Fall back to default format below
      }
    }
    
    // Default parameter format if no format JSON or error parsing
    if (!paramArray.length) {
      paramArray = [
        parameters.target_sets ?? parameters.sets ?? '',
        parameters.target_reps ?? parameters.reps ?? '',
        parameters.target_weight ?? parameters.weight ?? '',
        parameters.set_type ?? ''
      ];
    }
    
    // Trim trailing empty values
    while (paramArray.length > 0 && 
           (paramArray[paramArray.length - 1] === '' || 
            paramArray[paramArray.length - 1] === null)) {
      paramArray.pop();
    }
    
    // If no parameters left, return empty string
    if (!paramArray.length) return '';
    
    // Join parameters with colon
    return paramArray.join(':');
  }
}
```

#### 3. Workout Type-Specific Handling

**Problem**: Different workout types (AMRAP, EMOM, circuit, strength) have specific data needs.

**Solution**:

- Create workout type processors
- Implement template service enhancements for type-specific configurations

```typescript
// WorkoutTypesService.ts
import { WorkoutTemplate, TemplateType } from '@/types/templates';

// Factory pattern for creating workout type processors
export class WorkoutTypeFactory {
  static createProcessor(type: TemplateType): WorkoutTypeProcessor {
    switch (type) {
      case 'strength':
        return new StrengthWorkoutProcessor();
      case 'circuit':
        return new CircuitWorkoutProcessor();
      case 'emom':
        return new EMOMWorkoutProcessor();
      case 'amrap':
        return new AMRAPWorkoutProcessor();
      default:
        return new DefaultWorkoutProcessor();
    }
  }
}

// Interface for workout type processors
export interface WorkoutTypeProcessor {
  parseTemplateConfig(tags: string[][]): Record<string, any>;
  getDefaultParameters(): Record<string, any>;
  formatTemplateConfig(config: Record<string, any>): string[][];
}

// Example implementation for EMOM workouts
class EMOMWorkoutProcessor implements WorkoutTypeProcessor {
  parseTemplateConfig(tags: string[][]): Record<string, any> {
    const config: Record<string, any> = {
      type: 'emom',
      rounds: 0,
      interval: 60, // Default 60 seconds
      rest: 0
    };
    
    // Extract rounds (total number of intervals)
    const roundsTag = tags.find(t => t[0] === 'rounds');
    if (roundsTag && roundsTag.length > 1) {
      config.rounds = parseInt(roundsTag[1]) || 0;
    }
    
    // Extract interval duration
    const intervalTag = tags.find(t => t[0] === 'interval');
    if (intervalTag && intervalTag.length > 1) {
      config.interval = parseInt(intervalTag[1]) || 60;
    }
    
    // Extract rest between rounds
    const restTag = tags.find(t => t[0] === 'rest_between_rounds');
    if (restTag && restTag.length > 1) {
      config.rest = parseInt(restTag[1]) || 0;
    }
    
    return config;
  }
  
  getDefaultParameters(): Record<string, any> {
    return {
      rounds: 10,
      interval: 60,
      rest: 0
    };
  }
  
  formatTemplateConfig(config: Record<string, any>): string[][] {
    const tags: string[][] = [];
    
    if (config.rounds) {
      tags.push(['rounds', config.rounds.toString()]);
    }
    
    if (config.interval) {
      tags.push(['interval', config.interval.toString()]);
    }
    
    if (config.rest) {
      tags.push(['rest_between_rounds', config.rest.toString()]);
    }
    
    return tags;
  }
}
```

### Phase 3: Long-Term Architecture (Future)

#### 1. Modular Event Processor Architecture

**Problem**: Need a more adaptable system for handling evolving Nostr event schemas.

**Solution**:

- Create a plugin-based architecture for event processors
- Implement versioning for Nostr event handling
- Design a flexible mapping system between Nostr events and local database schema

```typescript
// Interface for event processors
interface NostrEventProcessor<T> {
  // Check if processor can handle this event
  canProcess(event: NostrEvent): boolean;
  
  // Process event to local model
  processEvent(event: NostrEvent): T;
  
  // Convert local model to event
  createEvent(model: T): NostrEvent;
  
  // Get processor version
  getVersion(): string;
}

// Registry for event processors
class EventProcessorRegistry {
  private processors: Map<number, NostrEventProcessor<any>[]> = new Map();
  
  // Register a processor for a specific kind
  registerProcessor(kind: number, processor: NostrEventProcessor<any>): void {
    if (!this.processors.has(kind)) {
      this.processors.set(kind, []);
    }
    
    this.processors.get(kind)?.push(processor);
  }
  
  // Get appropriate processor for an event
  getProcessor<T>(event: NostrEvent): NostrEventProcessor<T> | null {
    const kindProcessors = this.processors.get(event.kind);
    if (!kindProcessors) return null;
    
    // Find the first processor that can process this event
    for (const processor of kindProcessors) {
      if (processor.canProcess(event)) {
        return processor as NostrEventProcessor<T>;
      }
    }
    
    return null;
  }
}
```

#### 2. Schema Migration System

**Problem**: Database schema needs to evolve with Nostr specification changes.

**Solution**:

- Create a versioned migration system
- Implement automatic schema updates
- Track schema versions

```typescript
// Migration interface
interface SchemaMigration {
  version: number;
  up(db: SQLiteDatabase): Promise<void>;
  down(db: SQLiteDatabase): Promise<void>;
}

// Migration runner
class MigrationRunner {
  private migrations: SchemaMigration[] = [];
  
  // Register a migration
  registerMigration(migration: SchemaMigration): void {
    this.migrations.push(migration);
    // Sort migrations by version
    this.migrations.sort((a, b) => a.version - b.version);
  }
  
  // Run migrations up to a specific version
  async migrate(db: SQLiteDatabase, targetVersion: number): Promise<void> {
    // Get current version
    const currentVersion = await this.getCurrentVersion(db);
    
    if (currentVersion < targetVersion) {
      // Run UP migrations
      for (const migration of this.migrations) {
        if (migration.version > currentVersion && migration.version <= targetVersion) {
          await migration.up(db);
          await this.updateVersion(db, migration.version);
        }
      }
    } else if (currentVersion > targetVersion) {
      // Run DOWN migrations
      for (const migration of [...this.migrations].reverse()) {
        if (migration.version <= currentVersion && migration.version > targetVersion) {
          await migration.down(db);
          await this.updateVersion(db, migration.version - 1);
        }
      }
    }
  }
  
  // Helper methods
  private async getCurrentVersion(db: SQLiteDatabase): Promise<number> {
    // Implementation
    return 0;
  }
  
  private async updateVersion(db: SQLiteDatabase, version: number): Promise<void> {
    // Implementation
  }
}
```

#### 3. Future-Proof Integration Patterns

**Problem**: Need to ensure the POWR app can adapt to future Nostr specification changes.

**Solution**:

- Implement adapter pattern for Nostr protocol
- Create abstraction layers for data synchronization
- Design entity mappers for different data versions

```typescript
// Adapter for Nostr protocol versions
interface NostrProtocolAdapter {
  // Get exercise from event
  getExerciseFromEvent(event: NostrEvent): BaseExercise;
  
  // Get template from event
  getTemplateFromEvent(event: NostrEvent): WorkoutTemplate;
  
  // Get workout record from event
  getWorkoutFromEvent(event: NostrEvent): Workout;
  
  // Create events from local models
  createExerciseEvent(exercise: BaseExercise): NostrEvent;
  createTemplateEvent(template: WorkoutTemplate): NostrEvent;
  createWorkoutEvent(workout: Workout): NostrEvent;
}

// Versioned adapter implementation
class NostrProtocolAdapterV1 implements NostrProtocolAdapter {
  // Implementation for first version of NIP-4e
}
```

## Testing Strategy

### Phase 1 (Immediate)

1. Create a test POWR Pack with variety of exercise types and templates
2. Test importing the pack with the updated code
3. Verify that templates contain the correct exercise relationships
4. Validate parameter extraction works correctly

### Phase 2 (Short-term)

1. Create test cases for different workout types (strength, circuit, EMOM, AMRAP)
2. Verify parameter mapping works as expected
3. Test template management functions

### Phase 3 (Long-term)

1. Create comprehensive integration tests
2. Design migration testing framework
3. Implement automated testing for different Nostr protocol versions

## Implementation Timeline

### Phase 1: Critical Fixes
- **Day 1**: Fix template-exercise relationship in `POWRPackService.ts`
- **Day 2**: Fix parameter extraction in `NostrIntegration.ts`
- **Day 3**: Implement template management functions and schema updates
- **Day 4**: Testing and bug fixes

### Phase 2: Extensibility Improvements
- **Week 2**: Implement schema updates and flexible parameter extraction
- **Week 3**: Develop workout type-specific processing
- **Week 4**: UI enhancements and testing

### Phase 3: Long-Term Architecture
- **Future**: Implement as part of broader architectural improvements

## Conclusion

This updated plan addresses both the immediate issues with POWR Pack integration and lays out a path for future extensibility as the Nostr Exercise NIP evolves. By implementing these changes in phases, we can quickly fix the current template-exercise relationship problems while establishing a foundation for more sophisticated features in the future.

The proposed approach balances pragmatism with future-proofing, ensuring that users can immediately benefit from POWR Packs while the system remains adaptable to changes in workout types, exercise parameters, and Nostr protocol specifications.