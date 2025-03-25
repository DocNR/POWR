// lib/db/services/WorkoutService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Workout, WorkoutExercise, WorkoutSet, WorkoutSummary } from '@/types/workout';
import { generateId } from '@/utils/ids';
import { DbService } from '../db-service';
import { SocialFeedCache } from './SocialFeedCache';

export class WorkoutService {
  private db: DbService;
  
  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
  }
  
  /**
   * Save a workout to the database
   */
  async saveWorkout(workout: Workout): Promise<void> {
    try {
      // Use the global transaction lock to prevent conflicts with other services
      await SocialFeedCache.executeWithLock(async () => {
        try {
          await this.db.withTransactionAsync(async () => {
            // Check if workout exists (for update vs insert)
            const existingWorkout = await this.db.getFirstAsync<{ id: string }>(
              'SELECT id FROM workouts WHERE id = ?',
              [workout.id]
            );
            
            const timestamp = Date.now();
            
            if (existingWorkout) {
              // Update existing workout
              await this.db.runAsync(
                `UPDATE workouts SET 
                 title = ?, type = ?, start_time = ?, end_time = ?, 
                 is_completed = ?, updated_at = ?, template_id = ?,
                 share_status = ?, notes = ?
                 WHERE id = ?`,
                [
                  workout.title,
                  workout.type,
                  workout.startTime,
                  workout.endTime || null,
                  workout.isCompleted ? 1 : 0,
                  timestamp,
                  workout.templateId || null,
                  workout.shareStatus || 'local',
                  workout.notes || null,
                  workout.id
                ]
              );
              
              // Delete existing exercises and sets to recreate them
              await this.deleteWorkoutExercises(workout.id);
            } else {
              // Insert new workout
              await this.db.runAsync(
                `INSERT INTO workouts (
                  id, title, type, start_time, end_time, is_completed,
                  created_at, updated_at, template_id, source, share_status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  workout.id,
                  workout.title,
                  workout.type,
                  workout.startTime,
                  workout.endTime || null,
                  workout.isCompleted ? 1 : 0,
                  timestamp,
                  timestamp,
                  workout.templateId || null,
                  workout.availability?.source[0] || 'local',
                  workout.shareStatus || 'local',
                  workout.notes || null
                ]
              );
            }
            
            // Save exercises and sets
            if (workout.exercises?.length) {
              await this.saveWorkoutExercises(workout.id, workout.exercises);
            }
          });
        } catch (error) {
          console.error('Error in workout transaction:', error);
          throw error; // Rethrow to ensure the transaction is marked as failed
        }
      });
      
      console.log('Workout saved successfully:', workout.id);
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  }
  
  /**
   * Get a workout by ID
   */
  async getWorkout(id: string): Promise<Workout | null> {
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
        source: string;
        share_status: string;
        notes: string | null;
      }>(
        `SELECT * FROM workouts WHERE id = ?`,
        [id]
      );
      
      if (!workout) return null;
      
      // Get exercises and sets
      const exercises = await this.getWorkoutExercises(id);
      
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
        shareStatus: workout.share_status as any,
        notes: workout.notes || undefined,
        exercises,
        availability: {
          source: [workout.source as any]
        }
      };
    } catch (error) {
      console.error('Error getting workout:', error);
      return null;
    }
  }
  
  /**
   * Get all workouts
   */
  async getAllWorkouts(limit: number = 50, offset: number = 0): Promise<Workout[]> {
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
        source: string;
        share_status: string;
        notes: string | null;
      }>(
        `SELECT * FROM workouts ORDER BY start_time DESC LIMIT ? OFFSET ?`,
        [limit, offset]
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
          shareStatus: workout.share_status as any,
          notes: workout.notes || undefined,
          exercises,
          availability: {
            source: [workout.source as any]
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting all workouts:', error);
      return [];
    }
  }
  
  /**
   * Get workouts for a specific date range
   */
  async getWorkoutsByDateRange(startDate: number, endDate: number): Promise<Workout[]> {
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
        source: string;
        share_status: string;
        notes: string | null;
      }>(
        `SELECT * FROM workouts 
         WHERE start_time >= ? AND start_time <= ?
         ORDER BY start_time DESC`,
        [startDate, endDate]
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
          shareStatus: workout.share_status as any,
          notes: workout.notes || undefined,
          exercises,
          availability: {
            source: [workout.source as any]
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting workouts by date range:', error);
      return [];
    }
  }
  
  /**
   * Delete a workout
   */
  async deleteWorkout(id: string): Promise<void> {
    try {
      // Use the global transaction lock to prevent conflicts with other services
      await SocialFeedCache.executeWithLock(async () => {
        try {
          await this.db.withTransactionAsync(async () => {
            // Delete exercises and sets first due to foreign key constraints
            await this.deleteWorkoutExercises(id);
            
            // Delete the workout
            await this.db.runAsync(
              'DELETE FROM workouts WHERE id = ?',
              [id]
            );
          });
        } catch (error) {
          console.error('Error in delete workout transaction:', error);
          throw error; // Rethrow to ensure the transaction is marked as failed
        }
      });
    } catch (error) {
      console.error('Error deleting workout:', error);
      throw error;
    }
  }
  
  /**
   * Save workout summary metrics
   */
  async saveWorkoutSummary(workoutId: string, summary: WorkoutSummary): Promise<void> {
    try {
      await this.db.runAsync(
        `UPDATE workouts SET 
         total_volume = ?, 
         total_reps = ?
         WHERE id = ?`,
        [
          summary.totalVolume || 0,
          summary.totalReps || 0,
          workoutId
        ]
      );
    } catch (error) {
      console.error('Error saving workout summary:', error);
      throw error;
    }
  }
  
  /**
   * Get dates that have workouts
   */
  async getWorkoutDates(startDate: number, endDate: number): Promise<number[]> {
    try {
      const dates = await this.db.getAllAsync<{ start_time: number }>(
        `SELECT DISTINCT date(start_time/1000, 'unixepoch', 'localtime') * 1000 as start_time
         FROM workouts 
         WHERE start_time >= ? AND start_time <= ?
         ORDER BY start_time`,
        [startDate, endDate]
      );
      
      return dates.map(d => d.start_time);
    } catch (error) {
      console.error('Error getting workout dates:', error);
      return [];
    }
  }
  
  /**
   * Update Nostr event ID for a workout
   */
  async updateNostrEventId(workoutId: string, eventId: string): Promise<void> {
    try {
      await this.db.runAsync(
        `UPDATE workouts SET nostr_event_id = ? WHERE id = ?`,
        [eventId, workoutId]
      );
    } catch (error) {
      console.error('Error updating Nostr event ID:', error);
      throw error;
    }
  }
  
  // Helper methods
  
  /**
   * Get exercises for a workout
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
        
        // Get the sets for this exercise
        const sets = await this.getWorkoutSets(exercise.id);
        
        result.push({
          id: exercise.id,
          exerciseId: exercise.exercise_id,
          title: baseExercise?.title || 'Unknown Exercise',
          type: baseExercise?.type as any || 'strength',
          category: baseExercise?.category as any || 'Other',
          equipment: baseExercise?.equipment as any,
          notes: exercise.notes || undefined,
          sets,
          created_at: exercise.created_at,
          lastUpdated: exercise.updated_at,
          isCompleted: sets.every(set => set.isCompleted),
          availability: { source: ['local'] },
          tags: [] // Required property
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error getting workout exercises:', error);
      return [];
    }
  }
  
  /**
   * Get sets for a workout exercise
   */
  private async getWorkoutSets(workoutExerciseId: string): Promise<WorkoutSet[]> {
    try {
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
        [workoutExerciseId]
      );
      
      return sets.map(set => ({
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
    } catch (error) {
      console.error('Error getting workout sets:', error);
      return [];
    }
  }
  
  /**
   * Delete exercises and sets for a workout
   */
  private async deleteWorkoutExercises(workoutId: string): Promise<void> {
    try {
      // Get all workout exercise IDs
      const exercises = await this.db.getAllAsync<{ id: string }>(
        'SELECT id FROM workout_exercises WHERE workout_id = ?',
        [workoutId]
      );
      
      // Delete sets for each exercise
      for (const exercise of exercises) {
        await this.db.runAsync(
          'DELETE FROM workout_sets WHERE workout_exercise_id = ?',
          [exercise.id]
        );
      }
      
      // Delete the exercises
      await this.db.runAsync(
        'DELETE FROM workout_exercises WHERE workout_id = ?',
        [workoutId]
      );
    } catch (error) {
      console.error('Error deleting workout exercises:', error);
      throw error;
    }
  }
  
  /**
   * Save exercises and sets for a workout
   */
  private async saveWorkoutExercises(workoutId: string, exercises: WorkoutExercise[]): Promise<void> {
    const timestamp = Date.now();
    
    for (let i = 0; i < exercises.length; i++) {
      const exercise = exercises[i];
      const exerciseId = exercise.id || generateId('local');
      
      // Save exercise
      await this.db.runAsync(
        `INSERT INTO workout_exercises (
          id, workout_id, exercise_id, display_order, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          exerciseId,
          workoutId,
          exercise.exerciseId || exercise.id, // Use exerciseId if available
          i, // Display order
          exercise.notes || null,
          timestamp,
          timestamp
        ]
      );
      
      // Save sets
      if (exercise.sets?.length) {
        for (const set of exercise.sets) {
          const setId = set.id || generateId('local');
          
          await this.db.runAsync(
            `INSERT INTO workout_sets (
              id, workout_exercise_id, type, weight, reps,
              rpe, duration, is_completed, completed_at, 
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              setId,
              exerciseId,
              set.type || 'normal',
              set.weight || null,
              set.reps || null,
              set.rpe || null,
              set.duration || null,
              set.isCompleted ? 1 : 0,
              set.completedAt || null,
              timestamp,
              timestamp
            ]
          );
        }
      }
    }
  }
}
