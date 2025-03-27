# Workout UI Components

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Workout Features, UI Implementation

## Purpose

This document outlines the key UI components needed for the POWR workout tracking experience. The interface prioritizes readability during exercise, quick data entry, and clear visualization of progress.

## Core UI Components

### 1. Workout Header

```tsx
interface WorkoutHeaderProps {
  title: string;
  type: WorkoutType;
  elapsedTime: number;
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
}
```

#### Features
- Sticky header with minimized height
- Elapsed time with large, readable timer
- Workout title and type indicator
- Status indicators (active/paused)
- Action buttons (pause/resume/complete)
- Optional: calorie/heart rate display

#### Behavior
- Time updates every second
- Color changes based on active/paused state
- Confirm dialog appears before completing workout

### 2. Exercise Navigation

```tsx
interface ExerciseNavigationProps {
  exercises: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
  }>;
  currentIndex: number;
  onSelectExercise: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
}
```

#### Features
- Horizontal scroll for exercise list
- Current exercise highlighted
- Progress indicators showing completion status
- Previous/next navigation controls
- Jump-to capability for non-linear workouts

#### Behavior
- Swipe gestures to change exercises
- Auto-scrolls to keep current exercise visible
- Vibration feedback on exercise change
- Optional confirmation when leaving incomplete exercise

### 3. Set Tracker

```tsx
interface SetTrackerProps {
  sets: WorkoutSet[];
  exercise: WorkoutExercise;
  onUpdateSet: (setIndex: number, data: Partial<WorkoutSet>) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  showRestTimer: boolean;
  onStartRest: (duration: number) => void;
}
```

#### Features
- Individual set cards with weight/reps/RPE inputs
- Completion toggle for each set
- Previous set data for reference
- Support for different input types based on exercise format
- "Add Set" button for additional sets
- Rest timer trigger

#### Behavior
- Auto-focuses appropriate input field
- Supports quick incrementing/decrementing of values
- Auto-suggests rest time based on set intensity
- Remembers input patterns within workout
- Validates inputs against exercise constraints

### 4. Rest Timer

```tsx
interface RestTimerProps {
  duration: number;
  remaining: number;
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onExtend: (seconds: number) => void;
}
```

#### Features
- Large circular countdown display
- Visual progress indicator
- Time remaining in large font
- Control buttons (pause/resume/skip)
- Quick-extend buttons (+30s, +1m)
- Next exercise preview

#### Behavior
- Full-screen takeover when active
- Haptic feedback at 50% and 10% remaining
- Sound alert at completion (if enabled)
- Auto-dismisses after completion
- Background timer continues running
- Screen prevents sleep during active timer

### 5. Exercise Details Panel

```tsx
interface ExerciseDetailsPanelProps {
  exercise: WorkoutExercise;
  previousPerformance?: {
    date: number;
    sets: WorkoutSet[];
    personalBests: Record<string, number>;
  };
  onAddNote: (note: string) => void;
}
```

#### Features
- Collapsible panel for exercise details
- Form instructions and tips
- Previous performance metrics
- Personal best indicators
- Notes field for technique reminders
- Optional media previews (images/video)

#### Behavior
- Expandable/collapsible with smooth animation
- Auto-collapses during timer to maximize screen space
- Persists notes between workout sessions
- Highlights personal records

### 6. Workout Controls

```tsx
interface WorkoutControlsProps {
  canComplete: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onComplete: () => void;
  isActive: boolean;
}
```

#### Features
- Fixed position at screen bottom
- Primary action button (Complete Workout)
- Secondary actions (pause/resume)
- Cancel workout option
- Status indicators

#### Behavior
- Complete button enables when minimum criteria met
- Confirmation dialog for cancel action
- Smooth transition animations between states
- Haptic feedback on major actions

### 7. Workout Summary

```tsx
interface WorkoutSummaryProps {
  workout: CompletedWorkout;
  achievements: {
    personalRecords: PersonalRecord[];
    streaks: Streak[];
    milestones: Milestone[];
  };
  onSave: (notes: string) => void;
  onShare: () => void;
  onDiscard: () => void;
}
```

#### Features
- Comprehensive workout statistics
- Total volume, duration, and intensity metrics
- Exercise completion breakdown
- Personal records achieved
- Notes field for workout reflection
- Visual charts of performance
- Share and save controls

#### Behavior
- Scrollable container for all summary data
- Expandable sections for detailed stats
- Animated entry of achievement cards
- Pre-populates notes from during-workout entries
- Save confirmation with preview

## Layout Variations

### 1. Strength Workout Layout
Optimized for tracking weight, reps and rest periods.

- Prominent weight/rep inputs
- Set-rest-set pattern flow
- Previous lift stats readily visible
- PR tracking indicators
- Weight plate calculator

### 2. Circuit Workout Layout
Designed for quick transitions between exercises.

- Minimized input fields
- Prominent exercise timer
- Next exercise preview
- Round counter
- Overall circuit progress

### 3. EMOM/AMRAP Layout
Focused on timed intervals and rep counting.

- Large interval timer
- Quick rep counter
- Round progression
- Work/rest indicators
- Audio cues for intervals

## Interaction Patterns

### 1. Data Entry
- Single-tap to select input field
- Long-press for quick increment/decrement
- Swipe to mark set complete
- Shake to undo last action
- Double-tap to copy previous set values

### 2. Navigation
- Swipe between exercises
- Pull down to reveal workout overview
- Pull up for exercise details
- Pinch to zoom workout timeline
- Double-tap header to toggle timer visibility

### 3. Timers
- Tap timer to pause/resume
- Swipe up on timer for fullscreen mode
- Rotate device for alternative timer view
- Shake to skip timer
- Volume buttons as quick controls

## Accessibility Considerations

### 1. Visual
- High contrast mode for gym environments
- Large text option for all metrics
- Color-blind friendly progress indicators
- Screen rotation lock option
- Auto-brightness adjustment

### 2. Motor
- Large touch targets for sweaty hands
- Voice control for hands-free operation
- Simplified layout option with fewer controls
- Adjustable button sensitivity
- Support for external Bluetooth controls

### 3. Auditory
- Vibration patterns as alternative to sound
- Visual countdown alternatives
- Adjustable volume levels
- Custom sound selection
- Background noise filtering for voice features

## State Transitions

### 1. Idle → Active
- Template selection or quick start
- Exercise preview animation
- Timer initialization
- Welcome guidance (configurable)

### 2. Active → Paused
- Dim UI elements
- Prominent resume button
- Elapsed time continues but visually distinguished
- Quick access to notes and adjustments

### 3. Active → Complete
- Celebration animation
- Stats calculation overlay
- Achievement unlocks
- Social share prompts (optional)
- Return to home or next workout suggestion

## Theme Integration

All components should support both light and dark themes with special considerations:

1. **Dark gym mode** - Ultra-dark background with high contrast elements for poorly lit environments
2. **Outdoor mode** - High contrast, glare-resistant design for outdoor workouts
3. **Night mode** - Red-shifted colors to minimize blue light during evening workouts
4. **Energy saver** - Minimalist UI with reduced animations to maximize battery life

## Component Integration

These components will integrate with the existing POWR architecture:

1. **Component Library** - Extends existing UI components with workout-specific variants
2. **Theme System** - Utilizes current theme tokens with workout-specific additions
3. **Navigation** - Embeds within the tab navigation as a modal flow when active
4. **Context** - Consumes the WorkoutContext for state management

## Implementation Status

### Completed Components
- WorkoutHeader
- Exercise Navigation
- Basic Set Tracker
- Rest Timer (initial version)

### In Progress
- Exercise Details Panel
- Enhanced Set Tracker
- Workout Summary screen

### Planned
- Advanced state transitions
- Specialized workout type layouts
- Full accessibility implementation

## Related Documentation

- [Workout Overview](./workout_overview.md) - General workout feature architecture
- [Data Models](./data_models.md) - Data structures used by these components
- [Completion Flow](./completion_flow.md) - Details of the workout completion process
- [Implementation Roadmap](./implementation_roadmap.md) - Timeline for component development
