// lib/db/services/EnhancedWorkoutHistoryService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { DbService } from '../db-service';
import { WorkoutExercise } from '@/types/exercise';

// Define workout filter interface
export interface WorkoutFilters {
  type?: string[];
  dateRange?: { start: Date; end: Date };
  exercises?: string[];
  tags?: string[];
  source?: ('local' | 'nostr' | 'both')[];
  searchTerm?: string;
}

// Define workout sync status interface
export interface WorkoutSyncStatus {
  isLocal: boolean;
  isPublished: boolean;
  eventId?: string;
  relayCount?: number;
  lastPublished?: number;
}

// Define export format type
export type ExportFormat = 'csv' | 'json';

export class WorkoutHistoryService {
  private db: DbService;
  
  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
  }
  
  /**
   * Search workouts by title, exercise name, or notes
   */
  async searchWorkouts(query: string): Promise<Workout[]> {
    try {
      if (!query || query.trim() === '') {
        return this.getAllWorkouts();
      }
      
      const searchTerm = `%${query.trim()}%`;
      
      // Search in workout titles and notes
      const workoutIds = await this.db.getAllAsync<{ id: string }>(
        `SELECT DISTINCT w.id 
         FROM workouts w
         LEFT JOIN workout_exercises we ON w.id = we.workout_id
         LEFT JOIN exercises e ON we.exercise_id = e.id
         WHERE w.title LIKE ? 
         OR w.notes LIKE ?
         OR e.title LIKE ?
         ORDER BY w.start_time DESC`,
        [searchTerm, searchTerm, searchTerm]
      );
      
      // Get full workout details for each matching ID
      const result: Workout[] = [];
      for (const { id } of workoutIds) {
        const workout = await this.getWorkoutDetails(id);
        if (workout) {
          result.push(workout);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error searching workouts:', error);
      throw error;
    }
  }
  
  /**
   * Filter workouts based on various criteria
   */
  async filterWorkouts(filters: WorkoutFilters): Promise<Workout[]> {
    try {
      // Start with a base query
      let query = `
        SELECT DISTINCT w.* 
        FROM workouts w
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      // Add joins if needed
      if (filters.exercises && filters.exercises.length > 0) {
        query += `
          JOIN workout_exercises we ON w.id = we.workout_id
        `;
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query += `
          JOIN workout_exercises we2 ON w.id = we2.workout_id
          JOIN exercise_tags et ON we2.exercise_id = et.exercise_id
        `;
      }
      
      // Add type filter
      if (filters.type && filters.type.length > 0) {
        conditions.push(`w.type IN (${filters.type.map(() => '?').join(', ')})`);
        params.push(...filters.type);
      }
      
      // Add date range filter
      if (filters.dateRange) {
        const { start, end } = filters.dateRange;
        conditions.push('w.start_time >= ? AND w.start_time <= ?');
        params.push(startOfDay(start).getTime(), endOfDay(end).getTime());
      }
      
      // Add exercise filter
      if (filters.exercises && filters.exercises.length > 0) {
        conditions.push(`we.exercise_id IN (${filters.exercises.map(() => '?').join(', ')})`);
        params.push(...filters.exercises);
      }
      
      // Add tag filter
      if (filters.tags && filters.tags.length > 0) {
        conditions.push(`et.tag IN (${filters.tags.map(() => '?').join(', ')})`);
        params.push(...filters.tags);
      }
      
      // Add source filter
      if (filters.source && filters.source.length > 0) {
        // Handle 'both' specially
        if (filters.source.includes('both')) {
          conditions.push(`(w.source = 'local' OR w.source = 'nostr')`);
        } else {
          conditions.push(`w.source IN (${filters.source.map(() => '?').join(', ')})`);
          params.push(...filters.source);
        }
      }
      
      // Add search term filter
      if (filters.searchTerm && filters.searchTerm.trim() !== '') {
        const searchTerm = `%${filters.searchTerm.trim()}%`;
        conditions.push('(w.title LIKE ? OR w.notes LIKE ?)');
        params.push(searchTerm, searchTerm);
      }
      
      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      // Add ORDER BY
      query += ' ORDER BY w.start_time DESC';
      
      // Execute the query
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
      }>(query, params);
      
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
      console.error('Error filtering workouts:', error);
      throw error;
    }
  }
  
  /**
   * Get workouts that include a specific exercise
   */
  async getWorkoutsByExercise(exerciseId: string): Promise<Workout[]> {
    try {
      const workoutIds = await this.db.getAllAsync<{ workout_id: string }>(
        `SELECT DISTINCT workout_id 
         FROM workout_exercises 
         WHERE exercise_id = ?
         ORDER BY created_at DESC`,
        [exerciseId]
      );
      
      const result: Workout[] = [];
      for (const { workout_id } of workoutIds) {
        const workout = await this.getWorkoutDetails(workout_id);
        if (workout) {
          result.push(workout);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error getting workouts by exercise:', error);
      throw error;
    }
  }
  
  /**
   * Export workout history in the specified format
   */
  async exportWorkoutHistory(format: ExportFormat): Promise<string> {
    try {
      const workouts = await this.getAllWorkouts();
      
      if (format === 'json') {
        return JSON.stringify(workouts, null, 2);
      } else if (format === 'csv') {
        // Create CSV header
        let csv = 'ID,Title,Type,Start Time,End Time,Completed,Volume,Reps,Notes\n';
        
        // Add workout rows
        for (const workout of workouts) {
          const row = [
            workout.id,
            `"${workout.title.replace(/"/g, '""')}"`, // Escape quotes in title
            workout.type,
            new Date(workout.startTime).toISOString(),
            workout.endTime ? new Date(workout.endTime).toISOString() : '',
            workout.isCompleted ? 'Yes' : 'No',
            workout.totalVolume || '',
            workout.totalReps || '',
            workout.notes ? `"${workout.notes.replace(/"/g, '""')}"` : '' // Escape quotes in notes
          ];
          
          csv += row.join(',') + '\n';
        }
        
        return csv;
      }
      
      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      console.error('Error exporting workout history:', error);
      throw error;
    }
  }
  
  /**
   * Get workout streak data
   */
  async getWorkoutStreak(): Promise<{ current: number; longest: number; lastWorkoutDate: Date | null }> {
    try {
      // Get all workout dates sorted by date
      const workoutDates = await this.db.getAllAsync<{ workout_date: number }>(
        `SELECT DISTINCT date(start_time/1000, 'unixepoch', 'localtime') * 1000 as workout_date
         FROM workouts 
         ORDER BY workout_date DESC`
      );
      
      if (workoutDates.length === 0) {
        return { current: 0, longest: 0, lastWorkoutDate: null };
      }
      
      const dates = workoutDates.map(row => new Date(row.workout_date));
      
      // Calculate current streak
      let currentStreak = 1;
      let lastDate = dates[0];
      
      for (let i = 1; i < dates.length; i++) {
        const currentDate = dates[i];
        const dayDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          // Consecutive day
          currentStreak++;
          lastDate = currentDate;
        } else if (dayDiff > 1) {
          // Streak broken
          break;
        }
      }
      
      // Calculate longest streak
      let longestStreak = 1;
      let currentLongestStreak = 1;
      lastDate = dates[0];
      
      for (let i = 1; i < dates.length; i++) {
        const currentDate = dates[i];
        const dayDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 1) {
          // Consecutive day
          currentLongestStreak++;
          lastDate = currentDate;
          
          if (currentLongestStreak > longestStreak) {
            longestStreak = currentLongestStreak;
          }
        } else if (dayDiff > 1) {
          // Streak broken
          currentLongestStreak = 1;
          lastDate = currentDate;
        }
      }
      
      return { 
        current: currentStreak, 
        longest: longestStreak,
        lastWorkoutDate: dates[0]
      };
    } catch (error) {
      console.error('Error getting workout streak:', error);
      return { current: 0, longest: 0, lastWorkoutDate: null };
    }
  }
  
  /**
   * Get workout sync status
   */
  async getWorkoutSyncStatus(workoutId: string): Promise<WorkoutSyncStatus> {
    try {
      const workout = await this.db.getFirstAsync<{
        source: string;
        nostr_event_id: string | null;
        nostr_published_at: number | null;
        nostr_relay_count: number | null;
      }>(
        `SELECT source, nostr_event_id, nostr_published_at, nostr_relay_count
         FROM workouts
         WHERE id = ?`,
        [workoutId]
      );
      
      if (!workout) {
        return { isLocal: false, isPublished: false };
      }
      
      return {
        isLocal: workout.source === 'local' || workout.source === 'both',
        isPublished: Boolean(workout.nostr_event_id),
        eventId: workout.nostr_event_id || undefined,
        relayCount: workout.nostr_relay_count || undefined,
        lastPublished: workout.nostr_published_at || undefined
      };
    } catch (error) {
      console.error('Error getting workout sync status:', error);
      return { isLocal: false, isPublished: false };
    }
  }
  
  /**
   * Publish a workout to Nostr
   * This method updates the database with Nostr publication details
   * The actual publishing is handled by NostrWorkoutService
   */
  async updateWorkoutNostrStatus(
    workoutId: string, 
    eventId: string, 
    relayCount: number
  ): Promise<boolean> {
    try {
      await this.db.runAsync(
        `UPDATE workouts
         SET nostr_event_id = ?,
             nostr_published_at = ?,
             nostr_relay_count = ?
         WHERE id = ?`,
        [eventId, Date.now(), relayCount, workoutId]
      );
      
      return true;
    } catch (error) {
      console.error('Error updating workout Nostr status:', error);
      return false;
    }
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
      console.error('Error getting workouts:', error);
      throw error;
    }
  }
  
  /**
   * Get workouts for a specific date
   */
  async getWorkoutsByDate(date: Date): Promise<Workout[]> {
    try {
      const startOfDayTime = startOfDay(date).getTime();
      const endOfDayTime = endOfDay(date).getTime();
      
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
         WHERE start_time >= ? AND start_time <= ?
         ORDER BY start_time DESC`,
        [startOfDayTime, endOfDayTime]
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
            source: [workout.source as any],
            nostrEventId: workout.nostr_event_id || undefined,
            nostrPublishedAt: workout.nostr_published_at || undefined,
            nostrRelayCount: workout.nostr_relay_count || undefined
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
      const startOfMonthTime = startOfMonth(new Date(year, month)).getTime();
      const endOfMonthTime = endOfMonth(new Date(year, month)).getTime();
      
      const result = await this.db.getAllAsync<{
        start_time: number;
      }>(
        `SELECT DISTINCT date(start_time/1000, 'unixepoch', 'localtime') * 1000 as start_time
         FROM workouts 
         WHERE start_time >= ? AND start_time <= ?`,
        [startOfMonthTime, endOfMonthTime]
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
        nostr_event_id: string | null;
        nostr_published_at: number | null;
        nostr_relay_count: number | null;
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
          source: [workout.source as any],
          nostrEventId: workout.nostr_event_id || undefined,
          nostrPublishedAt: workout.nostr_published_at || undefined,
          nostrRelayCount: workout.nostr_relay_count || undefined
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
    console.log(`[EnhancedWorkoutHistoryService] Getting exercises for workout: ${workoutId}`);
    
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
    
    console.log(`[EnhancedWorkoutHistoryService] Found ${exercises.length} exercises for workout ${workoutId}`);
    
    const result: WorkoutExercise[] = [];
    
    for (const exercise of exercises) {
      console.log(`[EnhancedWorkoutHistoryService] Processing exercise: ${exercise.id}, exercise_id: ${exercise.exercise_id}`);
      
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
      
      console.log(`[EnhancedWorkoutHistoryService] Base exercise lookup result: ${baseExercise ? JSON.stringify(baseExercise) : 'null'}`);
      
      // If base exercise not found, check if it exists in the exercises table
      if (!baseExercise) {
        const exerciseExists = await this.db.getFirstAsync<{ count: number }>(
          `SELECT COUNT(*) as count FROM exercises WHERE id = ?`,
          [exercise.exercise_id]
        );
        console.log(`[EnhancedWorkoutHistoryService] Exercise ${exercise.exercise_id} exists in exercises table: ${(exerciseExists?.count ?? 0) > 0}`);
      }
      
      // Get the tags for this exercise
      const tags = await this.db.getAllAsync<{ tag: string }>(
        `SELECT tag FROM exercise_tags WHERE exercise_id = ?`,
        [exercise.exercise_id]
      );
      
      console.log(`[EnhancedWorkoutHistoryService] Found ${tags.length} tags for exercise ${exercise.exercise_id}`);
      
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
      
      console.log(`[EnhancedWorkoutHistoryService] Found ${sets.length} sets for exercise ${exercise.id}`);
      
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
      
      const exerciseTitle = baseExercise?.title || 'Unknown Exercise';
      console.log(`[EnhancedWorkoutHistoryService] Using title: ${exerciseTitle} for exercise ${exercise.id}`);
      
      result.push({
        id: exercise.id,
        exerciseId: exercise.exercise_id,
        title: exerciseTitle,
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
    
    console.log(`[EnhancedWorkoutHistoryService] Returning ${result.length} processed exercises for workout ${workoutId}`);
    return result;
  } catch (error) {
    console.error('[EnhancedWorkoutHistoryService] Error getting workout exercises:', error);
    return [];
  }
}
}