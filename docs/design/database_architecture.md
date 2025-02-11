# POWR Database Architecture

## 1. Entity Relationship Diagram

This diagram shows the core database structure and relationships between tables. The design supports both local-first operations with performance optimizations and Nostr protocol integration.

Key Features:
- Raw Nostr event storage in `nostr_events`
- Processed exercise data in `exercise_definitions`
- Media content storage in `exercise_media`
- Cache management in `cache_metadata`
- Dependency tracking in `incomplete_templates`
- Efficient tag indexing in `event_tags`

```mermaid
erDiagram
    nostr_events ||--o{ event_tags : contains
    nostr_events ||--o| exercise_definitions : processes
    nostr_events ||--o| incomplete_templates : tracks
    exercise_definitions ||--o{ exercise_media : stores
    exercise_definitions ||--o{ cache_metadata : tracks
    
    nostr_events {
        string id PK
        string pubkey
        number kind
        string raw_event
        number created_at
        number received_at
    }
    
    event_tags {
        string event_id FK
        string name
        string value
        number index
    }
    
    exercise_definitions {
        string event_id FK
        string title
        string equipment
        string format
        string format_units
    }
    
    exercise_media {
        string exercise_id FK
        string media_type
        blob content
        blob thumbnail
        number created_at
    }
    
    cache_metadata {
        string content_id PK
        string content_type
        number last_accessed
        number access_count
        number priority
    }
    
    incomplete_templates {
        string template_id FK
        number missing_exercise_count
        string missing_exercises
    }
```

## 2. Event Processing Flow

This diagram illustrates how both local and Nostr events are processed, validated, and stored. The system handles Exercise Definitions (33401), Workout Templates (33402), and Workout Records (33403).

Key Features:
- Support for both local and Nostr events
- Unified validation process
- Media content handling
- Cache management
- Dependency checking
- Storage optimization

```mermaid
flowchart TB
    subgraph Input
        A[New Event] --> B{Source}
        B -->|Local| C[Local Creation]
        B -->|Nostr| D[Nostr Event]
        C --> E{Event Type}
        D --> E
    end
    
    E -->|kind 33401| F[Exercise Definition]
    E -->|kind 33402| G[Workout Template]
    E -->|kind 33403| H[Workout Record]
    
    subgraph Processing
        F --> I[Validate Event]
        G --> I
        H --> I
        
        I --> J{Valid?}
        J -->|No| K[Reject Event]
        J -->|Yes| L[Store Raw Event]
        
        L --> M[Process Event]
        M --> N{Has Media?}
        
        N -->|Yes| O[Process Media]
        N -->|No| P{Dependencies?}
        O --> P
        
        P -->|Missing| Q[Store as Incomplete]
        P -->|Complete| R[Store Processed Data]
        
        Q --> S[Queue Missing Events]
        R --> T[Update Cache]
    end
    
    subgraph Storage
        R --> U[(NostrEvents)]
        R --> V[(ProcessedData)]
        O --> W[(MediaStore)]
        T --> X[(Cache)]
        Q --> Y[(IncompleteQueue)]
    end
```

## 3. Query and Cache Flow

This sequence diagram shows how data is retrieved, using a performance-optimized approach with LRU caching, efficient media handling, and template dependency resolution.

Key Features:
- Smart cache management
- Media streaming
- Template dependency resolution
- Query optimization
- Priority-based caching

```mermaid
sequenceDiagram
    participant UI as UI Layer
    participant Cache as LRU Cache
    participant Media as Media Store
    participant DB as SQLite
    participant Query as Query Builder
    
    UI->>Query: Request Content
    Query->>Cache: Check Cache
    
    alt Cache Hit
        Cache-->>UI: Return Cached Data
        
        opt Has Media References
            UI->>Media: Request Media
            Media-->>UI: Stream Media
        end
        
    else Cache Miss
        Query->>DB: Query Database
        DB-->>Query: Raw Results
        
        opt Has Media
            Query->>Media: Load Media
            Media-->>Query: Media Content
        end
        
        Query->>Query: Process Results
        Query->>Cache: Update Cache
        Query-->>UI: Return Results
    end
    
    Note over Query,DB: Template Resolution
    
    opt Template Dependencies
        Query->>DB: Check Dependencies
        alt Missing Dependencies
            DB-->>Query: Missing References
            Query-->>UI: Return Incomplete
        else Complete
            DB-->>Query: All Dependencies
            Query-->>UI: Return Complete
        end
    end
```

## 4. Component Architecture

This diagram shows the application architecture, focusing on the interaction between local-first operations and Nostr integration.

Key Features:
- Local-first prioritization
- Efficient service layers
- Clear data boundaries
- Performance optimization
- NDK integration points

```mermaid
graph TB
    subgraph UI Layer
        A[Views]
        B[Forms]
        C[Media Display]
    end
    
    subgraph Service Layer
        D[Library Service]
        E[Event Processor]
        F[Cache Manager]
        G[Media Service]
    end
    
    subgraph Storage Layer
        H[(SQLite)]
        I[Media Store]
        J[Event Store]
        K[Query Builder]
    end
    
    subgraph NDK Layer
        L[Relay Manager]
        M[Event Publisher]
        N[Sync Manager]
    end
    
    A --> D
    B --> D
    C --> G
    
    D --> E
    D --> F
    
    E --> H
    E --> J
    F --> H
    G --> I
    
    D -.-> L
    D -.-> M
    
    H --> K
    K --> F
```

## Implementation Notes

These diagrams represent POWR's database implementation with a focus on local-first performance while maintaining Nostr compatibility.

1. **Local-First Design**
   - SQLite as primary storage
   - Efficient caching layer
   - Optimized media handling
   - Smart query patterns
   - Background processing

2. **Nostr Integration**
   - Raw event preservation
   - NDK compatibility
   - Event validation
   - Dependency tracking
   - Sync management

3. **Performance Features**
   - LRU caching with priorities
   - Media optimization
   - Query optimization
   - Batch processing
   - Background sync

4. **Data Integrity**
   - Transaction management
   - Dependency tracking
   - Event validation
   - Error handling
   - Recovery procedures