// types/workout.ts - handles how exercises are combined and tracked in workouts

import { BaseExercise, WorkoutExercise } from './exercise';

export type TemplateCategory = 
  | 'Full Body' 
  | 'Custom' 
  | 'Push/Pull/Legs' 
  | 'Upper/Lower' 
  | 'Cardio' 
  | 'CrossFit' 
  | 'Strength';

// Base state that all workout types extend
interface BaseWorkoutState {
  id: string;
  title: string;
  description?: string;
  notes: string;
  created_at: number;
  availability: {
    source: ('local' | 'nostr' | 'backup')[];
    lastSynced?: {
      backup?: number;
      nostr?: {
        timestamp: number;
        metadata: {
          id: string;
          pubkey: string;
          relayUrl: string;
          created_at: number;
        };
      };
    };
  };
}

// Active workout state used in WorkoutContext
export interface WorkoutState extends BaseWorkoutState {
  startTime: Date | null;
  endTime: Date | null;
  isActive: boolean;
  exercises: WorkoutExercise[];
  totalTime: number;
  isPaused: boolean;
  totalWeight: number;
  templateSource?: {
    id: string;
    title: string;
    category: TemplateCategory;
  };
}

// Workout template definition
export interface WorkoutTemplate extends BaseWorkoutState {
  type: 'strength' | 'circuit' | 'emom' | 'amrap';
  category: TemplateCategory;
  exercises: Array<{
    exercise: BaseExercise;
    targetSets: number;
    targetReps: number;
    notes?: string;
  }>;
  author?: {
    name: string;
    pubkey?: string;
  };
  metadata?: {
    lastUsed?: number;
    useCount?: number;
    averageDuration?: number;
  };
  isPublic: boolean;
  tags: string[];
  rounds?: number;
  duration?: number;  // in seconds
  interval?: number;  // in seconds
  restBetweenRounds?: number;  // in seconds
}

// Completed workout record
export interface WorkoutRecord extends BaseWorkoutState {
  exercises: Array<{
    exercise: BaseExercise;
    sets: Array<{
      weight: number;
      reps: number;
      type: 'warmup' | 'normal' | 'drop' | 'failure';
      isCompleted: boolean;
    }>;
    totalWeight: number;
  }>;
  startTime: number;
  endTime: number;
  totalWeight: number;
  templateId?: string;
  metrics?: {
    totalTime: number;
    totalVolume: number;
    exerciseCount: number;
    setCount: number;
    personalBests: Array<{
      exerciseId: string;
      metric: 'weight' | 'reps' | 'volume';
      value: number;
    }>;
  };
}

// Exercise progress tracking
export interface ExerciseProgress {
  exerciseId: string;
  history: Array<{
    date: number;
    workoutId: string;
    weight: number;
    reps: number;
    volume: number;
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
  trends: {
    lastMonth: {
      workouts: number;
      volumeChange: number;
      weightChange: number;
    };
    lastYear: {
      workouts: number;
      volumeChange: number;
      weightChange: number;
    };
  };
}

// Type guard functions
export function isWorkoutTemplate(workout: any): workout is WorkoutTemplate {
  return workout && 
    'type' in workout && 
    'category' in workout &&
    'exercises' in workout &&
    Array.isArray(workout.exercises);
}

export function isWorkoutRecord(workout: any): workout is WorkoutRecord {
  return workout && 
    'startTime' in workout && 
    'endTime' in workout &&
    'exercises' in workout &&
    Array.isArray(workout.exercises);
}