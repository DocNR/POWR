// lib/db/services/NostrWorkoutHistoryService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { DbService } from '../db-service';
import { WorkoutExercise } from '@/types/exercise';
import { useNDKStore } from '@/lib/stores/ndk';
import { parseWorkoutRecord } from '@/types/nostr-workout';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { generateId } from '@/utils/ids';

/**
 * @deprecated This service is deprecated. Please use UnifiedWorkoutHistoryService instead.
 * See docs/design/WorkoutHistory/MigrationGuide.md for migration instructions.
 */
export class NostrWorkoutHistoryService {
  private db: DbService;
  
  constructor(database: SQLiteDatabase) {
    console.warn(
      'NostrWorkoutHistoryService is deprecated. ' +
      'Please use UnifiedWorkoutHistoryService instead. ' +
      'See docs/design/WorkoutHistory/MigrationGuide.md for migration instructions.'
    );
    this.db = new DbService(database);
  }
  
  /**
   * Get all workouts from both local database and Nostr
   * @param options Options for filtering workouts
   * @returns Promise with array of workouts
   */
  async getAllWorkouts(options: {
    limit?: number;
    offset?: number;
    includeNostr?: boolean;
    isAuthenticated?: boolean;
  } = {}): Promise<Workout[]> {
    const {
      limit = 50,
      offset = 0,
      includeNostr = true,
      isAuthenticated = false
    } = options;
    
    // Get local workouts from database
    const localWorkouts = await this.getLocalWorkouts();
    
    // If not authenticated or not including Nostr, just return local workouts
    if (!isAuthenticated || !includeNostr) {
      return localWorkouts;
    }
    
    try {
      // Get Nostr workouts
      const nostrWorkouts = await this.getNostrWorkouts();
      
      // Merge and deduplicate workouts
      return this.mergeWorkouts(localWorkouts, nostrWorkouts);
    } catch (error) {
      console.error('Error fetching Nostr workouts:', error);
      return localWorkouts;
    }
  }
  
  /**
   * Get workouts from local database
   */
  private async getLocalWorkouts(): Promise<Workout[]> {
    try {
      const workouts = await this.db.getAllAsync<{
        id: string;
        title: string;
        type: string;
        start_time: number;
        end_time: number | null;
        is_completed: number;
        created_at: number;
        updated_at: number;
        template_id: string | null;
        total_volume: number | null;
        total_reps: number | null;
        source: string;
        notes: string | null;
        nostr_event_id: string | null;
        nostr_published_at: number | null;
        nostr_relay_count: number | null;
      }>(
        `SELECT * FROM workouts 
         ORDER BY start_time DESC`
      );
      
      // Transform database records to Workout objects
      const result: Workout[] = [];
      
      for (const workout of workouts) {
        const exercises = await this.getWorkoutExercises(workout.id);
        
        result.push({
          id: workout.id,
          title: workout.title,
          type: workout.type as any,
          startTime: workout.start_time,
          endTime: workout.end_time || undefined,
          isCompleted: Boolean(workout.is_completed),
          created_at: workout.created_at,
          lastUpdated: workout.updated_at,
          templateId: workout.template_id || undefined,
          totalVolume: workout.total_volume || undefined,
          totalReps: workout.total_reps || undefined,
          notes: workout.notes || undefined,
          exercises,
          availability: {
            source: [workout.source as any],
            nostrEventId: workout.nostr_event_id || undefined,
            nostrPublishedAt: workout.nostr_published_at || undefined,
            nostrRelayCount: workout.nostr_relay_count || undefined
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting local workouts:', error);
      throw error;
    }
  }
  
  /**
   * Get workouts from Nostr
   */
  private async getNostrWorkouts(): Promise<Workout[]> {
    try {
      // Get current user
      const currentUser = useNDKStore.getState().currentUser;
      if (!currentUser?.pubkey) {
        return [];
      }
      
      // Fetch workout events
      const events = await useNDKStore.getState().fetchEventsByFilter({
        kinds: [1301], // Workout records
        authors: [currentUser.pubkey],
        limit: 50
      });
      
      // Convert events to workouts
      const workouts: Workout[] = [];
      
      for (const event of events) {
        try {
          const parsedWorkout = parseWorkoutRecord(event);
          
          if (!parsedWorkout) continue;
          
          // Convert to Workout type
          const workout = this.convertParsedWorkoutToWorkout(parsedWorkout, event);
          workouts.push(workout);
        } catch (error) {
          console.error('Error parsing workout event:', error);
        }
      }
      
      return workouts;
    } catch (error) {
      console.error('Error fetching Nostr workouts:', error);
      return [];
    }
  }
  
  /**
   * Convert a parsed workout record to a Workout object
   */
  private convertParsedWorkoutToWorkout(parsedWorkout: any, event: NDKEvent): Workout {
    return {
      id: parsedWorkout.id,
      title: parsedWorkout.title,
      type: parsedWorkout.type as any,
      startTime: parsedWorkout.startTime,
      endTime: parsedWorkout.endTime,
      isCompleted: parsedWorkout.completed,
      notes: parsedWorkout.notes,
      created_at: parsedWorkout.createdAt,
      lastUpdated: parsedWorkout.createdAt,
      
      // Convert exercises
      exercises: parsedWorkout.exercises.map((ex: any) => ({
        id: ex.id,
        title: ex.name,
        exerciseId: ex.id,
        type: 'strength',
        category: 'Core',
        sets: [{
          id: generateId('nostr'),
          weight: ex.weight,
          reps: ex.reps,
          rpe: ex.rpe,
          type: (ex.setType as any) || 'normal',
          isCompleted: true
        }],
        isCompleted: true,
        created_at: parsedWorkout.createdAt,
        lastUpdated: parsedWorkout.createdAt,
        availability: { source: ['nostr'] },
        tags: []
      })),
      
      // Add Nostr-specific metadata
      availability: {
        source: ['nostr'],
        nostrEventId: event.id,
        nostrPublishedAt: event.created_at ? event.created_at * 1000 : Date.now()
      }
    };
  }
  
  /**
   * Merge local and Nostr workouts, removing duplicates
   */
  private mergeWorkouts(localWorkouts: Workout[], nostrWorkouts: Workout[]): Workout[] {
    // Create a map of workouts by ID for quick lookup
    const workoutMap = new Map<string, Workout>();
    
    // Add local workouts to the map
    for (const workout of localWorkouts) {
      workoutMap.set(workout.id, workout);
    }
    
    // Add Nostr workouts to the map, but only if they don't already exist
    for (const workout of nostrWorkouts) {
      if (!workoutMap.has(workout.id)) {
        workoutMap.set(workout.id, workout);
      } else {
        // If the workout exists in both sources, merge the availability
        const existingWorkout = workoutMap.get(workout.id)!;
        
        // Combine the sources
        const sources = new Set([
          ...(existingWorkout.availability?.source || []),
          ...(workout.availability?.source || [])
        ]);
        
        // Update the availability
        workoutMap.set(workout.id, {
          ...existingWorkout,
          availability: {
            ...existingWorkout.availability,
            source: Array.from(sources) as ('local' | 'nostr')[]
          }
        });
      }
    }
    
    // Convert the map back to an array and sort by startTime (newest first)
    return Array.from(workoutMap.values())
      .sort((a, b) => b.startTime - a.startTime);
  }
  
  /**
   * Helper method to load workout exercises and sets
   */
  private async getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
    try {
      const exercises = await this.db.getAllAsync<{
        id: string;
        exercise_id: string;
        display_order: number;
        notes: string | null;
        created_at: number;
        updated_at: number;
      }>(
        `SELECT we.* FROM workout_exercises we
         WHERE we.workout_id = ?
         ORDER BY we.display_order`,
        [workoutId]
      );
      
      const result: WorkoutExercise[] = [];
      
      for (const exercise of exercises) {
        // Get the base exercise info
        const baseExercise = await this.db.getFirstAsync<{
          title: string;
          type: string;
          category: string;
          equipment: string | null;
        }>(
          `SELECT title, type, category, equipment FROM exercises WHERE id = ?`,
          [exercise.exercise_id]
        );
        
        // Get the tags for this exercise
        const tags = await this.db.getAllAsync<{ tag: string }>(
          `SELECT tag FROM exercise_tags WHERE exercise_id = ?`,
          [exercise.exercise_id]
        );
        
        // Get the sets for this exercise
        const sets = await this.db.getAllAsync<{
          id: string;
          type: string;
          weight: number | null;
          reps: number | null;
          rpe: number | null;
          duration: number | null;
          is_completed: number;
          completed_at: number | null;
          created_at: number;
          updated_at: number;
        }>(
          `SELECT * FROM workout_sets 
           WHERE workout_exercise_id = ? 
           ORDER BY id`,
          [exercise.id]
        );
        
        // Map sets to the correct format
        const mappedSets = sets.map(set => ({
          id: set.id,
          type: set.type as any,
          weight: set.weight || undefined,
          reps: set.reps || undefined,
          rpe: set.rpe || undefined,
          duration: set.duration || undefined,
          isCompleted: Boolean(set.is_completed),
          completedAt: set.completed_at || undefined,
          lastUpdated: set.updated_at
        }));
        
        result.push({
          id: exercise.id,
          exerciseId: exercise.exercise_id,
          title: baseExercise?.title || 'Unknown Exercise',
          type: baseExercise?.type as any || 'strength',
          category: baseExercise?.category as any || 'Other',
          equipment: baseExercise?.equipment as any,
          notes: exercise.notes || undefined,
          tags: tags.map(t => t.tag),
          sets: mappedSets,
          created_at: exercise.created_at,
          lastUpdated: exercise.updated_at,
          isCompleted: mappedSets.every(set => set.isCompleted),
          availability: { source: ['local'] }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting workout exercises:', error);
      return [];
    }
  }
}
