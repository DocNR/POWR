// types/exercise.ts - handles everything about individual exercises
/* import { NostrEventKind } from './events';
 */
import { SyncableContent } from './shared';

// Exercise classification types
export type ExerciseType = 'strength' | 'cardio' | 'bodyweight';
export type ExerciseCategory = 'Push' | 'Pull' | 'Legs' | 'Core';
export type Equipment = 
  | 'bodyweight' 
  | 'barbell' 
  | 'dumbbell' 
  | 'kettlebell' 
  | 'machine' 
  | 'cable' 
  | 'other';

  export interface Exercise extends BaseExercise {
    source: 'local' | 'powr' | 'nostr';
    usageCount?: number;
    lastUsed?: Date;
    format_json?: string;  // For database storage
    format_units_json?: string;  // For database storage
    nostr_event_id?: string;  // For Nostr integration
  }

// Base library content interface
export interface LibraryContent extends SyncableContent {
  title: string;
  type: 'exercise' | 'workout' | 'program';
  description?: string;
  author?: {
    name: string;
    pubkey?: string;
  };
  category?: ExerciseCategory;
  equipment?: Equipment;
  source: 'local' | 'powr' | 'nostr';
  tags: string[];
  isPublic?: boolean;
}

// Basic exercise definition
export interface BaseExercise extends SyncableContent {
  title: string;
  type: ExerciseType;
  category: ExerciseCategory;
  equipment?: Equipment;
  description?: string;
  instructions?: string[];
  tags: string[];
  format?: {
    weight?: boolean;
    reps?: boolean;
    rpe?: boolean;
    set_type?: boolean;
  };
  format_units?: {
    weight?: 'kg' | 'lbs';
    reps?: 'count';
    rpe?: '0-10';
    set_type?: 'warmup|normal|drop|failure';
  };
}

// Set types and formats
export type SetType = 'warmup' | 'normal' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  weight?: number;
  reps?: number;
  rpe?: number;
  type: SetType;
  isCompleted: boolean;
  notes?: string;
  timestamp?: number;
}

// Exercise with workout-specific data
export interface WorkoutExercise extends BaseExercise {
  sets: WorkoutSet[];
  totalWeight?: number;
  notes?: string;
  restTime?: number; // Rest time in seconds
  targetSets?: number;
  targetReps?: number;
}

// Exercise template specific types
export interface ExerciseTemplate extends BaseExercise {
  defaultSets?: {
    type: SetType;
    weight?: number;
    reps?: number;
    rpe?: number;
  }[];
  recommendations?: {
    beginnerWeight?: number;
    intermediateWeight?: number;
    advancedWeight?: number;
    restTime?: number;
    tempo?: string;
  };
  variations?: string[];
  progression?: {
    type: 'linear' | 'percentage' | 'custom';
    increment?: number;
    rules?: string[];
  };
}

// Exercise history and progress tracking
export interface ExerciseHistory {
  exerciseId: string;
  entries: Array<{
    date: number;
    workoutId: string;
    sets: WorkoutSet[];
    totalWeight: number;
    notes?: string;
  }>;
  personalBests: {
    weight?: {
      value: number;
      date: number;
      workoutId: string;
    };
    reps?: {
      value: number;
      date: number;
      workoutId: string;
    };
    volume?: {
      value: number;
      date: number;
      workoutId: string;
    };
  };
}

// Type guards
export function isWorkoutExercise(exercise: any): exercise is WorkoutExercise {
  return exercise && Array.isArray(exercise.sets);
}

export function isExerciseTemplate(exercise: any): exercise is ExerciseTemplate {
  return exercise && 'recommendations' in exercise;
}