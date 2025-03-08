// types/exercise.ts
import { SyncableContent } from './shared';

/**
 * Core Exercise Classifications
 * These types define the fundamental ways we categorize exercises
 */
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

/**
 * Exercise Format Configuration
 * Defines how an exercise should be tracked and measured
 */
export interface ExerciseFormat {
  weight?: boolean;
  reps?: boolean;
  rpe?: boolean;
  set_type?: boolean;
}

export interface ExerciseFormatUnits {
  weight?: 'kg' | 'lbs';
  reps?: 'count';
  rpe?: '0-10';
  set_type?: 'warmup|normal|drop|failure';
}

/**
 * Base Exercise Definition
 * Contains the core properties that define an exercise
 */
export interface BaseExercise extends SyncableContent {
  title: string;
  type: ExerciseType;
  category: ExerciseCategory;
  equipment?: Equipment;
  description?: string;
  instructions?: string[];
  tags: string[];
  format?: ExerciseFormat;
  format_units?: ExerciseFormatUnits;
}

/**
 * Exercise UI Display
 * Extends BaseExercise with UI-specific properties
 */
export interface ExerciseDisplay extends BaseExercise {
  source: 'local' | 'powr' | 'nostr';
  usageCount?: number;
  lastUsed?: Date;
  isFavorite?: boolean;
}

/**
 * Set Types and Tracking
 */
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
  duration?: number; // Add this property
  completedAt?: number;
  lastUpdated?: number;
}

/**
 * Exercise with active workout data
 */
export interface WorkoutExercise extends BaseExercise {
  sets: WorkoutSet[];
  exerciseId?: string; 
  targetSets?: number;
  targetReps?: number;
  notes?: string;
  restTime?: number;
  isCompleted?: boolean;
  lastUpdated?: number;
}

/**
 * Exercise Template with recommendations and progression
 */
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

/**
 * Exercise History Tracking
 */
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

/**
 * Converts a BaseExercise to ExerciseDisplay
 */
export function toExerciseDisplay(exercise: BaseExercise): ExerciseDisplay {
  return {
    ...exercise, // Include all BaseExercise properties
    source: exercise.availability.source.includes('nostr')
      ? 'nostr'
      : exercise.availability.source.includes('powr')
        ? 'powr'
        : 'local',
    isFavorite: false
  };
}