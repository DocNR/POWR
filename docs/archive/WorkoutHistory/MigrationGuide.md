> **ARCHIVED DOCUMENT**: This document is outdated and kept for historical reference only. Please refer to [Migration Guide](../../features/history/migration_guide.md) for up-to-date information.

# Workout History API Migration Guide

## Overview

We've consolidated our workout history services and hooks to provide a more consistent and maintainable API. This guide will help you migrate from the old APIs to the new unified API.

## Why We're Consolidating

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

The new architecture consists of:

1. **UnifiedWorkoutHistoryService** - A single service that combines all functionality
2. **useWorkoutHistory** - A single hook that provides access to all workout history features

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

## Key Benefits of the New API

1. **Simplified Interface**: One service and one hook to learn and use
2. **Real-time Updates**: Built-in support for real-time Nostr updates
3. **Consistent Filtering**: Unified filtering across local and Nostr workouts
4. **Better Type Safety**: Improved TypeScript types and interfaces
5. **Reduced Boilerplate**: Less code needed in components

## Examples of Updated Components

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

## Timeline

- The old APIs are now deprecated and will be removed in a future release
- Please migrate to the new APIs as soon as possible
- If you encounter any issues during migration, please contact the development team

## Additional Resources

- [UnifiedWorkoutHistoryService Documentation](../api/UnifiedWorkoutHistoryService.md)
- [useWorkoutHistory Hook Documentation](../api/useWorkoutHistory.md)
