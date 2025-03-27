# POWR Pack Implementation Plan

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Workout Templates, Exercises, Nostr Integration

## Purpose

This document outlines the detailed implementation plan for the POWR Pack feature, focusing on both immediate technical solutions and longer-term architectural improvements. It serves as a guide for developers implementing and extending the feature.

## Current Status Assessment

Based on the current implementation of POWR Packs, several areas need attention:

1. **Template-Exercise Relationships**: Templates are being imported but not properly linked to their associated exercises
2. **Parameter Extraction**: The system needs improvement in parsing parameters from exercise references
3. **Future Extensibility**: The current approach should support future changes to the NIP-4e specification
4. **Template Management**: Tools for template archiving and deletion need enhancement

## Implementation Phases

### Phase 1: Core Functionality (Implemented)

The basic functionality of POWR Packs has been implemented, including:

1. **Database Schema**: Tables to track imported packs and their contents
2. **POWRPackService**: Service for fetching packs from Nostr and importing them
3. **Import UI**: Interface for users to input `naddr1` links and select content to import
4. **Management UI**: Interface for viewing and deleting imported packs

### Phase 2: Technical Enhancements

#### Schema Extensions

```sql
-- POWR Packs table
CREATE TABLE powr_packs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  author_pubkey TEXT,
  nostr_event_id TEXT,
  import_date INTEGER NOT NULL
);

-- POWR Pack items table
CREATE TABLE powr_pack_items (
  pack_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_order INTEGER,
  is_imported BOOLEAN NOT NULL DEFAULT 1,
  PRIMARY KEY (pack_id, item_id),
  FOREIGN KEY (pack_id) REFERENCES powr_packs(id) ON DELETE CASCADE
);

-- Template extensions
ALTER TABLE templates ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE templates ADD COLUMN author_pubkey TEXT;
ALTER TABLE templates ADD COLUMN workout_type_config TEXT;

-- Template exercise extensions
ALTER TABLE template_exercises ADD COLUMN params_json TEXT;
```

#### Template-Exercise Relationship Improvements

The implementation needs to properly handle the relationship between templates and exercises:

```typescript
// Find matching exercises based on Nostr references
function matchExerciseReferences(exercises: NDKEvent[], exerciseRefs: string[]): Map<string, string> {
  const matchMap = new Map<string, string>();
  
  for (const ref of exerciseRefs) {
    // Extract the base reference (before any parameters)
    const refParts = ref.split('::');
    const baseRef = refParts[0];
    
    // Parse the reference format: kind:pubkey:d-tag
    const refSegments = baseRef.split(':');
    if (refSegments.length < 3) continue;
    
    const refKind = refSegments[0];
    const refPubkey = refSegments[1];
    const refDTag = refSegments[2];
    
    // Find the event that matches by d-tag
    const matchingEvent = exercises.find(e => {
      const dTag = findTagValue(e.tags, 'd');
      return dTag === refDTag && e.pubkey === refPubkey;
    });
    
    if (matchingEvent) {
      matchMap.set(ref, matchingEvent.id);
    }
  }
  
  return matchMap;
}
```

#### Parameter Extraction

The system needs to properly extract parameters from exercise references:

```typescript
// Extract parameters from exercise reference
function extractParameters(exerciseRef: string): Record<string, any> {
  const parameters: Record<string, any> = {};
  
  // If no reference with parameters, return empty object
  if (!exerciseRef || !exerciseRef.includes('::')) {
    return parameters;
  }
  
  const [baseRef, paramString] = exerciseRef.split('::');
  if (!paramString) return parameters;
  
  const paramValues = paramString.split(':');
  
  // Map parameters to standard names
  if (paramValues.length > 0) parameters.target_sets = parseInt(paramValues[0]) || null;
  if (paramValues.length > 1) parameters.target_reps = parseInt(paramValues[1]) || null;
  if (paramValues.length > 2) parameters.target_weight = parseFloat(paramValues[2]) || null;
  if (paramValues.length > 3) parameters.set_type = paramValues[3];
  
  return parameters;
}
```

#### Template Management

Enhanced template management functions:

```typescript
// Archive/unarchive a template
async function archiveTemplate(id: string, archive: boolean = true): Promise<void> {
  await db.runAsync(
    'UPDATE templates SET is_archived = ? WHERE id = ?',
    [archive ? 1 : 0, id]
  );
}

// Remove a template from the library
async function removeTemplateFromLibrary(id: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    // Delete template-exercise relationships
    await db.runAsync(
      'DELETE FROM template_exercises WHERE template_id = ?',
      [id]
    );
    
    // Delete template
    await db.runAsync(
      'DELETE FROM templates WHERE id = ?',
      [id]
    );
    
    // Update powr_pack_items to mark as not imported
    await db.runAsync(
      'UPDATE powr_pack_items SET is_imported = 0 WHERE item_id = ? AND item_type = "template"',
      [id]
    );
  });
}
```

### Phase 3: Extensibility Improvements

To support future extensions to the NIP-4e specification, the implementation should include:

#### 1. Flexible Parameter Handling

Create a parameter mapper service that can dynamically handle different parameter formats:

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
      }
    }
    
    // Default parameter mapping if no format or error parsing
    if (paramValues.length > 0) parameters.target_sets = parseInt(paramValues[0]) || null;
    if (paramValues.length > 1) parameters.target_reps = parseInt(paramValues[1]) || null;
    if (paramValues.length > 2) parameters.target_weight = parseFloat(paramValues[2]) || null;
    if (paramValues.length > 3) parameters.set_type = paramValues[3];
    
    return parameters;
  }
}
```

#### 2. Workout Type-Specific Handling

Create processors for different workout types to handle their specific data needs:

```typescript
// Interface for workout type processors
interface WorkoutTypeProcessor {
  parseTemplateConfig(tags: string[][]): Record<string, any>;
  getDefaultParameters(): Record<string, any>;
  formatTemplateConfig(config: Record<string, any>): string[][];
}

// Factory for creating workout type processors
class WorkoutTypeFactory {
  static createProcessor(type: string): WorkoutTypeProcessor {
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
```

### Phase 4: Future Architecture

For longer-term development, consider implementing:

#### 1. Modular Event Processor Architecture

```typescript
// Interface for event processors
interface NostrEventProcessor<T> {
  // Check if processor can handle this event
  canProcess(event: NostrEvent): boolean;
  
  // Process event to local model
  processEvent(event: NostrEvent): T;
  
  // Convert local model to event
  createEvent(model: T): NostrEvent;
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

#### 2. Version-Aware Adapters

```typescript
// Adapter for Nostr protocol versions
interface NostrProtocolAdapter {
  // Get exercise from event
  getExerciseFromEvent(event: NostrEvent): Exercise;
  
  // Get template from event
  getTemplateFromEvent(event: NostrEvent): WorkoutTemplate;
  
  // Create events from local models
  createExerciseEvent(exercise: Exercise): NostrEvent;
  createTemplateEvent(template: WorkoutTemplate): NostrEvent;
}
```

## UI Components

### Import Screen

The import screen should include:

1. Input field for `naddr1` links
2. Pack details display (title, description, author)
3. Selectable list of templates with thumbnails
4. Selectable list of exercises with auto-selection based on template dependencies
5. Import button with count of selected items

### Management Screen

The management screen should include:

1. List of imported packs with:
   - Pack title and description
   - Author information with avatar
   - Number of templates and exercises
   - Import date
   - Delete button with confirmation dialog

### Social Discovery

The social tab should include a POWR Packs section with:

1. Horizontal scrolling list of available packs
2. Pack cards with:
   - Pack title and thumbnail
   - Author information
   - Brief description
   - "View Details" button

## Testing Strategy

### Unit Tests

1. Test template-exercise relationship mapping
2. Test parameter extraction and formatting
3. Test template management functions
4. Test pack importing and deletion

### Integration Tests

1. Test end-to-end importing flow with mock Nostr events
2. Test dependency handling when selecting templates
3. Test social discovery functionality

### User Acceptance Tests

1. Test import flow with real Nostr packs
2. Test management interface with multiple imported packs
3. Test error handling with invalid `naddr1` links

## Implementation Timeline

1. **Phase 1 (Complete)**: Core functionality implementation
2. **Phase 2 (Weeks 1-2)**: Technical enhancements
   - Fix template-exercise relationship
   - Improve parameter extraction
   - Enhance template management
3. **Phase 3 (Weeks 3-4)**: Extensibility improvements
   - Implement flexible parameter handling
   - Add workout type-specific processing
4. **Phase 4 (Future)**: Advanced architecture
   - Implement modular event processor architecture
   - Develop version-aware adapters

## Related Documentation

- [POWR Pack Overview](./overview.md) - Overview of the POWR Pack feature
- [Nostr Exercise NIP](../../technical/nostr/exercise_nip.md) - Nostr protocol specification for workout data
- [NDK Comprehensive Guide](../../technical/ndk/comprehensive_guide.md) - Guide to using the Nostr Development Kit
