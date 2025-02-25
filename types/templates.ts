// types/templates.ts
import { BaseExercise, Equipment, ExerciseCategory, SetType } from './exercise';
import { StorageSource, SyncableContent } from './shared';
import { generateId } from '@/utils/ids';

/**
 * Template Classifications
 * Aligned with NIP-33402
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
  setType?: SetType;
  restSeconds?: number;
  notes?: string;
  
  // Format configuration from NIP-33401
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
  
  // For timed workouts
  duration?: number;
  interval?: number;
  
  // For circuit/EMOM
  position?: number;
  roundRest?: number;
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
  notes?: string;
  tags: string[];
  
  // Workout structure
  rounds?: number;
  duration?: number;
  interval?: number;
  restBetweenRounds?: number;
  
  // Metadata
  metadata?: {
    lastUsed?: number;
    useCount?: number;
    averageDuration?: number;
    completionRate?: number;
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
  
  // Template derivation
  sourceTemplate?: TemplateSource;
  derivatives?: {
    count: number;
    lastCreated: number;
  };
  
  // Nostr integration
  nostrEventId?: string;
  relayUrls?: string[];
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
        equipment: 'barbell' as Equipment,
        tags: [],
        format: {
          weight: true,
          reps: true,
          rpe: true,
          set_type: true
        },
        format_units: {
          weight: 'kg',
          reps: 'count',
          rpe: '0-10',
          set_type: 'warmup|normal|drop|failure'
        },
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

/**
 * Creates a Nostr event from a template (NIP-33402)
 */
export function createNostrTemplateEvent(template: WorkoutTemplate) {
  return {
    kind: 33402,
    content: template.description || '',
    tags: [
      ['d', template.id],
      ['title', template.title],
      ['type', template.type],
      ...(template.rounds ? [['rounds', template.rounds.toString()]] : []),
      ...(template.duration ? [['duration', template.duration.toString()]] : []),
      ...(template.interval ? [['interval', template.interval.toString()]] : []),
      ...template.exercises.map(ex => [
        'exercise',
        `33401:${ex.exercise.id}`,
        ex.targetSets.toString(),
        ex.targetReps.toString(),
        ex.setType || 'normal'
      ]),
      ...template.tags.map(tag => ['t', tag])
    ],
    created_at: Math.floor(Date.now() / 1000)
  };
}