/**
 * useExerciseNames - React Query hook to resolve exercise names from various formats
 * 
 * This hook provides a standardized way to resolve exercise names from:
 * 1. Local database IDs (format: "local:id-hash")
 * 2. Global identifiers (format: "kind:pubkey:id")
 * 3. UUIDs and other unique identifiers
 * 
 * It implements a multi-step resolution process:
 * 1. First tries using any existing name from the exercise object
 * 2. Then attempts to parse the ID using pattern recognition
 * 3. Finally falls back to database lookup if possible
 */

import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '../queryKeys';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { createLogger } from '@/lib/utils/logger';
import { useNDK } from '@/lib/hooks/useNDK';
import { 
  ParsedWorkoutRecord, 
  ParsedTemplateExercise,
  parseWorkoutRecord, 
  extractExerciseName, 
  lookupExerciseTitle 
} from '@/types/nostr-workout';

// Create a module-specific logger that follows the app's logging system
const logger = createLogger('ExerciseNames');

// Type alias for the exercise resolution format
export type ExerciseNamesMap = Record<string, string>;

/**
 * Hook for resolving exercise names from a Nostr workout event
 */
export function useExerciseNamesFromEvent(event: NDKEvent | null | undefined) {
  const { ndk } = useNDK();
  
  return useQuery({
    queryKey: QUERY_KEYS.exercises.namesByEvent(event?.id || ''),
    queryFn: async (): Promise<ExerciseNamesMap> => {
      if (!event) return {};
      
      try {
        // Parse the workout record
        const workout = parseWorkoutRecord(event);
        return resolveExerciseNames(workout.exercises, ndk);
      } catch (error) {
        logger.error('Error resolving exercise names from event:', error);
        return {};
      }
    },
    // Cache for 15 minutes - exercise names don't change often
    staleTime: 15 * 60 * 1000,
    // Don't refetch on window focus - this data is stable
    refetchOnWindowFocus: false,
    // Enable only if we have an event
    enabled: !!event,
  });
}

/**
 * Hook for resolving exercise names from an already parsed workout record
 */
export function useExerciseNames(workout: ParsedWorkoutRecord | null | undefined) {
  const { ndk } = useNDK();
  
  return useQuery({
    queryKey: QUERY_KEYS.exercises.namesByWorkout(workout?.id || ''),
    queryFn: async (): Promise<ExerciseNamesMap> => {
      if (!workout || !workout.exercises) return {};
      
      try {
        return resolveExerciseNames(workout.exercises, ndk);
      } catch (error) {
        logger.error('Error resolving exercise names from workout:', error);
        return {};
      }
    },
    // Cache for 15 minutes - exercise names don't change often
    staleTime: 15 * 60 * 1000,
    // Don't refetch on window focus - this data is stable
    refetchOnWindowFocus: false,
    // Enable only if we have a workout with exercises
    enabled: !!(workout?.exercises && workout.exercises.length > 0),
  });
}

/**
 * Hook for resolving exercise names from template exercises
 * 
 * Enhanced to use the same comprehensive resolution strategy
 * as regular exercise name resolution
 */
export function useTemplateExerciseNames(
  templateId: string, 
  exercises: ParsedTemplateExercise[] | null | undefined
) {
  const { ndk } = useNDK();
  
  return useQuery({
    queryKey: [...QUERY_KEYS.exercises.all, 'templateExercises', templateId],
    queryFn: async (): Promise<ExerciseNamesMap> => {
      if (!exercises || exercises.length === 0) return {};
      
      // Convert template exercises to format compatible with resolveExerciseNames
      const adaptedExercises = exercises.map(exercise => ({
        id: exercise.reference,
        name: exercise.name
      }));
      
      // Use the same resolution logic as for workout exercises
      return resolveExerciseNames(adaptedExercises, ndk);
    },
    // Cache for 15 minutes
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!(exercises && exercises.length > 0),
  });
}

/**
 * Helper function to resolve exercise names from an array of exercises
 */
/**
 * Enhanced version of resolveExerciseNames that implements multiple resolution strategies
 * to ensure we get readable exercise names in all contexts
 * 
 * @param exercises Array of exercise objects to resolve names for
 * @param ndk Optional NDK instance for direct event fetching
 * @returns Map of exercise IDs to display names
 */
async function resolveExerciseNames(exercises: any[], ndk?: any): Promise<ExerciseNamesMap> {
  if (!exercises || exercises.length === 0) return {};
  
  logger.debug(`Resolving names for ${exercises.length} exercises`);
  if (exercises[0]) {
    logger.debug(`Exercise data sample:`, exercises[0]);
  }
  
  const names: ExerciseNamesMap = {};

  // RESOLUTION STRATEGY 0: Use NDK to fetch exercise events directly
  if (ndk) {
    // Get all exercise IDs that might be Nostr references (kind 33401)
    const nostrRefs = exercises
      .map(ex => {
        const id = typeof ex === 'string' ? ex : 
                'id' in ex ? ex.id : 
                'reference' in ex ? ex.reference : 
                'exerciseId' in ex ? ex.exerciseId : null;
        
        if (!id) return null;
        
        // Check for explicit Nostr kind:pubkey:id format
        if (id.includes(':')) {
          const parts = id.split(':');
          if (parts[0] === '33401') {
            return {
              exerciseId: id,
              eventId: parts.length > 2 ? parts[2] : parts[parts.length - 1]
            };
          }
        }
        
        return null;
      })
      .filter(Boolean);
    
    // If we have Nostr references, fetch them all at once
    if (nostrRefs.length > 0) {
      logger.debug(`Fetching ${nostrRefs.length} exercise events via NDK`);
      try {
        const eventIds = nostrRefs.map(ref => ref!.eventId);
        const events = await ndk.fetchEvents({ ids: eventIds });
        
        // Process each event to extract title
        events.forEach((event: any) => {
          // Find the title tag in the event
          const titleTag = event.tags.find((tag: any[]) => tag[0] === 'title');
          if (titleTag && titleTag.length > 1) {
            // Find which exercise this corresponds to
            const matchingRef = nostrRefs.find(ref => ref!.eventId === event.id);
            if (matchingRef) {
              names[matchingRef.exerciseId] = titleTag[1];
              logger.debug(`Found title for ${matchingRef.exerciseId}: ${titleTag[1]}`);
            }
          }
        });
      } catch (error) {
        logger.error('Error fetching exercise events:', error);
      }
    }
  }
  
  // Process each exercise in parallel for better performance
  await Promise.all(exercises.map(async (exercise, index) => {
    // Enhanced ID extraction with more formats supported
    const exerciseId = typeof exercise === 'string' ? exercise : 
                     'id' in exercise ? exercise.id : 
                     'reference' in exercise ? exercise.reference : 
                     'exerciseId' in exercise ? exercise.exerciseId :
                     `unknown-${index}`;
    
    // For debugging the exact format of IDs we're receiving
    logger.debug(`Processing exercise with ID: "${exerciseId}" (${typeof exerciseId})`);
    
    // RESOLUTION STRATEGY 1: Check for meaningful name in the exercise object
    if (exercise.name && exercise.name !== 'Exercise' && exercise.name !== 'Unknown Exercise') {
      logger.debug(`Found exercise name in object: ${exercise.name}`);
      names[exerciseId] = exercise.name;
      return;
    }
    
    // RESOLUTION STRATEGY 2: Handle POWR's specific ID format, with or without local: prefix
    let idToProcess = exerciseId;
    let localPrefix = false;
    
    // Check for and handle local: prefix
    if (exerciseId.startsWith('local:')) {
      idToProcess = exerciseId.substring(6);
      localPrefix = true;
      logger.debug(`Stripped local: prefix, processing ID: ${idToProcess}`);
    }
    
    // Check for POWR specific format
    const powrFormatMatch = idToProcess.match(/^(m[a-z0-9]{7}-[a-z0-9]{10})$/i);
    if (powrFormatMatch) {
      const idWithoutPrefix = powrFormatMatch[1];
      const betterName = `Exercise ${idWithoutPrefix.substring(1, 5).toUpperCase()}`;
      logger.debug(`Created better name for POWR format ID: ${betterName}`);
      names[exerciseId] = betterName;
      
      // Still try database lookup for a proper name
      try {
        // Try different variations of the ID for lookup
        const idVariations = [
          idToProcess,
          // If we already removed the local: prefix, don't need to try again
          localPrefix ? [] : (exerciseId.startsWith('local:') ? [exerciseId.substring(6)] : []),
        ].flat();
        
        for (const id of idVariations) {
          const dbTitle = await lookupExerciseTitle(id);
          if (dbTitle) {
            logger.debug(`Found in database: ${id} → ${dbTitle}`);
            names[exerciseId] = dbTitle;
            break;
          }
        }
      } catch (error) {
        logger.error(`Database lookup failed for ${exerciseId}:`, error);
        // Keep the better name we created earlier
      }
      
      return;
    }
    
    // RESOLUTION STRATEGY 3: Try extracting a name from the ID pattern using the helper
    const extractedName = extractExerciseName(idToProcess);
    logger.debug(`Extracted name for ${idToProcess}: ${extractedName}`);
    
    if (extractedName !== 'Exercise') {
      names[exerciseId] = extractedName;
      return;
    }
    
    // RESOLUTION STRATEGY 4: Database lookup as last resort
    try {
      // Try with and without "local:" prefix if we haven't already handled it
      const lookupIds = localPrefix ? [idToProcess] : [exerciseId, idToProcess];
      
      for (const id of lookupIds) {
        const dbTitle = await lookupExerciseTitle(id);
        if (dbTitle) {
          logger.debug(`Database lookup successful for ${id}: ${dbTitle}`);
          names[exerciseId] = dbTitle;
          return;
        }
      }
      
      // If we get here, nothing worked, use a generic name
      logger.debug(`No resolution found for ${exerciseId}, using generic name`);
      names[exerciseId] = `Exercise ${index + 1}`;
    } catch (error) {
      logger.error(`Error in name resolution process for ${exerciseId}:`, error);
      names[exerciseId] = `Exercise ${index + 1}`;
    }
  }));
  
  logger.debug('Final resolved names:', names);
  return names;
}
