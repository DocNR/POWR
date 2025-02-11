# POWR Database Implementation PRD

## Problem Statement
Implement a local-first SQLite database that efficiently handles single-user fitness tracking while enabling seamless Nostr protocol integration through NDK. The system must handle exercise definitions (NIP-33401), workout templates (NIP-33402), and workout records (NIP-33403) while optimizing local performance and maintaining decentralized sync capabilities.

## Core Requirements

### 1. Local-First Database
- SQLite database optimized for single-user access
- Efficient schema for workout tracking
- Media content storage for exercise demos
- Strong data consistency
- Performant query patterns

### 2. Nostr Integration
- NDK-compatible event handling
- Raw event storage with validation
- Template dependency management
- Tag-based indexing
- Event replacements and updates

### 3. Performance Features
- LRU cache for frequent content
- Blob storage for media
- Query optimization
- Background sync
- Efficient indexing

## Technical Design

### Core Schema
```sql
-- Version tracking - keeps track of the database versioin
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  updated_at INTEGER NOT NULL
);

-- Raw Nostr Events (NDK Compatible)
CREATE TABLE nostr_events (
  id TEXT PRIMARY KEY,              -- 32-bytes hex
  pubkey TEXT NOT NULL,             -- 32-bytes hex
  kind INTEGER NOT NULL,            -- 33401 | 33402 | 33403
  created_at INTEGER NOT NULL,
  content TEXT NOT NULL,
  sig TEXT,                         -- 64-bytes hex
  raw_event TEXT NOT NULL,          -- Full JSON
  received_at INTEGER NOT NULL
);

-- Tag Indexing
CREATE TABLE event_tags (
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  index_num INTEGER NOT NULL,
  FOREIGN KEY(event_id) REFERENCES nostr_events(id)
);

-- Processed Exercise Data
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('strength', 'cardio', 'bodyweight')),
  category TEXT NOT NULL,
  equipment TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'local'
);

-- Exercise Media
CREATE TABLE exercise_media (
  exercise_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  content BLOB NOT NULL,
  thumbnail BLOB,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(exercise_id) REFERENCES exercises(id)
);

-- Template Tracking
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  nostr_event_id TEXT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY(nostr_event_id) REFERENCES nostr_events(id)
);

-- Cache Management
CREATE TABLE cache_metadata (
  content_id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  last_accessed INTEGER NOT NULL,
  access_count INTEGER NOT NULL,
  cache_priority INTEGER NOT NULL
);
```

### Event Processing
This section shows how the app handles data coming from the Nostr network. The EventProcessor class handles:
- Validating incoming events
- Storing the raw data
- Processing different types of events (exercises, templates, workouts)
- Updating search indexes
```typescript
interface NostrEvent {
  id: string;        // 32-bytes hex
  pubkey: string;    // 32-bytes hex 
  created_at: number;
  kind: number;      // 33401 | 33402 | 33403  
  tags: string[][];
  content: string;
  sig?: string;      // 64-bytes hex
}

class EventProcessor {
  async processIncomingEvent(event: NostrEvent) {
    await this.validateEvent(event);
    await this.storeRawEvent(event);
    await this.processEventByKind(event);
    await this.updateIndices(event);
  }

  private async processEventByKind(event: NostrEvent) {
    switch(event.kind) {
      case 33401: return this.processExerciseTemplate(event);
      case 33402: return this.processWorkoutTemplate(event);
      case 33403: return this.processWorkoutRecord(event);
    }
  }
}
```

### Cache Implementation
```typescript
interface CacheConfig {
  maxSize: number;
  exerciseLimit: number;
  templateLimit: number;
  mediaLimit: number;
  pruneThreshold: number;
}

class CacheManager {
  private cache: LRUCache<string, CacheEntry>;
  
  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached) {
      await this.updateAccessMetrics(key);
      return cached.data as T;
    }
    return null;
  }

  async set(key: string, value: any): Promise<void> {
    await this.ensureCacheSpace();
    this.cache.set(key, {
      data: value,
      lastAccessed: Date.now(),
      accessCount: 0
    });
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)
1. Basic schema implementation
2. NDK event processor setup
3. CRUD operations
4. Media storage system

### Phase 2: Nostr Integration (Week 2-3)
1. Raw event storage
2. Event validation
3. Tag indexing
4. Template dependencies

### Phase 3: Performance Layer (Week 3-4)
1. Cache implementation
2. Query optimization
3. Index tuning
4. Media optimization

### Phase 4: Sync & Polish (Week 4-5)
1. NDK sync integration
2. Background operations
3. Performance tuning
4. Error handling

## Testing Strategy

### Unit Tests
- Event validation
- Data processing
- Cache operations
- Media handling

### Integration Tests
- NDK compatibility
- Sync operations
- Template dependencies
- Query performance

### Performance Tests
- Query response times
- Cache effectiveness
- Media load times
- Storage efficiency

## Future Considerations

### Potential Enhancements
- Advanced sync strategies
- Predictive caching
- Enhanced search
- Compression options

### Known Limitations
- SQLite constraints
- Local storage limits
- Initial sync performance
- Cache memory bounds

## References
- NDK SQLite Implementation
- Nostr NIPs (01, 33401-33403)
- SQLite Performance Guide
- LRU Cache Patterns