// lib/services/NostrWorkoutService.ts
import { Workout, WorkoutExercise, WorkoutSet } from '@/types/workout';
import { WorkoutTemplate, TemplateExerciseConfig } from '@/types/templates';
import { NostrEvent } from '@/types/nostr';
import { generateId } from '@/utils/ids';
import { ExerciseCategory, ExerciseType } from '@/types/exercise';
import { TemplateType } from '@/types/templates';
/**
 * Service for creating and handling Nostr workout events
 */
export class NostrWorkoutService {
  /**
   * Creates a complete Nostr workout event with all details
   */
  static createCompleteWorkoutEvent(workout: Workout): NostrEvent {
    return this.workoutToNostrEvent(workout, false);
  }

  /**
   * Creates a limited Nostr workout event with reduced metrics for privacy
   */
  static createLimitedWorkoutEvent(workout: Workout): NostrEvent {
    return this.workoutToNostrEvent(workout, true);
  }

  /**
   * Creates a social share event that quotes the workout record
   */
  static createSocialShareEvent(workoutEventId: string, message: string): NostrEvent {
    return {
      kind: 1,
      content: message,
      tags: [
        // Quote the event
        ['q', workoutEventId],
        // Add kind tag
        ['k', '1301'],
        // Add standard fitness tag
        ['t', 'fitness'],
        // Add workout tag
        ['t', 'workout'],
        // Add powr tag
        ['t', 'powr'],
        // Add client tag for Nostr client display
        ['client', 'POWR App']
      ],
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Creates a social share event that quotes a POWR event
   * @param eventId The ID of the event being quoted
   * @param kind The kind number of the event being quoted (1301, 33401, 33402)
   * @param message The message content for the social post
   * @param additionalTags Optional additional tags to include
   */
  static createShareEvent(
    eventId: string, 
    kind: '1301' | '33401' | '33402', 
    message: string,
    additionalTags: string[][] = []
  ): NostrEvent {
    // Determine appropriate hashtags based on kind
    const contentTypeTags: string[][] = [];
    
    if (kind === '1301') {
      contentTypeTags.push(['t', 'workout']);
    } else if (kind === '33401') {
      contentTypeTags.push(['t', 'exercise']);
    } else if (kind === '33402') {
      contentTypeTags.push(['t', 'workouttemplate']);
    }
    
    return {
      kind: 1,
      content: message,
      tags: [
        // Quote the event
        ['q', eventId],
        // Add kind tag
        ['k', kind],
        // Add standard fitness tag
        ['t', 'fitness'],
        // Add content-specific tags
        ...contentTypeTags,
        // Add client tag
        ['client', 'POWR App'],
        // Add any additional tags
        ...additionalTags
      ],
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Creates a formatted social message for workout sharing
   */
  static createFormattedSocialMessage(workout: Workout, customMessage?: string): string {
    // Format date and time
    const startDate = new Date(workout.startTime);
    const endDate = workout.endTime ? new Date(workout.endTime) : new Date();
    const formattedDate = startDate.toLocaleDateString();
    const startTime = startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const endTime = endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Calculate duration
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Calculate total volume
    const totalVolume = workout.exercises.reduce((total, ex) => 
      total + ex.sets.reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0), 0);
    
    // Format the message
    let formattedMessage = 
      `${customMessage || ''}\n\n` +
      `#workout #${workout.type} #powr\n\n` +
      `🏋️ ${workout.title}\n` +
      `📅 ${formattedDate} ${startTime}-${endTime}\n` +
      `⏱️ Duration: ${hours > 0 ? `${hours}h ` : ''}${minutes}m\n` +
      `💪 Total Volume: ${totalVolume.toLocaleString()} kg\n\n`;

    // Add exercise details
    workout.exercises.forEach(exercise => {
      // Just use one of a few basic emojis
      let exerciseEmoji = "⚡"; // Zap as requested
      
      // Or alternatively use a small set based on broad categories
      if (exercise.type === "cardio") {
        exerciseEmoji = "🏃";
      } else if (exercise.type === "strength") {
        exerciseEmoji = "🏋️";
      }
      
      formattedMessage += `${exerciseEmoji} ${exercise.title}\n`;
      
      exercise.sets.filter(set => set.isCompleted).forEach((set, index) => {
        formattedMessage += `${index + 1}. ${set.weight || 0} Kg x ${set.reps || 0} Reps\n`;
      });
      
      formattedMessage += '\n';
    });
    
    return formattedMessage;
  }

  /**
   * Generic method to convert a workout to a Nostr event
   * @param workout The workout data
   * @param isLimited Whether to include limited data only
   * @returns A NostrEvent (kind 1301)
   */
  static workoutToNostrEvent(workout: Workout, isLimited: boolean = false): NostrEvent {
    // Format start and end dates as Unix timestamps in seconds
    const startTime = Math.floor(workout.startTime / 1000);
    const endTime = workout.endTime ? Math.floor(workout.endTime / 1000) : undefined;
    
    // Prepare tags for Nostr event
    const tags: string[][] = [
      ["d", workout.id],
      ["title", workout.title],
      ["type", workout.type],
      ["start", startTime.toString()],
      ["end", endTime ? endTime.toString() : ""],
      ["completed", workout.isCompleted ? "true" : "false"]
    ];
    
    // Add template reference if available
    if (workout.templateId) {
      tags.push(["template", `33402:${workout.templatePubkey || ''}:${workout.templateId}`, ""]);
    }
    
    // Add exercise data
    if (isLimited) {
      // Limited data - just exercise names without metrics
      workout.exercises.forEach(exercise => {
        tags.push(["exercise", `33401:${exercise.exerciseId || exercise.id}`]);
      });
    } else {
      // Full data - include all metrics
      workout.exercises.forEach(exercise => 
        exercise.sets.forEach(set => {
          const exerciseTag = [
            "exercise",
            `33401:${exercise.exerciseId || exercise.id}`,
            ""
          ];
          
          // Add set data
          if (set.weight !== undefined) exerciseTag.push(set.weight.toString());
          if (set.reps !== undefined) exerciseTag.push(set.reps.toString());
          if (set.rpe !== undefined) exerciseTag.push(set.rpe.toString());
          if (set.type) exerciseTag.push(set.type);
          
          tags.push(exerciseTag);
        })
      );
    }
    
    // Add any workout tags
    workout.tags?.forEach(tag => {
      tags.push(["t", tag]);
    });
    
    return {
      kind: 1301,
      content: workout.notes || "",
      created_at: Math.floor(Date.now() / 1000),
      tags
    };
  }

  /**
   * Convert a Nostr event to a workout
   */
  static nostrEventToWorkout(event: NostrEvent): Workout {
    if (event.kind !== 1301) {
      throw new Error('Event is not a workout record (kind 1301)');
    }
    
    // Find tag values
    const findTagValue = (name: string): string | null => {
      const tag = event.tags.find(t => t[0] === name);
      return tag && tag.length > 1 ? tag[1] : null;
    };
    
    // Parse dates
    const startTimeStr = findTagValue('start');
    const endTimeStr = findTagValue('end');
    
    const startTime = startTimeStr ? parseInt(startTimeStr) * 1000 : Date.now();
    const endTime = endTimeStr && endTimeStr !== '' ? parseInt(endTimeStr) * 1000 : undefined;
    
    // Create base workout object
    const workout: Partial<Workout> = {
      id: findTagValue('d') || generateId('nostr'),
      title: findTagValue('title') || 'Untitled Workout',
      type: (findTagValue('type') || 'strength') as TemplateType,
      startTime,
      endTime,
      isCompleted: findTagValue('completed') === 'true',
      notes: event.content,
      created_at: event.created_at * 1000,
      lastUpdated: Date.now(),
      nostrEventId: event.id,
      availability: { source: ['nostr'] },
      exercises: [],
      shareStatus: 'public'
    };
    
    // Parse template reference
    const templateTag = event.tags.find(t => t[0] === 'template');
    if (templateTag && templateTag.length > 1) {
      const parts = templateTag[1].split(':');
      if (parts.length === 3) {
        workout.templateId = parts[2];
        workout.templatePubkey = parts[1];
      }
    }
    
    // Parse exercises and sets
    const exerciseTags = event.tags.filter(t => t[0] === 'exercise');
    
    // Group exercise tags by exercise ID
    const exerciseMap = new Map<string, string[][]>();
    
    exerciseTags.forEach(tag => {
      if (tag.length < 2) return;
      
      const exerciseRef = tag[1];
      let exerciseId = exerciseRef;
      
      // Parse exercise ID from reference
      if (exerciseRef.includes(':')) {
        const parts = exerciseRef.split(':');
        if (parts.length === 3) {
          exerciseId = parts[2];
        }
      }
      
      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, []);
      }
      
      exerciseMap.get(exerciseId)?.push(tag);
    });
    
    // Convert each unique exercise to a WorkoutExercise
    workout.exercises = Array.from(exerciseMap.entries()).map(([exerciseId, tags]) => {
      // Create a basic exercise
      const exercise: Partial<WorkoutExercise> = {
        id: generateId('nostr'),
        exerciseId: exerciseId,
        title: `Exercise ${exerciseId}`, // Placeholder - would be updated when loading full details
        type: 'strength' as ExerciseType,
        category: 'Other' as ExerciseCategory, // Default
        created_at: workout.created_at || Date.now(),
        lastUpdated: workout.lastUpdated,
        isCompleted: true, // Default for past workouts
        availability: { source: ['nostr'] },
        tags: [], // Add empty tags array
        sets: []
      };
      
      // Parse sets from tags
      exercise.sets = tags.map(tag => {
        const set: Partial<WorkoutSet> = {
          id: generateId('nostr'),
          type: 'normal',
          isCompleted: true,
          lastUpdated: workout.lastUpdated
        };
        
        // Extract set data if available (weight, reps, rpe, type)
        if (tag.length > 3) set.weight = parseFloat(tag[3]) || undefined;
        if (tag.length > 4) set.reps = parseInt(tag[4]) || undefined;
        if (tag.length > 5) set.rpe = parseFloat(tag[5]) || undefined;
        if (tag.length > 6) set.type = tag[6] as any;
        
        return set as WorkoutSet;
      });
      
      // If no sets were found, add a default one
      if (exercise.sets.length === 0) {
        exercise.sets.push({
          id: generateId('nostr'),
          type: 'normal',
          isCompleted: true,
          lastUpdated: workout.lastUpdated
        });
      }
      
      return exercise as WorkoutExercise;
    });
    
    return workout as Workout;
  }

  /**
   * Convert a template to a Nostr event (kind 33402)
   */
  static templateToNostrEvent(template: WorkoutTemplate): NostrEvent {
    // Prepare tags for Nostr event
    const tags: string[][] = [
      ["d", template.id],
      ["title", template.title],
      ["type", template.type || "strength"]
    ];
    
    // Add optional tags
    if (template.rounds) {
      tags.push(["rounds", template.rounds.toString()]);
    }
    
    if (template.duration) {
      tags.push(["duration", template.duration.toString()]);
    }
    
    if (template.interval) {
      tags.push(["interval", template.interval.toString()]);
    }
    
    if (template.restBetweenRounds) {
      tags.push(["rest_between_rounds", template.restBetweenRounds.toString()]);
    }
    
    // Add exercise configurations
    template.exercises.forEach(ex => {
      const exerciseTag = [
        "exercise",
        `33401:${ex.exercise.id}`,
        ""
      ];
      
      // Add target parameters if available
      if (ex.targetSets) exerciseTag.push(ex.targetSets.toString());
      if (ex.targetReps) exerciseTag.push(ex.targetReps.toString());
      if (ex.targetWeight) exerciseTag.push(ex.targetWeight.toString());
      
      tags.push(exerciseTag);
    });
    
    // Add any template tags
    template.tags?.forEach(tag => {
      tags.push(["t", tag]);
    });
    
    return {
      kind: 33402,
      content: template.description || "",
      created_at: Math.floor(Date.now() / 1000),
      tags
    };
  }

  /**
   * Convert a Nostr event to a template
   */
  static nostrEventToTemplate(event: NostrEvent): WorkoutTemplate {
    if (event.kind !== 33402) {
      throw new Error('Event is not a workout template (kind 33402)');
    }
    
    // Find tag values
    const findTagValue = (name: string): string | null => {
      const tag = event.tags.find(t => t[0] === name);
      return tag && tag.length > 1 ? tag[1] : null;
    };
    
    // Create base template object
    const template: Partial<WorkoutTemplate> = {
      id: findTagValue('d') || generateId('nostr'),
      title: findTagValue('title') || 'Untitled Template',
      type: (findTagValue('type') || 'strength') as TemplateType,
      description: event.content,
      created_at: event.created_at * 1000,
      lastUpdated: Date.now(),
      nostrEventId: event.id,
      availability: { source: ['nostr'] },
      exercises: [],
      isPublic: true,
      version: 1,
      tags: []
    };
    
    // Parse optional parameters
    const roundsStr = findTagValue('rounds');
    if (roundsStr) template.rounds = parseInt(roundsStr);
    
    const durationStr = findTagValue('duration');
    if (durationStr) template.duration = parseInt(durationStr);
    
    const intervalStr = findTagValue('interval');
    if (intervalStr) template.interval = parseInt(intervalStr);
    
    const restStr = findTagValue('rest_between_rounds');
    if (restStr) template.restBetweenRounds = parseInt(restStr);
    
    // Parse exercises
    const exerciseTags = event.tags.filter(t => t[0] === 'exercise');
    
    template.exercises = exerciseTags.map(tag => {
      if (tag.length < 2) {
        // Skip invalid tags
        return null;
      }
      
      const exerciseRef = tag[1];
      let exerciseId = exerciseRef;
      let exercisePubkey = '';
      
      // Parse exercise ID from reference
      if (exerciseRef.includes(':')) {
        const parts = exerciseRef.split(':');
        if (parts.length === 3) {
          exerciseId = parts[2];
          exercisePubkey = parts[1];
        }
      }
      
      // Create exercise config
      const config: Partial<TemplateExerciseConfig> = {
        id: generateId('nostr'),
        exercise: {
          id: exerciseId,
          title: `Exercise ${exerciseId}`, // Placeholder - would be updated when loading full details
          type: 'strength',
          category: 'Other' as ExerciseCategory,
          tags: [], // Add empty tags array
          availability: { source: ['nostr'] },
          created_at: Date.now()
        }
      };
      
      // Parse target parameters if available
      if (tag.length > 3) config.targetSets = parseInt(tag[3]) || undefined;
      if (tag.length > 4) config.targetReps = parseInt(tag[4]) || undefined;
      if (tag.length > 5) config.targetWeight = parseFloat(tag[5]) || undefined;
      
      return config as TemplateExerciseConfig;
    }).filter(Boolean) as TemplateExerciseConfig[]; // Filter out null values
    
    return template as WorkoutTemplate;
  }

  /**
   * Helper function to find a tag value in a Nostr event
   */
  static findTagValue(tags: string[][], name: string): string | null {
    const tag = tags.find(t => t[0] === name);
    return tag && tag.length > 1 ? tag[1] : null;
  }
  
  /**
   * Helper function to get all values for a specific tag name
   */
  static getTagValues(tags: string[][], name: string): string[] {
    return tags.filter(t => t[0] === name).map(t => t[1]);
  }
  
  /**
   * Helper function to get template tag information
   */
  static getTemplateTag(tags: string[][]): { reference: string, relay: string } | undefined {
    const templateTag = tags.find(t => t[0] === 'template');
    if (!templateTag || templateTag.length < 3) return undefined;
    
    return {
      reference: templateTag[1],
      relay: templateTag[2] || ''
    };
  }
}
