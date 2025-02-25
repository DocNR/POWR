// utils/workout.ts
import { generateId } from '@/utils/ids';
import type { 
  Workout, 
  WorkoutSet, 
  WorkoutExercise 
} from '@/types/workout';
import type { WorkoutTemplate } from '@/types/templates';

export function convertTemplateToWorkout(template: WorkoutTemplate) {
  // Convert template exercises to workout exercises with empty sets
  const exercises: WorkoutExercise[] = template.exercises.map((templateExercise) => {
    const now = Date.now();
    return {
      id: generateId('local'),
      title: templateExercise.exercise.title,
      type: templateExercise.exercise.type,
      category: templateExercise.exercise.category,
      equipment: templateExercise.exercise.equipment,
      tags: templateExercise.exercise.tags || [],
      availability: {
        source: ['local']
      },
      created_at: now,
      // Create the specified number of sets from template
      sets: Array.from({ length: templateExercise.targetSets }, (): WorkoutSet => ({
        id: generateId('local'),
        weight: 0, // Start empty, but could use last workout weight
        reps: templateExercise.targetReps, // Use target reps from template
        type: 'normal',
        isCompleted: false
      }))
    };
  });

  return {
    id: generateId('local'),
    title: template.title,
    type: template.type,
    exercises,
    description: template.description,
    startTime: Date.now(),
    isCompleted: false,
    created_at: Date.now(),
    availability: {
      source: ['local']
    }
  };
}