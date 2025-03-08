// utils/converter.ts - Simplified to just forward to NostrWorkoutService

import { Workout } from '@/types/workout';
import { WorkoutTemplate } from '@/types/templates';
import { NostrEvent } from '@/types/nostr';
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';

/**
 * Helper function to find a tag value in a Nostr event
 * @deprecated Use NostrWorkoutService.findTagValue instead
 */
export function findTagValue(tags: string[][], name: string): string | null {
  return NostrWorkoutService.findTagValue(tags, name);
}

/**
 * Get all values for a specific tag name
 * @deprecated Use NostrWorkoutService.getTagValues instead
 */
export function getTagValues(tags: string[][], name: string): string[] {
  return NostrWorkoutService.getTagValues(tags, name);
}

/**
 * Get template tag information
 * @deprecated Use NostrWorkoutService.getTemplateTag instead
 */
export function getTagValueByName(tags: string[][], name: string): string | null {
  return NostrWorkoutService.findTagValue(tags, name);
}

/**
 * Get tag values matching a pattern
 */
export function getTemplateTag(tags: string[][]): { reference: string, relay: string } | undefined {
  return NostrWorkoutService.getTemplateTag(tags);
}

/**
 * Convert a workout to a Nostr event
 */
export function workoutToNostrEvent(workout: Workout, isLimited: boolean = false): NostrEvent {
  return NostrWorkoutService.workoutToNostrEvent(workout, isLimited);
}

/**
 * Convert a Nostr event to a workout
 */
export function nostrEventToWorkout(event: NostrEvent): Workout {
  return NostrWorkoutService.nostrEventToWorkout(event);
}

/**
 * Convert a template to a Nostr event
 */
export function templateToNostrEvent(template: WorkoutTemplate): NostrEvent {
  return NostrWorkoutService.templateToNostrEvent(template);
}

/**
 * Convert a Nostr event to a template
 */
export function nostrEventToTemplate(event: NostrEvent): WorkoutTemplate {
  return NostrWorkoutService.nostrEventToTemplate(event);
}