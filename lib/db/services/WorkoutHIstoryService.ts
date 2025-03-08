// lib/db/services/WorkoutHistoryService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { format } from 'date-fns';
import { DbService } from '../db-service';
import { WorkoutExercise } from '@/types/exercise'; // Add this import

export class WorkoutHistoryService {
  private db: DbService;
  
  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
  }
  
  /**
   * Get all workouts, sorted by date in descending order
   */
  async getAllWorkouts(): Promise<Workout[]> {
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
            source: [workout.source as any]
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting workouts:', error);
      throw error;
    }
  }
  
  /**
   * Get workouts for a specific date
   */
  async getWorkoutsByDate(date: Date): Promise<Workout[]> {
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
      
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
      }>(
        `SELECT * FROM workouts 
         WHERE start_time >= ? AND start_time <= ?
         ORDER BY start_time DESC`,
        [startOfDay, endOfDay]
      );
      
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
            source: [workout.source as any]
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting workouts by date:', error);
      throw error;
    }
  }
  
  /**
   * Get all dates that have workouts within a month
   */
  async getWorkoutDatesInMonth(year: number, month: number): Promise<Date[]> {
    try {
      const startOfMonth = new Date(year, month, 1).getTime();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
      
      const result = await this.db.getAllAsync<{
        start_time: number;
      }>(
        `SELECT DISTINCT date(start_time/1000, 'unixepoch', 'localtime') * 1000 as start_time
         FROM workouts 
         WHERE start_time >= ? AND start_time <= ?`,
        [startOfMonth, endOfMonth]
      );
      
      return result.map(row => new Date(row.start_time));
    } catch (error) {
      console.error('Error getting workout dates:', error);
      return [];
    }
  }
  
  /**
   * Get workout details including exercises
   */
  async getWorkoutDetails(workoutId: string): Promise<Workout | null> {
    try {
      const workout = await this.db.getFirstAsync<{
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
      }>(
        `SELECT * FROM workouts WHERE id = ?`,
        [workoutId]
      );
      
      if (!workout) return null;
      
      // Get exercises for this workout
      const exercises = await this.getWorkoutExercises(workoutId);
      
      return {
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
          source: [workout.source as any]
        }
      };
    } catch (error) {
      console.error('Error getting workout details:', error);
      throw error;
    }
  }
  
  /**
   * Get the total number of workouts
   */
  async getWorkoutCount(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM workouts`
      );
      
      return result?.count || 0;
    } catch (error) {
      console.error('Error getting workout count:', error);
      return 0;
    }
  }
  
  // Helper method to load workout exercises and sets
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
					tags: tags.map(t => t.tag), // Add the tags array here
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