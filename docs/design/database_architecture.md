# POWR Database Architecture Diagrams

## 1. Entity Relationship Diagram

This diagram shows the core database structure and relationships between tables. The design supports both raw Nostr event storage and processed data for efficient querying.

Key Features:
- Raw Nostr event storage in `nostr_events`
- Processed exercise data in `exercise_definitions`
- Dependency tracking in `incomplete_templates`
- Efficient tag indexing in `event_tags`

```mermaid
erDiagram
    nostr_events ||--o{ event_tags : contains
    nostr_events ||--o| exercise_definitions : processes
    nostr_events ||--o| incomplete_templates : tracks
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
    incomplete_templates {
        string template_id FK
        number missing_exercise_count
        string missing_exercises
    }
```

## 2. Event Processing Flow

This diagram illustrates how different types of Nostr events (Exercise Definitions, Workout Templates, and Workout Records) are processed, validated, and stored.

Key Features:
- Event type differentiation
- Validation process
- Dependency checking
- Storage paths for complete/incomplete data

```mermaid
flowchart TB
    subgraph Input
        A[New Nostr Event] --> B{Event Type}
    end
    
    B -->|kind 33401| C[Exercise Definition]
    B -->|kind 33402| D[Workout Template]
    B -->|kind 33403| E[Workout Record]
    
    subgraph Processing
        C --> F[Validate Event]
        D --> F
        E --> F
        
        F --> G{Valid?}
        G -->|No| H[Reject Event]
        G -->|Yes| I[Store Raw Event]
        
        I --> J[Process Event]
        J --> K{Dependencies?}
        
        K -->|Missing| L[Store as Incomplete]
        K -->|Complete| M[Store Processed Data]
        
        L --> N[Queue Missing Events]
    end
    
    subgraph Storage
        M --> O[(NostrEvents)]
        M --> P[(ProcessedData)]
        L --> Q[(IncompleteQueue)]
    end
```

## 3. Query and Cache Flow

This sequence diagram shows how data is retrieved, utilizing the LRU cache for performance and handling template dependencies.

Key Features:
- Cache hit/miss handling
- Template dependency resolution
- Efficient data retrieval paths
- Incomplete template handling
- Solid line with arrow (->>) means "makes a request to"
- Dashed line (-->) means "returns data to"

```mermaid
sequenceDiagram
    participant C as Client
    participant Cache as LRU Cache
    participant DB as SQLite
    participant Q as Query Builder
    
    C->>Q: Client asks Query Builder for templates
    Q->>Cache: Query Builder first checks if data is in cache
    
    alt Cache Hit
        Cache-->>C: Quickly Returns Data found in Cache
    else Cache Miss: Data not in cache, must query DB
        Q->>DB: Query Database
        DB-->>Q: Raw Results
        Q->>Q: Process Raw Data
        Q->>Cache: Store in Cache
        Q-->>C: Return Results
    end
    
    Note over C,DB: Template Dependency Resolution
    
    C->>Q: Template Request
    Q->>DB: Fetch Template
    DB-->>Q: Template Data
    Q->>DB: Check Dependencies
    
    alt Missing Dependencies
        DB-->>Q: Missing Exercises
        Q->>C: Return Incomplete
    else Complete
        DB-->>Q: All Dependencies
        Q->>C: Return Complete Template
    end
```
The second part shows template dependency resolution:
- Template request process
- Dependency checking
- Different responses based on whether all exercises exist
The key learning points:
- Cache is checked first to improve performance
- Database is only queried if necessary
- Results are cached for future use
- Dependencies are verified before returning complete templates

## 4. Component Architecture

This diagram shows the overall application architecture, including service layers and future Nostr integration points.

Key Features:
- Clear layer separation
- Service interactions
- Cache management
- Future Nostr integration points

```mermaid
graph TB
    subgraph UI Layer
        A[Library Screen]
        B[Exercise Form]
        C[Template Form]
    end
    
    subgraph Service Layer
        D[Library Service]
        E[Event Processor]
        F[Cache Manager]
    end
    
    subgraph Data Layer
        G[(SQLite)]
        H[Query Builder]
        I[Event Validators]
    end
    
    subgraph Future Nostr
        J[Relay Manager]
        K[Event Publisher]
        L[Sync Manager]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> E
    D --> F
    
    E --> I
    E --> G
    
    F --> G
    F --> H
    
    H --> G
    
    D -.-> J
    D -.-> K
    D -.-> L
```

## Implementation Notes

These diagrams represent the core architecture of POWR's database implementation. Key considerations:

1. **Data Flow**
   - All Nostr events are stored in raw form
   - Processed data is stored separately for efficiency
   - Cache layer improves read performance
   - Dependency tracking ensures data integrity

2. **Scalability**
   - Modular design allows for future expansion
   - Clear separation of concerns
   - Efficient query patterns
   - Prepared for Nostr integration

3. **Performance**
   - LRU caching for frequent queries
   - Optimized indexes for common operations
   - Efficient dependency resolution
   - Batch processing capability