// utils/nostr-transformers.ts
import { generateId } from '@/utils/ids';
import { 
  NostrEvent, 
  NostrEventKind, 
  getTagValue, 
  getTagValues 
} from '@/types/events';
import { 
  BaseExercise,
  WorkoutExercise,
  WorkoutSet 
} from '@/types/exercise';
import { 
  WorkoutTemplate,
  WorkoutRecord,
  TemplateCategory
} from '@/types/workout';
import { 
  validateNostrExerciseEvent, 
  validateNostrTemplateEvent,
  validateNostrWorkoutEvent 
} from './validation';

export function exerciseToNostrEvent(exercise: BaseExercise): NostrEvent {
  return {
    kind: NostrEventKind.EXERCISE_TEMPLATE,
    content: exercise.description || '',
    tags: [
      ['d', exercise.id],
      ['name', exercise.name],
      ['type', exercise.type],
      ['category', exercise.category],
      ['equipment', exercise.equipment || ''],
      ...exercise.tags.map(tag => ['t', tag]),
      ['format', JSON.stringify(exercise.format)],
      ['format_units', JSON.stringify(exercise.format_units)],
      exercise.instructions ? ['instructions', ...exercise.instructions] : []
    ].filter(tag => tag.length > 0),
    created_at: Math.floor(exercise.created_at / 1000)
  };
}

export function workoutToNostrEvent(workout: WorkoutRecord): NostrEvent {
  const tags: string[][] = [
    ['d', generateId('nostr')],
    ['title', workout.title],
    ['type', 'strength'],
    ['start', Math.floor(workout.startTime / 1000).toString()],
    ['end', Math.floor(workout.endTime / 1000).toString()],
    ['completed', 'true']
  ];

  workout.exercises.forEach(exercise => {
    tags.push([
      'exercise',
      exercise.exercise.id,
      exercise.exercise.type,
      exercise.exercise.category,
      JSON.stringify(exercise.sets.map(set => ({
        weight: set.weight,
        reps: set.reps,
        completed: set.isCompleted
      })))
    ]);
  });

  if (workout.totalWeight) {
    tags.push(['total_weight', workout.totalWeight.toString()]);
  }

  if (workout.metrics) {
    tags.push(['metrics', JSON.stringify(workout.metrics)]);
  }

  return {
    kind: NostrEventKind.WORKOUT_RECORD,
    content: workout.notes || '',
    created_at: Math.floor(workout.created_at / 1000),
    tags
  };
}

export function templateToNostrEvent(template: WorkoutTemplate): NostrEvent {
  const tags: string[][] = [
    ['d', generateId()],
    ['title', template.title],
    ['category', template.category],
    ['type', template.type]
  ];

  // Add timing parameters if present
  if (template.rounds) tags.push(['rounds', template.rounds.toString()]);
  if (template.duration) tags.push(['duration', template.duration.toString()]);
  if (template.interval) tags.push(['interval', template.interval.toString()]);
  if (template.restBetweenRounds) {
    tags.push(['rest_between_rounds', template.restBetweenRounds.toString()]);
  }

  // Add exercises
  template.exercises.forEach(ex => {
    tags.push([
      'exercise',
      ex.exercise.id,
      JSON.stringify({
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        notes: ex.notes
      })
    ]);
  });

  // Add template tags
  template.tags.forEach(tag => tags.push(['t', tag]));

  return {
    kind: NostrEventKind.WORKOUT_TEMPLATE,
    content: template.description || '',
    created_at: Math.floor(template.created_at / 1000),
    tags
  };
}

export function nostrEventToWorkout(event: NostrEvent): WorkoutRecord {
  if (!validateNostrWorkoutEvent(event)) {
    throw new Error('Invalid Nostr workout event');
  }

  const title = getTagValue(event.tags, 'title') || 'Untitled Workout';
  const start = parseInt(getTagValue(event.tags, 'start') || '0') * 1000;
  const end = parseInt(getTagValue(event.tags, 'end') || '0') * 1000;
  const totalWeight = parseInt(getTagValue(event.tags, 'total_weight') || '0');

  const exercises = event.tags
    .filter(tag => tag[0] === 'exercise')
    .map(tag => {
      const [_, id, type, category, setsData] = tag;
      const sets = JSON.parse(setsData);

      return {
        exercise: { id } as BaseExercise, // Exercise details to be populated by caller
        sets: sets.map((set: any) => ({
          weight: set.weight,
          reps: set.reps,
          isCompleted: set.completed
        })),
        totalWeight: sets.reduce((total: number, set: any) => 
          total + (set.weight || 0) * (set.reps || 0), 0)
      };
    });

  return {
    id: event.id || generateId(),
    title,
    exercises,
    startTime: start,
    endTime: end,
    totalWeight,
    notes: event.content,
    created_at: event.created_at * 1000,
    availability: {
      source: ['nostr'],
      lastSynced: {
        nostr: {
          timestamp: Date.now(),
          metadata: {
            id: event.id!,
            pubkey: event.pubkey!,
            relayUrl: '',
            created_at: event.created_at
          }
        }
      }
    }
  };
}

export function nostrEventToTemplate(event: NostrEvent): WorkoutTemplate {
  if (!validateNostrTemplateEvent(event)) {
    throw new Error('Invalid Nostr template event');
  }

  const title = getTagValue(event.tags, 'title') || 'Untitled Template';
  const category = getTagValue(event.tags, 'category') as TemplateCategory;
  const type = getTagValue(event.tags, 'type') as WorkoutTemplate['type'];
  
  const exercises = event.tags
    .filter(tag => tag[0] === 'exercise')
    .map(tag => {
      const [_, id, configData] = tag;
      const config = JSON.parse(configData);
      
      return {
        exercise: { id } as BaseExercise, // Exercise details to be populated by caller
        targetSets: config.targetSets,
        targetReps: config.targetReps,
        notes: config.notes
      };
    });

  return {
    id: event.id || generateId(),
    title,
    type,
    description: event.content,
    category: category || 'Custom',
    exercises,
    tags: getTagValues(event.tags, 't'),
    rounds: parseInt(getTagValue(event.tags, 'rounds') || '0'),
    duration: parseInt(getTagValue(event.tags, 'duration') || '0'),
    interval: parseInt(getTagValue(event.tags, 'interval') || '0'),
    restBetweenRounds: parseInt(getTagValue(event.tags, 'rest_between_rounds') || '0'),
    isPublic: true,
    created_at: event.created_at * 1000,
    author: {
      name: 'Unknown',
      pubkey: event.pubkey
    },
    availability: {
      source: ['nostr'],
      lastSynced: {
        nostr: {
          timestamp: Date.now(),
          metadata: {
            id: event.id!,
            pubkey: event.pubkey!,
            relayUrl: '',
            created_at: event.created_at
          }
        }
      }
    }
  };
}