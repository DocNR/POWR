// types/workout.ts
import type { WorkoutTemplate, TemplateType } from './templates';
import type { BaseExercise } from './exercise';
import type { SyncableContent } from './shared';
import type { NostrEvent } from './nostr';
import { generateId } from '@/utils/ids';

/**
 * Core workout status types
 */
export type WorkoutStatus = 'idle' | 'active' | 'paused' | 'completed';

/**
 * Individual workout set
 */
export interface WorkoutSet {
  id: string;
  weight?: number;
  reps?: number;
  rpe?: number;
  type: 'warmup' | 'normal' | 'drop' | 'failure';
  isCompleted: boolean;
  notes?: string;
  timestamp?: number;
  lastUpdated?: number;
  completedAt?: number;
  duration?: number;
}

/**
 * Exercise within a workout
 */
export interface WorkoutExercise extends BaseExercise {
  exerciseId?: string;
  sets: WorkoutSet[];
  targetSets?: number;
  targetReps?: number;
  notes?: string;
  restTime?: number; // Rest time in seconds
  isCompleted?: boolean;
  lastUpdated?: number;
}

/**
 * Active workout tracking
 */
export interface Workout extends SyncableContent {
  id: string;
  title: string;
  type: TemplateType;
  exercises: WorkoutExercise[];
  startTime: number;
  endTime?: number;
  notes?: string;
  lastUpdated?: number;
  tags?: string[];
  
  // Template reference if workout was started from template
  templateId?: string; // Keep only one templateId property
  templatePubkey?: string; // Add this for template references
  
  // Add shareStatus property
  shareStatus?: 'local' | 'public' | 'limited';
  
  // Workout configuration
  rounds?: number;
  duration?: number;
  interval?: number;
  restBetweenRounds?: number;
  
  // Workout metrics
  totalVolume?: number;
  totalReps?: number;
  averageRpe?: number;
  
  // Completion tracking
  isCompleted: boolean;
  roundsCompleted?: number;
  exercisesCompleted?: number;
  
  // For Nostr integration
  nostrEventId?: string;
}

/**
 * Options for completing a workout
 */
export interface WorkoutCompletionOptions {
  // Storage option
  storageType: 'local_only' | 'publish_complete' | 'publish_limited';
  
  // Social sharing option
  shareOnSocial: boolean;
  socialMessage?: string;
  
  // Template update options
  templateAction: 'keep_original' | 'update_existing' | 'save_as_new';
  newTemplateName?: string;
  
  // Workout description - added to the workout record content
  workoutDescription?: string;
}

/**
 * Personal Records
 */
export interface PersonalRecord {
  id: string;
  exerciseId: string;
  metric: 'weight' | 'reps' | 'volume' | 'time';
  value: number;
  workoutId: string;
  achievedAt: number;
  
  // Context about the PR
  exercise: {
    title: string;
    equipment?: string;
  };
  previousValue?: number;
  notes?: string;
}

/**
 * Workout Summary Statistics
 */
export interface WorkoutSummary {
  id: string;
  title: string;
  type: TemplateType;
  duration: number;      // Total time in milliseconds
  startTime: number;
  endTime: number;
  
  // Overall stats
  exerciseCount: number;
  completedExercises: number;
  totalVolume: number;
  totalReps: number;
  averageRpe?: number;
  
  // Exercise-specific summaries
  exerciseSummaries: Array<{
    exerciseId: string;
    title: string;
    setCount: number;
    completedSets: number;
    volume: number;
    peakWeight?: number;
    totalReps: number;
    averageRpe?: number;
  }>;
  
  // Achievements
  personalRecords: PersonalRecord[];
}

/**
 * Rest Timer State
 */
export interface RestTimer {
  isActive: boolean;
  duration: number;      // Total rest duration in seconds
  remaining: number;     // Remaining time in seconds
  exerciseId?: string;   // Associated exercise if any
  setIndex?: number;     // Associated set if any
}

/**
 * Global Workout State
 */
export interface WorkoutState {
  status: WorkoutStatus;
  activeWorkout: Workout | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  elapsedTime: number;   // Total workout time in milliseconds
  lastSaved?: number;    // Timestamp of last save
  restTimer: RestTimer;
}

/**
 * Workout Actions
 */
export type WorkoutAction = 
  | { type: 'START_WORKOUT'; payload: Partial<Workout> }
  | { type: 'PAUSE_WORKOUT' }
  | { type: 'RESUME_WORKOUT' }
  | { type: 'COMPLETE_WORKOUT' }
  | { type: 'UPDATE_SET'; payload: { exerciseIndex: number; setIndex: number; data: Partial<WorkoutSet> } }
  | { type: 'NEXT_EXERCISE' }
  | { type: 'PREVIOUS_EXERCISE' }
  | { type: 'START_REST'; payload: number }
  | { type: 'STOP_REST' }
  | { type: 'TICK'; payload: number }
  | { type: 'RESET' };

/**
 * Helper functions
 */

/**
 * Converts a template to an active workout
 */
export function templateToWorkout(template: WorkoutTemplate): Workout {
  return {
    id: generateId('nostr'),
    title: template.title,
    type: template.type,
    exercises: template.exercises.map(ex => ({
      ...ex.exercise,
      sets: Array(ex.targetSets).fill({
        id: generateId('nostr'),
        type: 'normal',
        reps: ex.targetReps,
        isCompleted: false
      }),
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      notes: ex.notes
    })),
    templateId: template.id,
    startTime: Date.now(),
    isCompleted: false,
    rounds: template.rounds,
    duration: template.duration,
    interval: template.interval,
    restBetweenRounds: template.restBetweenRounds,
    created_at: Date.now(),
    availability: {
      source: ['local']
    }
  };
}

/**
 * Creates a Nostr workout record event
 */
export function createNostrWorkoutEvent(workout: Workout): NostrEvent {
    const exerciseTags = workout.exercises.flatMap(exercise => 
      exercise.sets.map(set => [
        'exercise',
        `33401:${exercise.id}`,
        set.weight?.toString() || '',
        set.reps?.toString() || '',
        set.rpe?.toString() || '',
        set.type
      ])
    );
  
    const workoutTags = workout.tags ? workout.tags.map(tag => ['t', tag]) : [];
  
    return {
      kind: 33403,
      content: workout.notes || '',
      tags: [
        ['d', workout.id],
        ['title', workout.title],
        ['type', workout.type],
        ['start', Math.floor(workout.startTime / 1000).toString()],
        ['end', Math.floor(workout.endTime! / 1000).toString()],
        ['completed', workout.isCompleted.toString()],
        ...exerciseTags,
        ...workoutTags
      ],
      created_at: Math.floor(Date.now() / 1000)
    };
  }
