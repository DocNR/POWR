// lib/db/services/WorkoutHistoryService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { format } from 'date-fns';
import { DbService } from '../db-service';

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
        end_time: number;
        is_completed: number;
        created_at: number;
        last_updated: number;
        template_id: string | null;
        total_volume: number | null;
        total_reps: number | null;
        source: string;
      }>(
        `SELECT * FROM workouts 
         ORDER BY start_time DESC`
      );
      
      // Transform database records to Workout objects
      return workouts.map(row => this.mapRowToWorkout(row));
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
        end_time: number;
        is_completed: number;
        created_at: number;
        last_updated: number;
        template_id: string | null;
        total_volume: number | null;
        total_reps: number | null;
        source: string;
      }>(
        `SELECT * FROM workouts 
         WHERE start_time >= ? AND start_time <= ?
         ORDER BY start_time DESC`,
        [startOfDay, endOfDay]
      );
      
      return workouts.map(row => this.mapRowToWorkout(row));
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
        `SELECT DISTINCT start_time FROM workouts 
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
        end_time: number;
        is_completed: number;
        created_at: number;
        last_updated: number;
        template_id: string | null;
        total_volume: number | null;
        total_reps: number | null;
        source: string;
      }>(
        `SELECT * FROM workouts WHERE id = ?`,
        [workoutId]
      );
      
      if (!workout) return null;
      
      // Get exercises for this workout
      // This is just a skeleton - you'll need to implement the actual query
      // based on your database schema
      const exercises = await this.db.getAllAsync(
        `SELECT * FROM workout_exercises WHERE workout_id = ?`,
        [workoutId]
      );
      
      const workoutObj = this.mapRowToWorkout(workout);
      // You would set the exercises property here based on your schema
      // workoutObj.exercises = exercises.map(...);
      
      return workoutObj;
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
  
  /**
   * Helper method to map a database row to a Workout object
   */
  private mapRowToWorkout(row: {
    id: string;
    title: string;
    type: string;
    start_time: number;
    end_time: number;
    is_completed: number;
    created_at: number;
    last_updated?: number;
    template_id?: string | null;
    total_volume?: number | null;
    total_reps?: number | null;
    source: string;
  }): Workout {
    return {
      id: row.id,
      title: row.title,
      type: row.type as any, // Cast to TemplateType
      startTime: row.start_time,
      endTime: row.end_time,
      isCompleted: row.is_completed === 1,
      created_at: row.created_at,
      lastUpdated: row.last_updated,
      templateId: row.template_id || undefined,
      totalVolume: row.total_volume || undefined,
      totalReps: row.total_reps || undefined,
      availability: {
        source: [row.source as any] // Cast to StorageSource
      },
      exercises: [] // Exercises would be loaded separately
    };
  }
}