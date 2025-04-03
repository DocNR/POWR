# Progress Tracking

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [Progress Tab](./tabs/progress_tab.md), [Analytics Service](../../technical/analytics/index.md)

## Introduction

The progress tracking features in POWR provide users with comprehensive analytics and visualizations of their workout performance over time. This document outlines the technical implementation of progress tracking, which is primarily exposed through the Progress tab in the Profile section.

## Implementation Overview

Progress tracking is implemented through the AnalyticsService, which processes workout data from both local storage and Nostr to generate statistics, identify trends, and track personal records.

### Key Components

- **AnalyticsService**: Core service that computes statistics and manages progress data
- **useAnalytics Hook**: React hook that provides access to analytics capabilities
- **Progress Tab UI**: Visualization and filtering of progress data
- **Nostr Integration**: Toggle for including or excluding Nostr workout data

## Analytics Service Implementation

The AnalyticsService (implemented in `lib/services/AnalyticsService.ts`) provides several key methods for tracking progress:

```typescript
// Core analytics service class
export class AnalyticsService {
  private includeNostr: boolean = true;
  
  // Configure whether to include Nostr workouts in analytics
  public setIncludeNostr(include: boolean): void {
    this.includeNostr = include;
  }
  
  // Get statistics for the specified time period
  public async getWorkoutStats(period: 'week' | 'month' | 'year' | 'all'): Promise<WorkoutStats> {
    // Implementation details...
  }
  
  // Get personal records, optionally filtered by exercise
  public async getPersonalRecords(
    exerciseId?: string, 
    limit?: number
  ): Promise<PersonalRecord[]> {
    // Implementation details...
  }
  
  // Additional methods...
}
```

### WorkoutStats Interface

The WorkoutStats interface defines the structure of statistics returned by the analytics service:

```typescript
export interface WorkoutStats {
  workoutCount: number;
  totalDuration: number;
  totalVolume: number;
  frequencyByDay: number[];
  exerciseDistribution: Record<string, number>;
  muscleGroupDistribution: Record<string, number>;
  // Additional stats fields...
}
```

### Personal Records

Personal records are tracked through the PersonalRecord interface:

```typescript
export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  value: number;
  unit: 'kg' | 'lb';
  reps: number;
  date: number;
  workoutId: string;
  previousRecord?: {
    value: number;
    date: number;
  };
}
```

Personal records are identified by comparing new workout performances against historical data, with improvements being flagged and stored.

## Time Period Filtering

Progress tracking supports different time periods for analysis:

```typescript
type AnalyticsPeriod = 'week' | 'month' | 'year' | 'all';

// Example filtering implementation
private filterWorkoutsByPeriod(workouts: Workout[], period: AnalyticsPeriod): Workout[] {
  const now = Date.now();
  const cutoffDate = this.getPeriodCutoffDate(now, period);
  
  return workouts.filter(workout => workout.completedAt >= cutoffDate);
}

private getPeriodCutoffDate(now: number, period: AnalyticsPeriod): number {
  switch (period) {
    case 'week':
      return now - 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return now - 30 * 24 * 60 * 60 * 1000;
    case 'year':
      return now - 365 * 24 * 60 * 60 * 1000;
    case 'all':
    default:
      return 0;
  }
}
```

## Workout Frequency Analysis

Workout frequency by day of the week is calculated using:

```typescript
private calculateFrequencyByDay(workouts: Workout[]): number[] {
  // Initialize array for days [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  const frequency = Array(7).fill(0);
  
  workouts.forEach(workout => {
    const date = new Date(workout.completedAt);
    // getDay() returns 0-6 (Sunday-Saturday), adjust to 0-6 (Monday-Sunday)
    const dayIndex = (date.getDay() + 6) % 7;
    frequency[dayIndex]++;
  });
  
  return frequency;
}
```

## Exercise Distribution

Exercise distribution is calculated by counting the occurrences of each exercise across workouts:

```typescript
private calculateExerciseDistribution(workouts: Workout[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      const id = exercise.id;
      distribution[id] = (distribution[id] || 0) + 1;
    });
  });
  
  return distribution;
}
```

## Progress Charts Implementation

The Progress tab visualizes data using custom chart components:

### Workout Frequency Chart

```jsx
const WorkoutFrequencyChart = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return (
    <View className="h-40 bg-muted rounded-lg items-center justify-center">
      <Text className="text-muted-foreground">Workout Frequency Chart</Text>
      <View className="flex-row justify-evenly w-full mt-2">
        {stats?.frequencyByDay.map((count, index) => (
          <View key={index} className="items-center">
            <View 
              style={{ 
                height: count * 8, 
                width: 20, 
                backgroundColor: 'hsl(var(--purple))',
                borderRadius: 4
              }} 
            />
            <Text className="text-xs text-muted-foreground mt-1">{days[index]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
```

## Nostr Integration

Progress tracking includes a toggle for including or excluding Nostr workout data:

```jsx
<TouchableOpacity 
  onPress={() => setIncludeNostr(!includeNostr)}
  className="flex-row items-center"
>
  <CloudIcon 
    size={16} 
    className={includeNostr ? "text-primary" : "text-muted-foreground"} 
  />
  <Text 
    className={`ml-1 text-sm ${includeNostr ? "text-primary" : "text-muted-foreground"}`}
  >
    Nostr
  </Text>
  <Switch 
    value={includeNostr} 
    onValueChange={setIncludeNostr}
    trackColor={{ false: '#767577', true: 'hsl(var(--purple))' }}
    thumbColor={'#f4f3f4'}
    className="ml-1"
  />
</TouchableOpacity>
```

When the toggle is activated, the `setIncludeNostr` method is called on the AnalyticsService:

```jsx
// Pass includeNostr flag to analytics service
analyticsService.setIncludeNostr(includeNostr);
```

## Future Enhancements

Future enhancements to progress tracking include:

1. **Enhanced Visualizations**: More sophisticated chart types and visualizations
2. **Goal Setting**: Ability to set and track progress toward specific goals
3. **AI Insights**: Machine learning-based insights and recommendations
4. **Export Functionality**: Ability to export progress data in various formats
5. **Custom Time Periods**: Custom date range selection for more precise analysis

## Technical Considerations

### Performance

For large datasets, analytics calculations can be resource-intensive. To address this:

- Computations are performed in small batches
- Results are cached where appropriate
- Background processing is used for longer calculations

### Data Migration

Progress tracking handles data from both the local database and Nostr, requiring data normalization:

```typescript
private normalizeWorkout(workout: Workout | NostrWorkout): NormalizedWorkout {
  // Implement normalization logic to ensure consistent data formats
  // regardless of the data source
}
```

### Offline Support

Progress tracking works seamlessly in offline mode by focusing on local workouts when Nostr data is unavailable:

```typescript
private async getWorkouts(period: AnalyticsPeriod): Promise<Workout[]> {
  const localWorkouts = await this.workoutService.getCompletedWorkouts();
  
  // If offline or Nostr disabled, return only local workouts
  if (!this.includeNostr || !this.connectivityService.isOnline()) {
    return this.filterWorkoutsByPeriod(localWorkouts, period);
  }
  
  // Otherwise include Nostr workouts
  const nostrWorkouts = await this.nostrWorkoutService.getCompletedWorkouts();
  const allWorkouts = [...localWorkouts, ...nostrWorkouts];
  
  return this.filterWorkoutsByPeriod(allWorkouts, period);
}
```

## Related Documentation

- [Progress Tab](./tabs/progress_tab.md) - UI implementation of progress tracking
- [Analytics Service](../../technical/analytics/index.md) - Technical details of the analytics service
- [Activity Tab](./tabs/activity_tab.md) - Uses progress tracking for activity summary
