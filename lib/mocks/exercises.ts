// lib/mocks/exercises.ts
import { NostrEvent } from '@/types/nostr';
import { Exercise, ExerciseType, ExerciseCategory, Equipment } from '@/types/exercise';
import { generateId } from '@/utils/ids';

// Mock exercise definitions that will become our initial POWR library
export const mockExerciseEvents: NostrEvent[] = [
  {
    kind: 33401,
    content: "Stand with feet hip-width apart, barbell racked on shoulders. Bend knees and hips to squat down, keeping chest up. Drive through heels to stand.",
    tags: [
      ["d", "bb-back-squat"],
      ["title", "Barbell Back Squat"],
      ["format", "weight", "reps", "rpe", "set_type"],
      ["format_units", "kg", "count", "0-10", "warmup|normal|drop|failure"],
      ["equipment", "barbell"],
      ["difficulty", "intermediate"],
      ["category", "legs"],
      ["t", "compound"],
      ["t", "squat"],
      ["t", "legs"],
      ["t", "quadriceps"]
    ],
    created_at: 1708300800, // Feb 19, 2024
    id: generateId('nostr'),
    pubkey: "powr", // We'll update this when we create the POWR relay
    sig: undefined
  },
  {
    kind: 33401,
    content: "Stand with feet shoulder-width apart, barbell on floor. Hinge at hips, grip bar outside knees. Keep back flat, drive through heels to lift.",
    tags: [
      ["d", "bb-deadlift"],
      ["title", "Barbell Deadlift"],
      ["format", "weight", "reps", "rpe", "set_type"],
      ["format_units", "kg", "count", "0-10", "warmup|normal|drop|failure"],
      ["equipment", "barbell"],
      ["difficulty", "intermediate"],
      ["category", "legs"],
      ["t", "compound"],
      ["t", "hinge"],
      ["t", "legs"],
      ["t", "posterior"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Lie on bench, feet flat on floor. Grip barbell slightly wider than shoulders. Lower bar to chest, press back up to start.",
    tags: [
      ["d", "bb-bench-press"],
      ["title", "Barbell Bench Press"],
      ["format", "weight", "reps", "rpe", "set_type"],
      ["format_units", "kg", "count", "0-10", "warmup|normal|drop|failure"],
      ["equipment", "barbell"],
      ["difficulty", "intermediate"],
      ["category", "push"],
      ["t", "compound"],
      ["t", "push"],
      ["t", "chest"],
      ["t", "triceps"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Start in plank position. Lower body by bending elbows, keeping body straight. Push back up to start position.",
    tags: [
      ["d", "pushup"],
      ["title", "Push-Up"],
      ["format", "reps", "set_type"],
      ["format_units", "count", "warmup|normal|drop|failure"],
      ["equipment", "bodyweight"],
      ["difficulty", "beginner"],
      ["category", "push"],
      ["t", "bodyweight"],
      ["t", "push"],
      ["t", "chest"],
      ["t", "triceps"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Hang from pull-up bar with overhand grip. Pull body up until chin clears bar, lower back to start.",
    tags: [
      ["d", "pullup"],
      ["title", "Pull-Up"],
      ["format", "reps", "set_type"],
      ["format_units", "count", "warmup|normal|drop|failure"],
      ["equipment", "bodyweight"],
      ["difficulty", "intermediate"],
      ["category", "pull"],
      ["t", "bodyweight"],
      ["t", "pull"],
      ["t", "back"],
      ["t", "biceps"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Sit at machine, grip handles at shoulder height. Press handles up overhead, return to start position.",
    tags: [
      ["d", "shoulder-press-machine"],
      ["title", "Shoulder Press Machine"],
      ["format", "weight", "reps", "set_type"],
      ["format_units", "kg", "count", "warmup|normal|drop|failure"],
      ["equipment", "machine"],
      ["difficulty", "beginner"],
      ["category", "push"],
      ["t", "machine"],
      ["t", "push"],
      ["t", "shoulders"],
      ["t", "triceps"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Stand with dumbbell in each hand at sides. Curl weights toward shoulders, keeping elbows close to body. Lower back down.",
    tags: [
      ["d", "db-bicep-curl"],
      ["title", "Dumbbell Bicep Curl"],
      ["format", "weight", "reps", "set_type"],
      ["format_units", "kg", "count", "warmup|normal|drop|failure"],
      ["equipment", "dumbbell"],
      ["difficulty", "beginner"],
      ["category", "pull"],
      ["t", "isolation"],
      ["t", "pull"],
      ["t", "biceps"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Attach rope to cable machine at top. Grip ends, pull down to chest level keeping elbows close. Control return.",
    tags: [
      ["d", "cable-tricep-pushdown"],
      ["title", "Cable Tricep Pushdown"],
      ["format", "weight", "reps", "set_type"],
      ["format_units", "kg", "count", "warmup|normal|drop|failure"],
      ["equipment", "cable"],
      ["difficulty", "beginner"],
      ["category", "push"],
      ["t", "isolation"],
      ["t", "push"],
      ["t", "triceps"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Kneel before cable machine, rope attachment at bottom. Pull rope toward forehead, keeping upper arms still. Lower with control.",
    tags: [
      ["d", "cable-face-pull"],
      ["title", "Cable Face Pull"],
      ["format", "weight", "reps", "set_type"],
      ["format_units", "kg", "count", "warmup|normal|drop|failure"],
      ["equipment", "cable"],
      ["difficulty", "intermediate"],
      ["category", "pull"],
      ["t", "isolation"],
      ["t", "pull"],
      ["t", "rear-deltoids"],
      ["t", "upper-back"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  },
  {
    kind: 33401,
    content: "Stand with feet hip-width, holding kettlebell by horns at chest. Squat down keeping chest up, stand back up.",
    tags: [
      ["d", "kb-goblet-squat"],
      ["title", "Kettlebell Goblet Squat"],
      ["format", "weight", "reps", "set_type"],
      ["format_units", "kg", "count", "warmup|normal|drop|failure"],
      ["equipment", "kettlebell"],
      ["difficulty", "beginner"],
      ["category", "legs"],
      ["t", "compound"],
      ["t", "squat"],
      ["t", "legs"],
      ["t", "quadriceps"]
    ],
    created_at: 1708300800,
    id: generateId('nostr'),
    pubkey: "powr",
    sig: undefined
  }
];

function getTagValue(tags: string[][], name: string): string | undefined {
    const tag = tags.find((tag: string[]) => tag[0] === name);
    return tag ? tag[1] : undefined;
  }
  
  function getTags(tags: string[][]): string[] {
    return tags
      .filter((tag: string[]) => tag[0] === 't')
      .map((tag: string[]) => tag[1]);
  }
  
  export function convertNostrToExercise(event: NostrEvent): Exercise {
    return {
      id: event.id || '',
      title: getTagValue(event.tags, 'title') || '',
      type: getTagValue(event.tags, 'equipment') === 'bodyweight' 
        ? 'bodyweight' 
        : 'strength' as ExerciseType,
      category: getTagValue(event.tags, 'category') as ExerciseCategory,
      equipment: getTagValue(event.tags, 'equipment') as Equipment,
      description: event.content,
      format: getTagValue(event.tags, 'format')
        ?.split(',')
        .reduce((acc: Record<string, boolean>, curr: string) => ({ 
          ...acc, 
          [curr]: true 
        }), {}),
      format_units: getTagValue(event.tags, 'format_units')
        ?.split(',')
        .reduce((acc: Record<string, string>, curr: string, i: number) => {
          const format = getTagValue(event.tags, 'format')?.split(',')[i];
          return format ? { ...acc, [format]: curr } : acc;
        }, {}),
      tags: getTags(event.tags),
      availability: {
        source: ['powr']
      },
      created_at: event.created_at * 1000,
      source: 'powr'
    };
  }

// Export pre-converted exercises for easy testing
export const mockExercises = mockExerciseEvents.map(convertNostrToExercise);

// Helper to seed the database
export async function seedExercises(exerciseService: any) {
  try {
    const existingCount = (await exerciseService.getAllExercises()).length;
    if (existingCount === 0) {
      console.log('Seeding database with mock exercises...');
      for (const exercise of mockExercises) {
        await exerciseService.createExercise(exercise);
      }
      console.log('Successfully seeded database');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}