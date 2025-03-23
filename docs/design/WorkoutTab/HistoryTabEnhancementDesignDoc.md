# History Tab Enhancement Design Document

## Problem Statement
The current History tab provides basic workout tracking but lacks filtering, detailed views, and improved visualization features that would help users better navigate and understand their training history. Additionally, the app needs to better integrate with Nostr for workout sharing and synchronization across devices. Analytics and progress tracking features, which were initially considered for the History tab, have been moved to the Profile tab as they better align with documenting personal growth.

## Requirements

### Functional Requirements
- Enhanced workout history browsing with filtering and sorting
- Detailed workout view with complete exercise and set information
- Calendar view with improved visualization and interaction
- Export and sharing capabilities for workout data
- Search functionality across workout history
- Differentiation between local and Nostr-published workouts
- Ability to publish local workouts to Nostr
- Display of Nostr workouts not stored locally
- Integration with Profile tab for analytics and progress tracking

### Non-Functional Requirements
- Performance optimization for large workout histories
- Responsive UI that works across device sizes
- Offline functionality for viewing history without network
- Consistent design language with the rest of the app
- Accessibility compliance
- Efficient data synchronization with Nostr relays

## Design Decisions

### 1. Tab Structure Enhancement
Keep the existing History/Calendar structure, focusing on enhancing these views with better filtering, search, and visualization.

Rationale:
- Maintains simplicity of individual views
- Follows established patterns in fitness apps
- Allows specialized UI for each view type
- Analytics and progress tracking will be moved to the Profile tab for better user context

### 2. Data Aggregation Strategy
Implement a dedicated analytics service that pre-processes workout data for visualization. This service will be shared with the Profile tab's analytics features.

Rationale:
- Improves performance by avoiding repeated calculations
- Enables complex trend analysis without UI lag
- Separates presentation logic from data processing
- Supports both history visualization and profile analytics

### 3. History Visualization Approach
Focus on providing clear, chronological views of workout history with rich filtering and search capabilities.

Rationale:
- Users need to quickly find specific past workouts
- Calendar view provides temporal context for training patterns
- Filtering by exercise, type, and other attributes enables targeted review
- Integration with Profile tab analytics provides deeper insights when needed

### 4. Nostr Integration Strategy
Implement a tiered approach to Nostr integration, starting with basic publishing capabilities in the MVP and expanding to full synchronization in future versions.

Rationale:
- Allows for incremental development and testing
- Prioritizes most valuable features for initial release
- Addresses core user needs first
- Builds foundation for more advanced features

## Technical Design

### Core Components

```typescript
// Enhanced history service

// Enhanced workout history service
interface EnhancedWorkoutHistoryService extends WorkoutHistoryService {
  searchWorkouts(query: string): Promise<Workout[]>;
  filterWorkouts(filters: WorkoutFilters): Promise<Workout[]>;
  getWorkoutsByExercise(exerciseId: string): Promise<Workout[]>;
  exportWorkoutHistory(format: 'csv' | 'json'): Promise<string>;
  getWorkoutStreak(): Promise<StreakData>;
  
  // Nostr integration methods
  getWorkoutSyncStatus(workoutId: string): Promise<{
    isLocal: boolean;
    isPublished: boolean;
    eventId?: string;
    relayCount?: number;
  }>;
  publishWorkoutToNostr(workoutId: string): Promise<string>; // Returns event ID
}

// Nostr workout service (for future expansion)
interface NostrWorkoutHistoryService {
  // Fetch workouts from relays that aren't in local DB
  fetchNostrOnlyWorkouts(since?: Date): Promise<Workout[]>;
  
  // Merge local and Nostr workouts with deduplication
  getMergedWorkoutHistory(): Promise<Workout[]>;
  
  // Import a Nostr workout into local DB
  importNostrWorkoutToLocal(eventId: string): Promise<string>;
}

// New data structures
interface WorkoutStats {
  period: string;
  workoutCount: number;
  totalVolume: number;
  totalDuration: number;
  averageIntensity: number;
  exerciseDistribution: Record<string, number>;
}

interface ProgressPoint {
  date: number;
  value: number;
  workoutId: string;
}

interface WorkoutFilters {
  type?: TemplateType[];
  dateRange?: { start: Date; end: Date };
  exercises?: string[];
  tags?: string[];
  source?: ('local' | 'nostr' | 'both')[];
}

// Enhanced WorkoutCard props
interface EnhancedWorkoutCardProps extends WorkoutCardProps {
  source: 'local' | 'nostr' | 'both';
  publishStatus?: {
    isPublished: boolean;
    relayCount: number;
    lastPublished?: number;
  };
  onShare?: () => void;
  onImport?: () => void;
}
```

### Database Schema Updates

```sql
-- Fix typo in service name first (WorkoutHIstoryService -> WorkoutHistoryService)

-- Add Nostr-related fields to completed_workouts table
ALTER TABLE completed_workouts ADD COLUMN nostr_event_id TEXT;
ALTER TABLE completed_workouts ADD COLUMN nostr_published_at INTEGER;
ALTER TABLE completed_workouts ADD COLUMN nostr_relay_count INTEGER DEFAULT 0;
ALTER TABLE completed_workouts ADD COLUMN source TEXT DEFAULT 'local';

-- Create table for tracking Nostr-only workouts (future expansion)
CREATE TABLE IF NOT EXISTS nostr_workouts (
  event_id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL,
  tags TEXT NOT NULL,
  sig TEXT NOT NULL,
  last_seen INTEGER NOT NULL,
  relay_count INTEGER NOT NULL
);
```

### Integration Points
- SQLite database for local storage
- Chart libraries for data visualization
- Share API for exporting workout data
- Nostr integration for social sharing and sync
- Calendar API for date handling
- NDK for Nostr relay communication

## Implementation Plan

### Phase 1: Foundation & Enhanced History View
1. Fix typo in WorkoutHistoryService filename
2. Implement workout detail view navigation
3. Add filtering and sorting to history list
4. Enhance WorkoutCard with more metrics
5. Implement search functionality
6. Add basic Nostr status indicators (local vs. published)
7. Improve calendar visualization with heatmap
8. Add day summary popups to calendar

### Phase 2: Nostr Integration (MVP)
1. Update database schema to track Nostr event IDs and publication status
2. Implement visual indicators for workout source/status
3. Add basic publishing functionality for local workouts
4. Add filtering by source (local/published)

### Phase 3: Export & Sharing
1. Add workout export functionality
2. Implement social sharing features
3. Create printable workout reports
4. Add data backup options

### Phase 4: Integration with Profile Analytics
1. Implement data sharing with Profile tab analytics
2. Add navigation links to relevant analytics from workout details
3. Ensure consistent data representation between History and Profile tabs

### Future Phases: Advanced Nostr Integration
1. Create NostrWorkoutHistoryService for fetching Nostr-only workouts
2. Implement workout importing functionality
3. Add background sync for Nostr workouts
4. Implement batch operations for publishing/importing
5. Add cross-device synchronization

## UI Mockups

### History Tab with Source Indicators

```
┌─────────────────────────────────────────┐
│ HISTORY                                 │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ MARCH 2025                          │ │
│ │                                     │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Push Day 1             🔄 >     │ │ │
│ │ │ Friday, Mar 7                   │ │ │
│ │ │ ⏱️ 1h 47m  ⚖️ 9239 lb  🔄 120   │ │ │
│ │ │                                 │ │ │
│ │ │ Bench Press                     │ │ │
│ │ │ Incline Dumbbell Press          │ │ │
│ │ │ Tricep Pushdown                 │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │                                     │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Pull Day 1             📱 >     │ │ │
│ │ │ Wednesday, Mar 5                │ │ │
│ │ │ ⏱️ 1h 36m  ⚖️ 1396 lb  🔄 95    │ │ │
│ │ │                                 │ │ │
│ │ │ Lat Pulldown                    │ │ │
│ │ │ Seated Row                      │ │ │
│ │ │ Bicep Curl                      │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ FEBRUARY 2025                       │ │
│ │                                     │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Leg Day 1             ☁️ >     │ │ │
│ │ │ Monday, Feb 28                  │ │ │
│ │ │ ⏱️ 1h 15m  ⚖️ 8750 lb  🔄 87    │ │ │
│ │ │                                 │ │ │
│ │ │ Squat                           │ │ │
│ │ │ Leg Press                       │ │ │
│ │ │ Leg Extension                   │ │ │
│ │ └─────────────────────────────────┘ │ │
└─────────────────────────────────────────┘

Legend:
🔄 - Local only
📱 - Published to Nostr
☁️ - From Nostr (not stored locally)
```

### Workout Detail View with Sharing

```
┌─────────────────────────────────────────┐
│ < WORKOUT DETAILS                       │
├─────────────────────────────────────────┤
│ Push Day 1                              │
│ Friday, March 7, 2025                   │
│                                         │
│ ⏱️ 1h 47m  ⚖️ 9239 lb  🔄 120 reps      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ EXERCISES                           │ │
│ │                                     │ │
│ │ Bench Press                         │ │
│ │ 135 lb × 12                         │ │
│ │ 185 lb × 10                         │ │
│ │ 205 lb × 8                          │ │
│ │ 225 lb × 6                          │ │
│ │                                     │ │
│ │ Incline Dumbbell Press              │ │
│ │ 50 lb × 12                          │ │
│ │ 60 lb × 10                          │ │
│ │ 70 lb × 8                           │ │
│ │                                     │ │
│ │ Tricep Pushdown                     │ │
│ │ 50 lb × 15                          │ │
│ │ 60 lb × 12                          │ │
│ │ 70 lb × 10                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ NOTES                               │ │
│ │ Felt strong today. Increased bench  │ │
│ │ press weight by 10 lbs.             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🔄 Local Only                       │ │
│ │                                     │ │
│ │ [Publish to Nostr]                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Export Workout]                        │
└─────────────────────────────────────────┘
```

Note: Analytics Dashboard and Progress Tracking features have been moved to the Profile tab. See the Profile Tab Enhancement Design Document for details on these features.

## Testing Strategy

### Unit Tests
- Service method tests for data processing
- Component rendering tests
- Filter and search algorithm tests
- Chart data preparation tests
- Nostr event creation and parsing tests

### Integration Tests
- End-to-end workout flow tests
- Database read/write performance tests
- UI interaction tests
- Cross-tab navigation tests
- Nostr publishing and retrieval tests

## Future Considerations

### Potential Enhancements
- AI-powered workout insights and recommendations
- Advanced periodization analysis
- Integration with wearable devices for additional metrics
- Video playback of recorded exercises
- Community benchmarking and anonymous comparisons
- Full cross-device synchronization via Nostr
- Collaborative workouts with friends

### Known Limitations
- Performance may degrade with very large workout histories
- Complex analytics require significant processing
- Limited by available device storage
- Some features require online connectivity
- Nostr relay availability affects sync reliability

## Integration with Profile Tab

The History tab will integrate with the Profile tab's analytics and progress tracking features to provide a cohesive user experience:

### Data Flow
- The same underlying workout data will power both History views and Profile analytics
- The analytics service will process workout data for both tabs
- Changes in one area will be reflected in the other

### Navigation Integration
- Workout detail views will include links to relevant analytics in the Profile tab
- The Profile tab's progress tracking will link back to relevant historical workouts
- Consistent data visualization will be used across both tabs

### User Experience
- Users will use the History tab for finding and reviewing specific workouts
- Users will use the Profile tab for analyzing trends and tracking progress
- The separation provides clearer context for each activity while maintaining data consistency

## References
- [Workout Data Flow Specification](../WorkoutTab/WorkoutDataFlowSpec.md)
- [Nostr Exercise NIP](../nostr-exercise-nip.md)
- [WorkoutHistoryService implementation](../../../lib/db/services/WorkoutHistoryService.ts)
- [NDK documentation](https://github.com/nostr-dev-kit/ndk)
- [Profile Tab Enhancement Design Document](../ProfileTab/ProfileTabEnhancementDesignDoc.md)
