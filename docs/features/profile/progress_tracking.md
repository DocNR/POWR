# Progress Tracking

**Last Updated:** 2025-03-25  
**Status:** Active  
**Related To:** Profile Features, Analytics, Workout History

## Purpose

This document describes the progress tracking features in the POWR app's profile tab. It outlines how users can track their exercise progress, view trends over time, and analyze their workout performance.

## Overview

The progress tracking feature allows users to:

1. View exercise-specific progress over time
2. Track key performance metrics (weight, volume, frequency)
3. Identify personal records and milestones
4. Analyze workout trends and patterns

The progress tracking is designed with the following principles:

- Exercise-focused rather than workout-focused
- Clear visual representation of progress
- Focus on actionable insights
- Privacy-first with user control over data sharing

## Component Architecture

### High-Level Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Layer      │     │  Service Layer  │     │   Data Layer    │
│                 │     │                 │     │                 │
│ Progress Charts │     │ Analytics       │     │ Workout History │
│ Exercise List   │◄───►│ Services        │◄───►│ Data            │
│ Metrics Display │     │ Aggregation     │     │ Calculation     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### UI Components

- `ProgressCharts`: Visual representations of key metrics over time
- `ExerciseList`: Selectable list of exercises with progress indicators
- `MetricsDisplay`: Numerical representation of key performance indicators
- `PRBadges`: Visual indicators of personal records

### Service Layer

- `AnalyticsService`: Processes raw workout data into progress metrics
- `WorkoutAggregator`: Combines data from multiple workouts for a given exercise
- `MetricsCalculator`: Computes derived metrics from raw workout data

### Data Layer

- Relies on `WorkoutHistoryService` for source data
- Cached calculations for performance
- Local-only analytics (no server processing)

## Implementation Details

### Key Metrics Tracked

Progress tracking focuses on these primary metrics:

1. **Weight Progression**
   - One-rep max (calculated or actual)
   - Working weight used for similar rep ranges
   - Weight increases over time periods (week, month, year)

2. **Volume Metrics**
   - Total weight moved per exercise
   - Sets × reps × weight calculations
   - Volume trends over time

3. **Frequency Analysis**
   - Exercise frequency per time period
   - Body part/movement pattern frequency
   - Rest periods between similar workouts

4. **Personal Records**
   - Weight PRs at various rep ranges
   - Volume PRs per session
   - Streak and consistency records

### Data Visualization

Progress is visualized through:

- Line charts for weight/volume progression
- Bar charts for frequency analysis
- Milestone markers for personal records
- Heat maps for workout frequency

### Exercise Selection

Users can track progress for:

- Individual exercises (e.g., Barbell Bench Press)
- Exercise categories (e.g., all bench press variations)
- Movement patterns (e.g., all pushing movements)
- Body parts (e.g., all chest exercises)

### Implementation Considerations

Progress tracking presents several challenges addressed in the implementation:

1. **Data Normalization**
   - Handling similar exercises with different names
   - Accounting for different equipment types
   - Normalizing units (kg/lbs)

2. **Valid Comparison**
   - Comparing similar set/rep schemes
   - Accounting for RPE/intensity differences
   - Filtering anomalous data points

3. **Performance Optimization**
   - Pre-calculating common metrics
   - Caching results for frequently viewed exercises
   - Progressive loading of historical data

## Related Documentation

- [Workout History Features](../history/index.md) - Source data for progress tracking
- [MVP and Targeted Rebuild](../../project/mvp_and_rebuild.md) - Overall MVP strategy
- [Profile Tab Architecture](./profile_architecture.md) - Overall profile tab design
