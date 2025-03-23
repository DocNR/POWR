// lib/db/services/UnifiedWorkoutHistoryService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { NDK, NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk-mobile';
import { Workout } from '@/types/workout';
import { parseWorkoutRecord, ParsedWorkoutRecord } from '@/types/nostr-workout';
import { DbService } from '../db-service';
import { WorkoutExercise } from '@/types/exercise';
import { useNDKStore } from '@/lib/stores/ndk';
import { generateId } from '@/utils/ids';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

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

/**
 * Unified service for managing workout history from both local database and Nostr
 * This service combines the functionality of WorkoutHistoryService, EnhancedWorkoutHistoryService,
 * and NostrWorkoutHistoryService into a single, comprehensive service.
 */
export class UnifiedWorkoutHistoryService {
  private db: DbService;
  private ndk?: NDK;
  private activeSubscriptions: Map<string, NDKSubscription> = new Map();
  
  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
    // Use type assertion to handle NDK type mismatch
    this.ndk = useNDKStore.getState().ndk as unknown as NDK | undefined;
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
          conditions.push(`(w.source = 'local' OR w.source = 'nostr' OR w.source = 'both')`);
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
        isPublished: workout.source === 'nostr' || workout.source === 'both',
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
   * Update the Nostr status of a workout in the local database
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
             nostr_relay_count = ?,
             source = CASE 
                        WHEN source = 'local' THEN 'both' 
                        WHEN source IS NULL THEN 'nostr'
                        ELSE source 
                      END
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
    if (!isAuthenticated || !includeNostr || !this.ndk) {
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
    if (!this.ndk) {
      return [];
    }
    
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
  private convertParsedWorkoutToWorkout(parsedWorkout: ParsedWorkoutRecord, event: NDKEvent): Workout {
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
      exercises: parsedWorkout.exercises.map(ex => {
        // Get a human-readable name for the exercise
        // If ex.name is an ID (typically starts with numbers or contains special characters),
        // use a more descriptive name based on the exercise type
        const isLikelyId = /^[0-9]|:|\//.test(ex.name);
        const exerciseName = isLikelyId 
          ? this.getExerciseNameFromId(ex.id) || `Exercise ${ex.id.substring(0, 4)}` 
          : ex.name;
          
        return {
          id: ex.id,
          title: exerciseName,
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
        };
      }),
      
      // Add Nostr-specific metadata
      availability: {
        source: ['nostr'],
        nostrEventId: event.id,
        nostrPublishedAt: event.created_at ? event.created_at * 1000 : Date.now()
      }
    };
  }
  
  /**
   * Try to get a human-readable exercise name from the exercise ID
   * This method attempts to look up the exercise in the local database
   * or use a mapping of common exercise IDs to names
   */
  private getExerciseNameFromId(exerciseId: string): string | null {
    try {
      // Common exercise name mappings
      const commonExercises: Record<string, string> = {
        'bench-press': 'Bench Press',
        'squat': 'Squat',
        'deadlift': 'Deadlift',
        'shoulder-press': 'Shoulder Press',
        'pull-up': 'Pull Up',
        'push-up': 'Push Up',
        'barbell-row': 'Barbell Row',
        'leg-press': 'Leg Press',
        'lat-pulldown': 'Lat Pulldown',
        'bicep-curl': 'Bicep Curl',
        'tricep-extension': 'Tricep Extension',
        'leg-curl': 'Leg Curl',
        'leg-extension': 'Leg Extension',
        'calf-raise': 'Calf Raise',
        'sit-up': 'Sit Up',
        'plank': 'Plank',
        'lunge': 'Lunge',
        'dip': 'Dip',
        'chin-up': 'Chin Up',
        'military-press': 'Military Press'
      };
      
      // Check if it's a common exercise
      for (const [key, name] of Object.entries(commonExercises)) {
        if (exerciseId.includes(key)) {
          return name;
        }
      }
      
      // Handle specific format seen in logs: "Exercise m8l4pk"
      if (exerciseId.match(/^m[0-9a-z]{5,6}$/)) {
        // This appears to be a short ID, return a generic name with a number
        const shortId = exerciseId.substring(1, 4).toUpperCase();
        return `Exercise ${shortId}`;
      }
      
      // If not found in common exercises, try to extract a name from the ID
      // Remove any numeric prefixes and special characters
      const cleanId = exerciseId.replace(/^[0-9]+:?/, '').replace(/[-_]/g, ' ');
      
      // Capitalize each word
      if (cleanId && cleanId.length > 0) {
        return cleanId
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      return "Generic Exercise";
    } catch (error) {
      console.error('Error getting exercise name from ID:', error);
      return "Unknown Exercise";
    }
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
  
  /**
   * Publish a local workout to Nostr
   * @param workoutId ID of the workout to publish
   * @returns Promise with the event ID if successful
   */
  async publishWorkoutToNostr(workoutId: string): Promise<string> {
    if (!this.ndk) {
      throw new Error('NDK not initialized');
    }
    
    // Get the workout from the local database
    const workout = await this.getWorkoutDetails(workoutId);
    
    if (!workout) {
      throw new Error(`Workout with ID ${workoutId} not found`);
    }
    
    // Create a new NDK event
    const event = new NDKEvent(this.ndk as any);
    
    // Set the kind to workout record
    event.kind = 1301;
    
    // Set the content to the workout notes
    event.content = workout.notes || '';
    
    // Add tags
    event.tags = [
      ['d', workout.id],
      ['title', workout.title],
      ['type', workout.type],
      ['start', Math.floor(workout.startTime / 1000).toString()],
      ['completed', workout.isCompleted.toString()]
    ];
    
    // Add end time if available
    if (workout.endTime) {
      event.tags.push(['end', Math.floor(workout.endTime / 1000).toString()]);
    }
    
    // Add exercise tags
    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        event.tags.push([
          'exercise',
          `33401:${exercise.id}`,
          '',
          set.weight?.toString() || '',
          set.reps?.toString() || '',
          set.rpe?.toString() || '',
          set.type
        ]);
      }
    }
    
    // Add workout tags if available
    if (workout.tags && workout.tags.length > 0) {
      for (const tag of workout.tags) {
        event.tags.push(['t', tag]);
      }
    }
    
    // Publish the event
    await event.publish();
    
    // Update the workout in the local database with the Nostr event ID
    await this.updateWorkoutNostrStatus(workoutId, event.id || '', 1);
    
    return event.id || '';
  }
  
  /**
   * Import a Nostr workout into the local database
   * @param eventId Nostr event ID to import
   * @returns Promise with the local workout ID
   */
  async importNostrWorkoutToLocal(eventId: string): Promise<string> {
    if (!this.ndk) {
      throw new Error('NDK not initialized');
    }
    
    // Fetch the event from Nostr
    const events = await useNDKStore.getState().fetchEventsByFilter({
      ids: [eventId]
    });
    
    if (events.length === 0) {
      throw new Error(`No event found with ID ${eventId}`);
    }
    
    const event = events[0];
    
    // Parse the workout
    const parsedWorkout = parseWorkoutRecord(event as any);
    
    if (!parsedWorkout) {
      throw new Error(`Failed to parse workout from event ${eventId}`);
    }
    
    // Convert to Workout type
    const workout = this.convertParsedWorkoutToWorkout(parsedWorkout, event);
    
    // Update the source to include both local and Nostr
    workout.availability.source = ['nostr', 'local'];
    
    // Save the workout to the local database
    const workoutId = await this.saveNostrWorkoutToLocal(workout);
    
    return workoutId;
  }
  
  /**
   * Save a Nostr workout to the local database
   * @param workout Workout to save
   * @returns Promise with the local workout ID
   */
  private async saveNostrWorkoutToLocal(workout: Workout): Promise<string> {
    try {
      // First check if the workout already exists
      const existingWorkout = await this.db.getFirstAsync<{ id: string }>(
        `SELECT id FROM workouts WHERE id = ? OR nostr_event_id = ?`,
        [workout.id, workout.availability?.nostrEventId]
      );
      
      if (existingWorkout) {
        // Workout already exists, update it
        await this.db.runAsync(
          `UPDATE workouts 
           SET title = ?, 
               type = ?, 
               start_time = ?, 
               end_time = ?, 
               is_completed = ?, 
               notes = ?,
               nostr_event_id = ?,
               nostr_published_at = ?,
               nostr_relay_count = ?,
               source = 'both'
           WHERE id = ?`,
          [
            workout.title,
            workout.type,
            workout.startTime,
            workout.endTime || null,
            workout.isCompleted ? 1 : 0,
            workout.notes || '',
            workout.availability?.nostrEventId,
            workout.availability?.nostrPublishedAt,
            1,
            existingWorkout.id
          ]
        );
        
        return existingWorkout.id;
      } else {
        // Workout doesn't exist, insert it
        await this.db.runAsync(
          `INSERT INTO workouts (
            id, title, type, start_time, end_time, is_completed, notes,
            nostr_event_id, nostr_published_at, nostr_relay_count, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            workout.id,
            workout.title,
            workout.type,
            workout.startTime,
            workout.endTime || null,
            workout.isCompleted ? 1 : 0,
            workout.notes || '',
            workout.availability?.nostrEventId,
            workout.availability?.nostrPublishedAt,
            1,
            'both'
          ]
        );
        
        return workout.id;
      }
    } catch (error) {
      console.error('Error saving Nostr workout to local database:', error);
      throw error;
    }
  }
  
  /**
   * Create a subscription for real-time Nostr workout updates
   * @param pubkey User's public key
   * @param callback Function to call when new workouts are received
   * @returns Subscription ID that can be used to unsubscribe
   */
  subscribeToNostrWorkouts(pubkey: string, callback: (workout: Workout) => void): string {
    if (!this.ndk) {
      console.warn('NDK not initialized, cannot subscribe to Nostr workouts');
      return '';
    }
    
    const subId = `workout-sub-${generateId('local')}`;
    
    // Create subscription
    const sub = (this.ndk as any).subscribe({
      kinds: [1301], // Workout records
      authors: [pubkey],
      limit: 50
    }, { closeOnEose: false });
    
    // Handle events
    sub.on('event', (event: NDKEvent) => {
      try {
        const parsedWorkout = parseWorkoutRecord(event);
        if (parsedWorkout) {
          const workout = this.convertParsedWorkoutToWorkout(parsedWorkout, event);
          callback(workout);
        }
      } catch (error) {
        console.error('Error processing Nostr workout event:', error);
      }
    });
    
    // Store subscription for later cleanup
    this.activeSubscriptions.set(subId, sub);
    
    return subId;
  }
  
  /**
   * Unsubscribe from Nostr workout updates
   * @param subId Subscription ID returned from subscribeToNostrWorkouts
   */
  unsubscribeFromNostrWorkouts(subId: string): void {
    const sub = this.activeSubscriptions.get(subId);
    if (sub) {
      sub.stop();
      this.activeSubscriptions.delete(subId);
    }
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
