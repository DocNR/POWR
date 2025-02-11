# POWR Database Implementation Design Document

## Problem Statement
Implement a SQLite database that supports local-first fitness tracking while enabling seamless Nostr protocol integration. The system must handle exercise definitions (NIP-33401), workout templates (NIP-33402), and workout records (NIP-33403) while managing event dependencies, caching, and efficient querying.

## Requirements

### Functional Requirements
- Store and process Nostr events (33401, 33402, 33403)
- Handle incomplete workout templates with missing exercise references
- Support both local and Nostr-sourced content
- Enable efficient content querying and filtering
- Track template completeness and dependencies
- Manage event replacements and updates

### Non-Functional Requirements
- Query response time < 100ms
- Support offline-first operations
- Handle concurrent write operations safely
- Efficient storage for device constraints
- Maintain data integrity with event dependencies

## Design Decisions

### 1. Event Storage Strategy
Store both raw Nostr events and processed data:
- Raw events for perfect relay replication
- Processed data for efficient querying
- Separate incomplete template tracking
- Tag indexing for fast lookups

Rationale:
- Maintains Nostr protocol compliance
- Enables efficient local operations
- Supports dependency tracking
- Facilitates sync operations

### 2. Dependency Management
Track missing exercise references:
- Store incomplete templates
- Track missing dependencies
- Enable background fetching
- Allow filtering by completeness

Rationale:
- Better user experience
- Data integrity
- Eventual consistency
- Clear status tracking

## Technical Design

### Core Schema
```typescript
interface DatabaseSchema {
  // Raw Nostr event storage
  nostr_events: {
    id: string;            // 32-bytes hex
    pubkey: string;        // 32-bytes hex
    kind: number;          // 33401 | 33402 | 33403
    raw_event: string;     // Full JSON event
    created_at: number;    // Unix timestamp
    received_at: number;   // Local timestamp
  };

  // Processed exercise definitions
  exercise_definitions: {
    event_id: string;      // Reference to nostr_events
    title: string;
    equipment: string;
    format: string;        // JSON stringified
    format_units: string;  // JSON stringified
  };

  // Template dependency tracking
  incomplete_templates: {
    template_id: string;   // Reference to nostr_events
    missing_exercise_count: number;
    missing_exercises: string;  // JSON stringified
  };

  // Tag indexing
  event_tags: {
    event_id: string;      // Reference to nostr_events
    name: string;          // Tag name
    value: string;         // Tag value
    index: number;         // Position in tag array
  };
}
```

### Event Validators
```typescript
interface EventValidator {
  validateEvent(event: NostrEvent): ValidationResult;
  processEvent(event: NostrEvent): ProcessedEvent;
}

class ExerciseDefinitionValidator implements EventValidator {
  // Implementation for kind 33401
}

class WorkoutTemplateValidator implements EventValidator {
  // Implementation for kind 33402
}
```

## Implementation Plan

### Phase 1: Core Event Handling
1. Basic schema implementation
2. Event validation and processing
3. Tag indexing system
4. Basic CRUD operations

### Phase 2: Template Dependencies
1. Incomplete template tracking
2. Missing exercise handling
3. Background fetching system
4. Template status management

### Phase 3: Query Optimization
1. Implement efficient indexes
2. Query caching system
3. Common query patterns
4. Performance monitoring

## Testing Strategy

### Unit Tests
- Event validation
- Data processing
- CRUD operations
- Tag indexing

### Integration Tests
- Template dependency handling
- Event synchronization
- Cache operations
- Query performance

### Performance Tests
- Query response times
- Write operation latency
- Cache efficiency
- Storage utilization

## Security Considerations
- Event signature validation
- Input sanitization
- Access control
- Data integrity

## Future Considerations

### Potential Enhancements
- Advanced caching strategies
- Relay management
- Batch operations
- Compression options

### Known Limitations
- SQLite concurrent access
- Dependency completeness
- Cache memory constraints
- Initial sync performance

## Dependencies

### Runtime Dependencies
- expo-sqlite
- @react-native-async-storage/async-storage

### Development Dependencies
- Jest for testing
- SQLite tooling
- TypeScript

## Query Examples

### Template Queries
```typescript
// Get templates by author
async getTemplatesByPubkey(
  pubkey: string,
  options: {
    includeIncomplete?: boolean;
    limit?: number;
    since?: number;
  }
): Promise<ProcessedTemplate[]>

// Get template with exercises
async getTemplateWithExercises(
  templateId: string
): Promise<CompleteTemplate>
```

### Exercise Queries
```typescript
// Search exercises
async searchExercises(
  params: SearchParams
): Promise<ProcessedExerciseDefinition[]>

// Get exercise history
async getExerciseHistory(
  exerciseId: string
): Promise<ExerciseHistory[]>
```

## References
- NDK SQLite Implementation
- Nostr NIP-01 Specification
- POWR Exercise NIP Draft
- POWR Library Tab PRD