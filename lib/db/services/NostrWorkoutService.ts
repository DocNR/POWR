// lib/services/NostrWorkoutService.ts - updated
import { Workout } from '@/types/workout';
import { NostrEvent } from '@/types/nostr';

/**
 * Service for creating and handling Nostr workout events
 */
export class NostrWorkoutService {
  /**
   * Creates a complete Nostr workout event with all details
   */
  static createCompleteWorkoutEvent(workout: Workout): NostrEvent {
    return {
      kind: 1301, // As per NIP-4e spec
      content: workout.notes || '',
      tags: [
        ['d', workout.id],
        ['title', workout.title],
        ['type', workout.type],
        ['start', Math.floor(workout.startTime / 1000).toString()],
        ['end', workout.endTime ? Math.floor(workout.endTime / 1000).toString() : ''],
        ['completed', 'true'],
        // Add all exercise data with complete metrics
        ...workout.exercises.flatMap(exercise => 
          exercise.sets.map(set => [
            'exercise',
            `33401:${exercise.id}`,
            set.weight?.toString() || '',
            set.reps?.toString() || '',
            set.rpe?.toString() || '',
            set.type
          ])
        ),
        // Include template reference if workout was based on template
        ...(workout.templateId ? [['template', `33402:${workout.templateId}`]] : []),
        // Add any tags from the workout
        ...(workout.tags ? workout.tags.map(tag => ['t', tag]) : [])
      ],
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Creates a limited Nostr workout event with reduced metrics for privacy
   */
  static createLimitedWorkoutEvent(workout: Workout): NostrEvent {
    return {
      kind: 1301,
      content: workout.notes || '',
      tags: [
        ['d', workout.id],
        ['title', workout.title],
        ['type', workout.type],
        ['start', Math.floor(workout.startTime / 1000).toString()],
        ['end', workout.endTime ? Math.floor(workout.endTime / 1000).toString() : ''],
        ['completed', 'true'],
        // Add limited exercise data - just exercise names without metrics
        ...workout.exercises.map(exercise => [
          'exercise',
          `33401:${exercise.id}`
        ]),
        ...(workout.templateId ? [['template', `33402:${workout.templateId}`]] : []),
        ...(workout.tags ? workout.tags.map(tag => ['t', tag]) : [])
      ],
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Creates a social share event that quotes the workout record
   */
  static createSocialShareEvent(workoutEventId: string, message: string): NostrEvent {
    return {
      kind: 1, // Standard note
      content: message,
      tags: [
        // Quote the workout event
        ['q', workoutEventId],
        // Add hash tags for discovery
        ['t', 'workout'],
        ['t', 'fitness']
      ],
      created_at: Math.floor(Date.now() / 1000)
    };
  }
}