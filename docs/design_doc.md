# POWR Database Implementation PRD

## Problem Statement
POWR requires a robust SQLite database implementation that enables local-first fitness tracking while supporting future Nostr protocol integration. The database must efficiently handle exercise definitions (NIP-33401), workout templates (NIP-33402), and workout records (NIP-33403) while maintaining a clean separation between local storage needs and Nostr protocol compatibility.

## Requirements

### Functional Requirements
- Store and process exercise definitions with complete metadata
- Support workout template creation and management
- Track workout records and performance history
- Enable efficient content querying and filtering
- Handle both local and Nostr-sourced content seamlessly 
- Support offline-first operations with sync capabilities
- Manage template dependencies and incomplete references
- Track exercise history and performance metrics
- Support batch operations and migrations

### Non-Functional Requirements
- Query response time < 100ms for common operations
- Support concurrent read/write operations safely
- Minimize memory usage through efficient caching
- Maintain data integrity across sync operations
- Scale to handle 1000+ exercises and 100+ templates
- Support incremental sync with Nostr relays
- Ensure consistent performance on mobile devices
- Support automated testing and validation

## Design Decisions

### 1. Storage Architecture
Use a dual storage approach with separate tables for raw events and processed data:

Rationale:
- Maintains perfect relay replication capability
- Enables efficient local querying
- Supports dependency tracking
- Facilitates future sync operations
- Allows for flexible schema evolution

### 2. Cache Management
Implement an LRU cache system with configurable limits:

Rationale:
- Improves read performance for common queries
- Manages memory usage effectively
- Supports write buffering for batch operations
- Provides tunable performance controls

### 3. Schema Design
Use a normalized schema with proper constraints and indexing:

Rationale:
- Ensures data integrity
- Enables efficient querying
- Supports future extensions
- Maintains clear relationships

## Technical Design

### Core Schema
```sql
-- Schema Version
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  updated_at INTEGER NOT NULL
);

-- Raw Events
CREATE TABLE nostr_events (
  id TEXT PRIMARY KEY,
  kind INTEGER NOT NULL,
  pubkey TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  content TEXT,
  raw_event TEXT NOT NULL,
  source TEXT DEFAULT 'local'
);

-- Processed Exercises 
CREATE TABLE exercise_definitions (
  event_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT,
  description TEXT,
  format_json TEXT,
  format_units_json TEXT,
  FOREIGN KEY(event_id) REFERENCES nostr_events(id)
);

-- Templates
CREATE TABLE workout_templates (
  event_id TEXT PRIMARY KEY, 
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  rounds INTEGER,
  duration INTEGER,
  interval_time INTEGER,
  rest_between_rounds INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(event_id) REFERENCES nostr_events(id)
);
```

### Core Components

```typescript
interface DbService {
  // Core database operations
  executeSql(sql: string, params?: any[]): Promise<SQLiteResult>;
  withTransaction<T>(operation: () => Promise<T>): Promise<T>;
  
  // Migration handling
  getCurrentVersion(): Promise<number>;
  migrate(targetVersion?: number): Promise<void>;
}

interface CacheManager {
  // Cache configuration
  maxExercises: number;
  maxTemplates: number;
  writeBufferSize: number;
  
  // Cache operations
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  invalidate(key: string): Promise<void>;
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. Set up base schema and migrations
2. Implement DbService class
3. Add basic CRUD operations
4. Create test infrastructure

### Phase 2: Cache Layer (Week 2-3)
1. Implement CacheManager
2. Add LRU caching
3. Configure write buffering
4. Add cache invalidation

### Phase 3: Query Layer (Week 3-4)
1. Build query builders
2. Implement common queries
3. Add search functionality
4. Optimize performance

### Phase 4: Nostr Integration (Week 4-5)
1. Add event processing
2. Implement sync logic
3. Handle dependencies
4. Add relay management

## Testing Strategy

### Unit Tests
- Schema creation and migrations
- CRUD operations for all entities
- Cache operations and invalidation
- Query builder functions

### Integration Tests
- End-to-end workflow testing
- Template dependency handling
- Sync operations
- Performance benchmarks

### Performance Tests
- Query response times
- Cache hit rates
- Write operation latency
- Memory usage patterns

## Observability

### Logging
- Schema migrations
- Cache operations
- Query performance
- Error conditions

### Metrics
- Query response times
- Cache hit/miss rates
- Database size
- Operation counts

## Future Considerations

### Potential Enhancements
- Advanced caching strategies
- Full-text search
- Data compression
- Cloud backup options

### Known Limitations
- SQLite concurrent access
- Initial sync performance
- Cache memory constraints
- Platform-specific issues

## Dependencies

### Runtime Dependencies
- expo-sqlite
- @react-native-async-storage/async-storage
- NDK (future)

### Development Dependencies
- Jest
- TypeScript
- SQLite development tools

## Security Considerations
- Input validation
- Query parameterization
- Event signature verification
- Access control

## References
- NDK SQLite Implementation
- Nostr NIP-01 Specification 
- POWR Exercise NIP Draft
- React Native SQLite Documentation