// lib/services/AnalyticsService.ts
import { Workout } from '@/types/workout';
import { WorkoutService } from '@/lib/db/services/WorkoutService';
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';

/**
 * Workout statistics data structure
 */
export interface WorkoutStats {
  workoutCount: number;
  totalDuration: number; // in milliseconds
  totalVolume: number;
  averageIntensity: number;
  exerciseDistribution: Record<string, number>;
  frequencyByDay: number[]; // 0 = Sunday, 6 = Saturday
}

/**
 * Progress point for tracking exercise progress
 */
export interface ProgressPoint {
  date: number; // timestamp
  value: number;
  workoutId: string;
}

/**
 * Personal record data structure
 */
export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  value: number;
  unit: string;
  reps: number;
  date: number; // timestamp
  workoutId: string;
  previousRecord?: {
    value: number;
    date: number;
  };
}

/**
 * Service for calculating workout analytics and progress data
 */
export class AnalyticsService {
  private workoutService: WorkoutService | null = null;
  private nostrWorkoutService: NostrWorkoutService | null = null;
  private cache = new Map<string, any>();
  
  // Set the workout service (called from React components)
  setWorkoutService(service: WorkoutService): void {
    this.workoutService = service;
  }
  
  // Set the Nostr workout service (called from React components)
  setNostrWorkoutService(service: NostrWorkoutService): void {
    this.nostrWorkoutService = service;
  }
  
  /**
   * Get workout statistics for a given period
   */
  async getWorkoutStats(period: 'week' | 'month' | 'year' | 'all'): Promise<WorkoutStats> {
    const cacheKey = `stats-${period}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    // Get workouts for the period
    const workouts = await this.getWorkoutsForPeriod(period);
    
    // Calculate statistics
    const stats: WorkoutStats = {
      workoutCount: workouts.length,
      totalDuration: 0,
      totalVolume: 0,
      averageIntensity: 0,
      exerciseDistribution: {},
      frequencyByDay: [0, 0, 0, 0, 0, 0, 0],
    };
    
    // Process workouts
    workouts.forEach(workout => {
      // Add duration
      stats.totalDuration += (workout.endTime || Date.now()) - workout.startTime;
      
      // Add volume
      stats.totalVolume += workout.totalVolume || 0;
      
      // Track frequency by day
      const day = new Date(workout.startTime).getDay();
      stats.frequencyByDay[day]++;
      
      // Track exercise distribution
      workout.exercises?.forEach(exercise => {
        const exerciseId = exercise.id;
        stats.exerciseDistribution[exerciseId] = (stats.exerciseDistribution[exerciseId] || 0) + 1;
      });
    });
    
    // Calculate average intensity
    stats.averageIntensity = workouts.length > 0 
      ? workouts.reduce((sum, workout) => sum + (workout.averageRpe || 0), 0) / workouts.length 
      : 0;
    
    this.cache.set(cacheKey, stats);
    return stats;
  }
  
  /**
   * Get progress for a specific exercise
   */
  async getExerciseProgress(
    exerciseId: string,
    metric: 'weight' | 'reps' | 'volume',
    period: 'month' | 'year' | 'all'
  ): Promise<ProgressPoint[]> {
    const cacheKey = `progress-${exerciseId}-${metric}-${period}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    // Get workouts for the period
    const workouts = await this.getWorkoutsForPeriod(period);
    
    // Filter workouts that contain the exercise
    const relevantWorkouts = workouts.filter(workout => 
      workout.exercises?.some(exercise => 
        exercise.id === exerciseId || exercise.exerciseId === exerciseId
      )
    );
    
    // Extract progress points
    const progressPoints: ProgressPoint[] = [];
    
    relevantWorkouts.forEach(workout => {
      const exercise = workout.exercises?.find(e => 
        e.id === exerciseId || e.exerciseId === exerciseId
      );
      
      if (!exercise) return;
      
      let value = 0;
      
      switch (metric) {
        case 'weight':
          // Find the maximum weight used in any set
          value = Math.max(...exercise.sets.map(set => set.weight || 0));
          break;
        case 'reps':
          // Find the maximum reps in any set
          value = Math.max(...exercise.sets.map(set => set.reps || 0));
          break;
        case 'volume':
          // Calculate total volume (weight * reps) for the exercise
          value = exercise.sets.reduce((sum, set) => 
            sum + ((set.weight || 0) * (set.reps || 0)), 0);
          break;
      }
      
      progressPoints.push({
        date: workout.startTime,
        value,
        workoutId: workout.id
      });
    });
    
    // Sort by date
    progressPoints.sort((a, b) => a.date - b.date);
    
    this.cache.set(cacheKey, progressPoints);
    return progressPoints;
  }
  
  /**
   * Get personal records for exercises
   */
  async getPersonalRecords(
    exerciseIds?: string[],
    limit?: number
  ): Promise<PersonalRecord[]> {
    const cacheKey = `records-${exerciseIds?.join('-') || 'all'}-${limit || 'all'}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    // Get all workouts
    const workouts = await this.getWorkoutsForPeriod('all');
    
    // Track personal records by exercise
    const recordsByExercise = new Map<string, PersonalRecord>();
    const previousRecords = new Map<string, { value: number; date: number }>();
    
    // Process workouts in chronological order
    workouts.sort((a, b) => a.startTime - b.startTime);
    
    workouts.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        // Skip if we're filtering by exerciseIds and this one isn't included
        if (exerciseIds && !exerciseIds.includes(exercise.id) && 
            !exerciseIds.includes(exercise.exerciseId || '')) {
          return;
        }
        
        // Find the maximum weight used in any set
        const maxWeightSet = exercise.sets.reduce((max, set) => {
          if (!set.weight) return max;
          if (!max || set.weight > max.weight) {
            return { weight: set.weight, reps: set.reps || 0 };
          }
          return max;
        }, null as { weight: number; reps: number } | null);
        
        if (!maxWeightSet) return;
        
        const exerciseId = exercise.exerciseId || exercise.id;
        const currentRecord = recordsByExercise.get(exerciseId);
        
        // Check if this is a new record
        if (!currentRecord || maxWeightSet.weight > currentRecord.value) {
          // Save the previous record
          if (currentRecord) {
            previousRecords.set(exerciseId, {
              value: currentRecord.value,
              date: currentRecord.date
            });
          }
          
          // Create new record
          recordsByExercise.set(exerciseId, {
            id: `pr-${exerciseId}-${workout.id}`,
            exerciseId,
            exerciseName: exercise.title,
            value: maxWeightSet.weight,
            unit: 'lb',
            reps: maxWeightSet.reps,
            date: workout.startTime,
            workoutId: workout.id,
            previousRecord: previousRecords.get(exerciseId)
          });
        }
      });
    });
    
    // Convert to array and sort by date (most recent first)
    let records = Array.from(recordsByExercise.values())
      .sort((a, b) => b.date - a.date);
    
    // Apply limit if specified
    if (limit) {
      records = records.slice(0, limit);
    }
    
    this.cache.set(cacheKey, records);
    return records;
  }
  
  /**
   * Helper method to get workouts for a period
   */
  private async getWorkoutsForPeriod(period: 'week' | 'month' | 'year' | 'all'): Promise<Workout[]> {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    // Get workouts from both local and Nostr sources
    let localWorkouts: Workout[] = [];
    if (this.workoutService) {
      localWorkouts = await this.workoutService.getWorkoutsByDateRange(startDate.getTime(), now.getTime());
    }
    
    // In a real implementation, we would also fetch Nostr workouts
    // const nostrWorkouts = await this.nostrWorkoutService?.getWorkoutsByDateRange(startDate.getTime(), now.getTime());
    const nostrWorkouts: Workout[] = [];
    
    // Combine and deduplicate workouts
    const allWorkouts = [...localWorkouts];
    
    // Add Nostr workouts that aren't already in local workouts
    for (const nostrWorkout of nostrWorkouts) {
      if (!allWorkouts.some(w => w.id === nostrWorkout.id)) {
        allWorkouts.push(nostrWorkout);
      }
    }
    
    return allWorkouts.sort((a, b) => b.startTime - a.startTime);
  }
  
  /**
   * Invalidate cache when new workouts are added
   */
  invalidateCache(): void {
    this.cache.clear();
  }
}

// Create a singleton instance
export const analyticsService = new AnalyticsService();
