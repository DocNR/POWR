# POWR Workout Tab Design Document

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

## Implementation Plan

### Phase 1: Core Workout Flow (2 weeks)
1. Implement WorkoutContext and reducer
2. Build workout setup screen
3. Create basic exercise tracking UI
4. Implement timer functionality
5. Add SQLite persistence for workouts

### Phase 2: Advanced Features (2 weeks)
1. Implement rest timers with alerts
2. Add PR tracking and detection
3. Create workout summary screen
4. Support for different workout types
5. Add notes and feedback options

### Phase 3: Polish & Integration (1 week)
1. UI refinements and animations
2. Performance optimization
3. Integration with Nostr publishing
4. Add sharing capabilities
5. Final testing and bug fixes

## Testing Strategy

### Unit Tests
- Timer accuracy and pause/resume functionality
- State transitions in workout reducer
- Template transformation logic
- PR detection algorithms
- Exercise progression calculations

### Integration Tests
- Workout flow from setup to completion
- Data persistence during app lifecycle events
- Template-to-workout conversion
- History recording accuracy

### Performance Tests
- Timer precision under load
- UI responsiveness during data saving
- Battery usage monitoring
- Memory profiling during long workouts

## Observability

### Logging
- Workout state transitions
- Timer accuracy metrics
- Data save operations
- Error conditions

### Analytics (Future)
- Workout completion rates
- Average workout duration
- Most used templates
- Feature usage statistics

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

## Dependencies

### Runtime Dependencies
- SQLite for data persistence
- Timer implementation libraries
- Chart visualization for summary
- Haptic feedback for timers

### Development Dependencies
- Testing framework for timer accuracy
- Mock data generators
- Performance monitoring tools

## Security Considerations
- Personal fitness data privacy
- Optional anonymization for shared workouts
- Secure storage of personal records
- Permission handling for notifications

## Rollout Strategy

### Development Phase
1. Implement core workout tracking
2. Add template integration
3. Build timer functionality
4. Create persistence layer
5. Add summary statistics

### Production Deployment
1. Internal testing with sample workouts
2. Beta testing with power users
3. Phased rollout to all users
4. Monitoring for performance issues
5. Iterative improvements based on feedback

## References
- Nostr NIP-33401: Exercise Templates
- Nostr NIP-33402: Workout Templates
- Nostr NIP-33403: Workout Records
- React Native Animation Performance Guide
- SQLite Transaction Best Practices