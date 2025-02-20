// types/template.ts
import { BaseExercise, ExerciseCategory } from './exercise';
import { StorageSource, SyncableContent } from './shared';
import { generateId } from '@/utils/ids';

/**
 * Template Classifications
 */
export type TemplateType = 'strength' | 'circuit' | 'emom' | 'amrap';

export type TemplateCategory = 
  | 'Full Body' 
  | 'Push/Pull/Legs' 
  | 'Upper/Lower' 
  | 'Custom' 
  | 'Cardio' 
  | 'CrossFit' 
  | 'Strength'
  | 'Conditioning';

/**
 * Exercise configurations within templates
 */
export interface TemplateExerciseDisplay {
  title: string;
  targetSets: number;
  targetReps: number;
  notes?: string;
}

export interface TemplateExerciseConfig {
  exercise: BaseExercise;
  targetSets: number;
  targetReps: number;
  weight?: number;
  rpe?: number;
  setType?: 'warmup' | 'normal' | 'drop' | 'failure';
  restSeconds?: number;
  notes?: string;
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

/**
 * Template versioning and derivation tracking
 */
export interface TemplateSource {
  id: string;
  eventId?: string;
  authorName?: string;
  authorPubkey?: string;
  version?: number;
}

/**
 * Base template properties shared between UI and database
 */
export interface TemplateBase {
  id: string;
  title: string;
  type: TemplateType;
  category: TemplateCategory;
  description?: string;
  tags: string[];
  metadata?: {
    lastUsed?: number;
    useCount?: number;
    averageDuration?: number;
  };
  author?: {
    name: string;
    pubkey?: string;
  };
}

/**
 * UI Template - Used for display and interaction
 */
export interface Template extends TemplateBase {
  exercises: TemplateExerciseDisplay[];
  source: 'local' | 'powr' | 'nostr';
  isFavorite: boolean;  // Required for UI state
}

/**
 * Full Template - Used for database storage and Nostr events
 */
export interface WorkoutTemplate extends TemplateBase, SyncableContent {
  exercises: TemplateExerciseConfig[];
  isPublic: boolean;
  version: number;
  
  // Template configuration
  format?: {
    weight?: boolean;
    reps?: boolean;
    rpe?: boolean;
    set_type?: boolean;
  };
  format_units?: {
    weight: 'kg' | 'lbs';
    reps: 'count';
    rpe: '0-10';
    set_type: 'warmup|normal|drop|failure';
  };
  
  // Workout specific configuration
  rounds?: number;
  duration?: number;
  interval?: number;
  restBetweenRounds?: number;
  
  // Template derivation
  sourceTemplate?: TemplateSource;
  derivatives?: {
    count: number;
    lastCreated: number;
  };
  
  // Nostr integration
  nostrEventId?: string;
}

/**
 * Helper Functions
 */

/**
 * Gets a display string for the template source
 */
export function getSourceDisplay(template: WorkoutTemplate): string {
  if (!template.sourceTemplate) {
    return template.availability.source.includes('nostr') 
      ? 'NOSTR'
      : template.availability.source.includes('powr')
        ? 'POWR'
        : 'Local Template';
  }

  const author = template.sourceTemplate.authorName || 'Unknown Author';
  if (template.sourceTemplate.version) {
    return `Modified from ${author} (v${template.sourceTemplate.version})`;
  }
  return `Original by ${author}`;
}

/**
 * Converts a WorkoutTemplate to Template for UI display
 */
export function toTemplateDisplay(template: WorkoutTemplate): Template {
  return {
    id: template.id,
    title: template.title,
    type: template.type,
    category: template.category,
    description: template.description,
    exercises: template.exercises.map(ex => ({
      title: ex.exercise.title,
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      notes: ex.notes
    })),
    tags: template.tags,
    source: template.availability.source.includes('nostr') 
      ? 'nostr' 
      : template.availability.source.includes('powr')
        ? 'powr'
        : 'local',
    isFavorite: false,
    metadata: template.metadata,
    author: template.author
  };
}

/**
 * Converts a Template to WorkoutTemplate for storage/sync
 */
export function toWorkoutTemplate(template: Template): WorkoutTemplate {
  return {
    ...template,
    exercises: template.exercises.map(ex => ({
      exercise: {
        id: generateId(),
        title: ex.title,
        type: 'strength',
        category: 'Push' as ExerciseCategory,
        tags: [],
        availability: {
          source: ['local']
        },
        created_at: Date.now()
      },
      targetSets: ex.targetSets,
      targetReps: ex.targetReps,
      notes: ex.notes
    })),
    isPublic: false,
    version: 1,
    created_at: Date.now(),
    availability: {
      source: ['local']
    }
  };
}