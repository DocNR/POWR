# Workout History Features

**Last Updated:** 2025-03-25  
**Status:** Active  
**Related To:** Workout Features, Nostr Integration

## Purpose

This document describes the workout history features in the POWR app, focusing on the MVP implementation. It covers history views, data sources, and sharing capabilities.

## Overview

The workout history feature allows users to:

1. View their past workout completions in chronological order
2. Review detailed workout data for completed sessions
3. Share workouts from history to Nostr
4. Access both local and Nostr-published workout records

The history implementation is designed with the following principles:

- Unified view of workouts from multiple sources
- Simple chronological listing
- Calendar-based frequency view
- Offline-first with sync capabilities
- Integration with social sharing

## Component Architecture

### High-Level Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Layer      │     │  Service Layer  │     │   Data Layer    │
│                 │     │                 │     │                 │
│ History List    │     │ History Service │     │ SQLite Storage  │
│ Calendar View   │◄───►│ Sharing Service │◄───►│ Nostr Events    │
│ Detail Views    │     │ Migration       │     │ Caching         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### UI Components

- `WorkoutHistoryList`: Primary chronological list of completed workouts
- `CalendarView`: Basic calendar visualization of workout frequency
- `WorkoutDetailView`: Expanded view of a single workout record
- `WorkoutShareButton`: Allows sharing of completed workouts to Nostr

### Service Layer

- `UnifiedWorkoutHistoryService`: Combined access to multiple history sources
- `EnhancedWorkoutHistoryService`: Local workout history management
- `NostrWorkoutHistoryService`: Remote workout history via Nostr
- `PublicationQueueService`: Queue for publishing workout records to Nostr

### Data Layer

- `SQLite`: Local storage for workout history
- `EventCache`: Cached Nostr events for workout records

## Implementation Details

### Data Sources

The workout history system supports multiple data sources:

1. **Local SQLite Database**
   - Primary storage for all workout records
   - Complete history regardless of connectivity
   - Stores workout details including exercises, sets, weights, etc.

2. **Nostr Events (kind 1301)**
   - Published workout records from the user
   - Records from template authors for attribution
   - Enables social sharing and discovery

### History Views

#### Chronological View
- Lists workouts by date, newest first
- Displays workout name, date, and basic summary
- Links to detailed workout view
- Includes sharing capability to publish to Nostr

#### Calendar View
- Basic monthly calendar visualization
- Shows dates with completed workouts
- Simple tap to see workouts on a specific date

#### Workout Details
- Complete set/rep/weight data
- Comparison to template (if used)
- Notes from workout
- Option to share to Nostr

### Sharing to Nostr

The history view includes the ability to share workouts to Nostr:

1. User selects "Share" on any workout in history
2. User can add a note/caption
3. System publishes a kind 1301 workout record event
4. Optionally publishes a kind 1 note quoting the workout record

This aligns with the MVP sharing functionality in the workout completion flow but extends it to previously completed workouts.

### MVP Implementation Focus

For the MVP release, the history tab focuses on:

1. **Basic Workout History Display**
   - Chronological list of workouts
   - Simple calendar view
   - Detailed workout view

2. **Workout Sharing**
   - Publishing kind 1301 workout records from history
   - Enabling sharing of previously completed workouts

3. **Unified History Sources**
   - Showing both local and Nostr-published workouts
   - Basic deduplication of records from multiple sources

## Related Documentation

- [Workout Completion Flow](../workout/completion_flow.md) - How workouts are recorded
- [Nostr Exercise NIP](../../technical/nostr/exercise_nip.md) - Protocol for workout data
- [MVP and Targeted Rebuild](../../project/mvp_and_rebuild.md) - Overall MVP strategy
- [Progress Tracking](../../features/profile/progress_tracking.md) - How progress is tracked in the profile tab
