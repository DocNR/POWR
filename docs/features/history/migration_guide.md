# Workout History API Migration Guide

**Last Updated:** 2025-04-02  
**Status:** Active  
**Related To:** [History Overview](./history_overview.md), [UnifiedWorkoutHistoryService](../../lib/db/services/UnifiedWorkoutHistoryService.ts)

## Overview

We've consolidated our workout history services and hooks to provide a more consistent and maintainable API. This guide helps developers migrate from the legacy APIs to the new unified API.

## Why We Consolidated

The previous implementation had several overlapping services:

1. **WorkoutHistoryService** - Basic service for local database operations
2. **EnhancedWorkoutHistoryService** - Extended service with advanced features
3. **NostrWorkoutHistoryService** - Service for Nostr integration
4. **useNostrWorkoutHistory Hook** - Hook for fetching workouts from Nostr

This led to:
- Duplicate code and functionality
- Inconsistent APIs
- Confusion about which service to use for what purpose
- Difficulty maintaining and extending the codebase

## New Architecture

The new architecture consists of two primary components:

1. **UnifiedWorkoutHistoryService** - A comprehensive service that combines all functionality from previous services
2. **useWorkoutHistory** - A unified hook that provides access to all workout history features

## Feature Comparison

| Feature | Legacy Implementation | Unified Implementation |
|---------|--------------------------|------------------------|
| Local Workouts | WorkoutHistoryService | UnifiedWorkoutHistoryService |
| Nostr Workouts | NostrWorkoutHistoryService | UnifiedWorkoutHistoryService |
| Filtering | EnhancedWorkoutHistoryService | UnifiedWorkoutHistoryService |
| Calendar View | Separate implementation | Integrated in service |
| Real-time Updates | Not available | Built-in with subscriptions |
| Export Functionality | Not available | Built-in (CSV/JSON) |
| Streak Tracking | Not available | Built-in analytics |

## Service Migration

### Before:

```typescript
// Using WorkoutHistoryService
const workoutHistoryService = new WorkoutHistoryService(db);
const localWorkouts = await workoutHistoryService.getAllWorkouts();

// Using NostrWorkoutHistoryService
const nostrWorkoutHistoryService = new NostrWorkoutHistoryService(db);
const allWorkouts = await nostrWorkoutHistoryService.getAllWorkouts({
  includeNostr: true,
  isAuthenticated: true
});
```

### After:

```typescript
// Using unified UnifiedWorkoutHistoryService
const workoutHistoryService = new UnifiedWorkoutHistoryService(db);

// For local workouts only
const localWorkouts = await workoutHistoryService.getAllWorkouts({
  includeNostr: false
});

// For all workouts (local + Nostr)
const allWorkouts = await workoutHistoryService.getAllWorkouts({
  includeNostr: true,
  isAuthenticated: true
});
```

## Hook Migration

### Before:

```typescript
// Using useNostrWorkoutHistory
const { workouts, loading } = useNostrWorkoutHistory();

// Or manually creating a service in a component
const db = useSQLiteContext();
const workoutHistoryService = React.useMemo(() => new WorkoutHistoryService(db), [db]);

// Then loading workouts
const loadWorkouts = async () => {
  const workouts = await workoutHistoryService.getAllWorkouts();
  setWorkouts(workouts);
};
```

### After:

```typescript
// Using unified useWorkoutHistory
const { 
  workouts, 
  loading, 
  refresh, 
  getWorkoutsByDate,
  publishWorkoutToNostr 
} = useWorkoutHistory({
  includeNostr: true,
  realtime: true,
  filters: { type: ['strength'] } // Optional filters
});
```

## API Reference

### UnifiedWorkoutHistoryService

```typescript
export class UnifiedWorkoutHistoryService {
  constructor(database: SQLiteDatabase);
  
  // Core operations
  getAllWorkouts(options?: {
    limit?: number;
    offset?: number;
    includeNostr?: boolean;
    isAuthenticated?: boolean;
  }): Promise<Workout[]>;
  
  getWorkoutDetails(workoutId: string): Promise<Workout | null>;
  
  // Filtering and Search
  filterWorkouts(filters: WorkoutFilters): Promise<Workout[]>;
  searchWorkouts(query: string): Promise<Workout[]>;
  getWorkoutsByExercise(exerciseId: string): Promise<Workout[]>;
  
  // Calendar operations
  getWorkoutsByDate(date: Date): Promise<Workout[]>;
  getWorkoutDatesInMonth(year: number, month: number): Promise<Date[]>;
  
  // Nostr operations
  publishWorkoutToNostr(workoutId: string): Promise<string>;
  importNostrWorkoutToLocal(eventId: string): Promise<string>;
  subscribeToNostrWorkouts(pubkey: string, callback: (workout: Workout) => void): string;
  unsubscribeFromNostrWorkouts(subId: string): void;
  
  // Analytics
  getWorkoutStreak(): Promise<{ current: number; longest: number; lastWorkoutDate: Date | null }>;
  getWorkoutCount(): Promise<number>;
  
  // Export
  exportWorkoutHistory(format: 'csv' | 'json'): Promise<string>;
  
  // Status
  getWorkoutSyncStatus(workoutId: string): Promise<WorkoutSyncStatus>;
  updateWorkoutNostrStatus(workoutId: string, eventId: string, relayCount: number): Promise<boolean>;
}
```

### useWorkoutHistory

```typescript
export function useWorkoutHistory(options: {
  includeNostr?: boolean;
  filters?: WorkoutFilters;
  realtime?: boolean;
} = {}): {
  workouts: Workout[];
  loading: boolean;
  error: Error | null;
  refreshing: boolean;
  refresh: () => Promise<Workout[]>;
  getWorkoutsByDate: (date: Date) => Promise<Workout[]>;
  getWorkoutDetails: (workoutId: string) => Promise<Workout | null>;
  publishWorkoutToNostr: (workoutId: string) => Promise<string>;
  importNostrWorkoutToLocal: (eventId: string) => Promise<string>;
  service: UnifiedWorkoutHistoryService;
}
```

## Migration Examples

### Calendar View

```typescript
// Before
const workoutHistoryService = React.useMemo(() => new WorkoutHistoryService(db), [db]);
const loadWorkouts = async () => {
  const allWorkouts = await workoutHistoryService.getAllWorkouts();
  setWorkouts(allWorkouts);
};

// After
const { 
  workouts: allWorkouts, 
  loading, 
  refresh, 
  getWorkoutsByDate 
} = useWorkoutHistory({
  includeNostr: true,
  realtime: true
});
```

### Workout History Screen

```typescript
// Before
const workoutHistoryService = React.useMemo(() => new WorkoutHistoryService(db), [db]);
const loadWorkouts = async () => {
  let allWorkouts = [];
  if (includeNostr) {
    allWorkouts = await workoutHistoryService.getAllWorkouts();
  } else {
    allWorkouts = await workoutHistoryService.filterWorkouts({
      source: ['local']
    });
  }
  setWorkouts(allWorkouts);
};

// After
const { 
  workouts: allWorkouts, 
  loading, 
  refresh 
} = useWorkoutHistory({
  includeNostr,
  filters: includeNostr ? undefined : { source: ['local'] },
  realtime: true
});
```

### Workout Detail Screen

```typescript
// Before
const workoutHistoryService = React.useMemo(() => new WorkoutHistoryService(db), [db]);
const loadWorkout = async () => {
  const workoutDetails = await workoutHistoryService.getWorkoutDetails(id);
  setWorkout(workoutDetails);
};

// After
const { getWorkoutDetails, publishWorkoutToNostr } = useWorkoutHistory();
const loadWorkout = async () => {
  const workoutDetails = await getWorkoutDetails(id);
  setWorkout(workoutDetails);
};
```

## Key Benefits of the New API

1. **Simplified Interface**: One service and one hook to learn and use
2. **Real-time Updates**: Built-in support for real-time Nostr updates
3. **Consistent Filtering**: Unified filtering across local and Nostr workouts
4. **Better Type Safety**: Improved TypeScript types and interfaces
5. **Reduced Boilerplate**: Less code needed in components
6. **Offline Support**: Better handling of offline scenarios
7. **Enhanced Performance**: Optimized queries and caching

## Migration Timeline

- The legacy services (`EnhancedWorkoutHistoryService`, `NostrWorkoutHistoryService`) and hooks (`useNostrWorkoutHistory`) are now deprecated
- These services and hooks will be removed in a future release
- All components should migrate to the new unified API as soon as possible

## Troubleshooting

### Common Issues

1. **Subscription Management**

If you encounter issues with Nostr subscriptions:

```typescript
// Make sure to clean up subscriptions when the component unmounts
useEffect(() => {
  // Component setup...
  
  return () => {
    // Always clean up subscriptions to prevent memory leaks
    if (subId) {
      workoutHistoryService.unsubscribeFromNostrWorkouts(subId);
    }
  };
}, [workoutHistoryService]);
```

2. **Filtering Workouts**

If filtering isn't working as expected:

```typescript
// Use proper typing for filter properties
const filters: WorkoutFilters = {
  type: ['strength'], // Explicitly typed array of strings
  source: ['local', 'nostr'], // Use valid source values
  dateRange: {
    start: new Date('2025-01-01'),
    end: new Date('2025-04-01')
  }
};
```

3. **Calendar Date Issues**

If calendar dates aren't showing workouts:

```typescript
// Make sure to use the getWorkoutsByDate method
const workoutsForSelectedDate = await getWorkoutsByDate(selectedDate);

// If that returns empty results, you can use a fallback:
if (workoutsForSelectedDate.length === 0) {
  const filteredWorkouts = allWorkouts.filter(workout => 
    isSameDay(new Date(workout.startTime), selectedDate)
  );
  setSelectedDateWorkouts(filteredWorkouts);
}
```

## Related Documentation

- [History Overview](./history_overview.md) - Overview of the History tab's features and architecture
- [Workout Data Models](../workout/data_models.md) - Details on workout data structures
- [Nostr Offline Queue](../../technical/nostr/offline_queue.md) - Information on offline Nostr functionality
