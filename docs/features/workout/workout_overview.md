# Workout Tab Overview

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Workout Features, Core Functionality

## Purpose

This document provides a comprehensive overview of the workout tab functionality in the POWR app, including architecture, implementation details, and development roadmap. It covers the technical design of workout tracking, exercise management, and workout completion flow.

## Problem Statement

Users need a dedicated interface for tracking workout sessions in real-time, including starting new workouts from templates or creating custom workouts on the fly. The workout experience must support various workout types (strength, circuit, EMOM, AMRAP), maintain offline functionality, and prepare for future Nostr integration.

## Requirements

### Functional Requirements

- Start new workouts from templates or create custom workouts
- Track sets, reps, weight, and other exercise metrics in real-time
- Support rest timers between sets and exercises
- Allow recording of RPE (Rate of Perceived Exertion)
- Enable workout notes and feedback
- Save completed workout history
- Track PRs (Personal Records)
- Support various workout structures (traditional, circuit, EMOM, AMRAP)
- Provide workout summary statistics

### Non-Functional Requirements

- Performant timer implementation (accurate to within 100ms)
- Smooth UI experience during workout tracking
- Reliable offline functionality
- Data persistence during app crashes
- Battery-efficient implementation
- Support for future Nostr event publishing (kinds 33401-33403)

## Design Decisions

### 1. Workout State Management

**Approach:** Context-based state management with reducers

**Rationale:**
- Workouts require complex state that needs to be accessed by multiple components
- Reducer pattern provides predictable state transitions
- Context allows state sharing without prop drilling
- Enables isolation of workout logic from UI components

### 2. Timer Implementation

**Approach:** Custom hook-based timer with requestAnimationFrame

**Rationale:**
- More accurate than setInterval for visual timing
- Better battery performance than interval-based approaches
- Handles background/foreground transitions gracefully
- Can be paused/resumed without drift

### 3. Offline Data Persistence

**Approach:** Incremental SQLite saves with optimistic UI updates

**Rationale:**
- Balances performance with data safety
- Prevents data loss during crashes
- Maintains responsive UI during saves
- Supports future sync capabilities

### 4. Template-to-Workout Transformation

**Approach:** Deep copy with runtime customization

**Rationale:**
- Preserves template integrity
- Allows workout-specific modifications
- Maintains type safety
- Supports progression tracking

## Technical Design

### Core Components

#### WorkoutProvider (Context)

```typescript
interface WorkoutContextState {
  status: 'idle' | 'active' | 'paused' | 'completed';
  activeWorkout: Workout | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  elapsedTime: number;
  restTimers: {
    isActive: boolean;
    duration: number;
    remaining: number;
  };
}

type WorkoutAction = 
  | { type: 'START_WORKOUT', payload: Workout }
  | { type: 'PAUSE_WORKOUT' }
  | { type: 'RESUME_WORKOUT' }
  | { type: 'COMPLETE_WORKOUT' }
  | { type: 'UPDATE_SET', payload: { exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet> } }
  | { type: 'NEXT_EXERCISE' }
  | { type: 'PREVIOUS_EXERCISE' }
  | { type: 'START_REST_TIMER', payload: number }
  | { type: 'TICK_TIMER', payload: number };

function workoutReducer(state: WorkoutContextState, action: WorkoutAction): WorkoutContextState {
  // State transitions and logic
}
```

#### Workout Screen Structure

```typescript
// Main layout components
function WorkoutScreen() {
  // Handles routing between idle/active states
}

function ActiveWorkoutScreen() {
  // Active workout tracking UI
}

function WorkoutSetupScreen() {
  // Template selection or custom workout creation
}

function WorkoutSummaryScreen() {
  // Post-workout summary and stats
}
```

#### Timer Hook

```typescript
function useWorkoutTimer({
  isActive,
  onTick,
}: {
  isActive: boolean;
  onTick: (elapsedMs: number) => void;
}) {
  // Timer implementation using requestAnimationFrame
  // Handles background/foreground transitions
}
```

### Database Schema Extensions

Building on the existing schema, we'll add:

```sql
-- Workout tracking
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  completed BOOLEAN DEFAULT 0,
  notes TEXT,
  total_volume REAL,
  template_id TEXT,
  nostr_event_id TEXT,
  FOREIGN KEY(template_id) REFERENCES templates(id)
);

-- Individual workout exercises
CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY(exercise_id) REFERENCES exercises(id)
);

-- Set data
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  workout_exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight REAL,
  reps INTEGER,
  rpe REAL,
  completed BOOLEAN DEFAULT 0,
  set_type TEXT NOT NULL,
  timestamp INTEGER,
  FOREIGN KEY(workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
);

-- Personal records
CREATE TABLE IF NOT EXISTS personal_records (
  id TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  workout_id TEXT NOT NULL,
  achieved_at INTEGER NOT NULL,
  FOREIGN KEY(exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  FOREIGN KEY(workout_id) REFERENCES workouts(id)
);
```

### TypeScript Definitions

```typescript
// Workout Types
export interface Workout {
  id: string;
  title: string;
  type: WorkoutType;
  exercises: WorkoutExercise[];
  startTime: number;
  endTime?: number;
  isCompleted: boolean;
  notes?: string;
  templateId?: string;
  totalVolume?: number;
}

export type WorkoutType = 'strength' | 'circuit' | 'emom' | 'amrap';

// PR Tracking
export interface PersonalRecord {
  id: string;
  exerciseId: string;
  metric: 'weight' | 'reps' | 'volume';
  value: number;
  workoutId: string;
  achievedAt: number;
}
```

## User Interface Design

### Workout Flow

#### 1. Idle State / Setup
- Option to start from template
- Option to create custom workout
- Quick-start recent workouts
- Template browsing/filtering

#### 2. Active Workout Screens
- **Header:** Workout title, timer, complete button
- **Exercise Navigation:** Current exercise, navigation controls
- **Set Tracking:** Weight/reps input, rest timer, RPE selection
- **Notes:** Exercise-specific notes field
- **Progress:** Visual indicators of completion status

#### 3. Summary Screen
- Workout duration
- Total volume
- PR achievements
- Exercise completion rates
- Option to add notes
- Share capabilities (future Nostr publishing)

### UI Components

#### WorkoutHeader
Displays current status, elapsed time, and workout controls

#### ExerciseTracker
Primary interface for tracking sets of current exercise

#### RestTimer
Visual countdown with sound/vibration alerts

#### WorkoutSummary
Post-workout statistics and achievements

## Implementation Status

### Completed
- Core workout context and reducer implementation
- Basic exercise tracking UI
- Template-to-workout conversion
- SQLite persistence layer
- Rest timer functionality

### In Progress
- Workout summary screen enhancements
- PR detection and tracking
- Circuit workout support

### Planned
- EMOM/AMRAP workout types
- Advanced statistics and tracking
- Full Nostr integration for sharing

## Future Considerations

### Potential Enhancements
- Voice feedback during workouts
- Video form checking integration
- Social sharing via Nostr
- Workout streaks and achievements
- AI-powered workout recommendations
- Heart rate monitor integration
- Barcode scanner for gym equipment

### Known Limitations
- Timer may drift slightly in background
- Workout types limited to predefined structures
- No direct hardware integrations in MVP
- Offline-only in initial implementation

## Related Documentation

- [Workout Completion Flow](./completion_flow.md) - Details on the workout completion process
- [UI Components](./ui_components.md) - Workout-specific UI components
- [Data Models](./data_models.md) - Workout data structures
- [Implementation Roadmap](./implementation_roadmap.md) - Phased implementation plan
- [Nostr Exercise NIP](../../technical/nostr/exercise_nip.md) - Technical specification for workout event format
