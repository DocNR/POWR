// lib/services/AnalyticsService.ts
import { Workout } from '@/types/workout';
import { WorkoutService } from '@/lib/db/services/WorkoutService';
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';
import { NostrWorkoutHistoryService } from '@/lib/db/services/NostrWorkoutHistoryService';
import { UnifiedWorkoutHistoryService } from '@/lib/db/services/UnifiedWorkoutHistoryService';

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
 * Analytics data for a specific period
 */
export interface AnalyticsData {
  date: Date;
  workoutCount: number;
  totalVolume: number;
  totalDuration: number;
  exerciseCount: number;
}

/**
 * Summary statistics for the profile overview
 */
export interface SummaryStatistics {
  totalWorkouts: number;
  totalVolume: number;
  totalExercises: number;
  averageDuration: number;
  currentStreak: number;
  longestStreak: number;
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
  metric?: 'weight' | 'reps' | 'volume';
}

/**
 * Exercise progress data structure
 */
export interface ExerciseProgress {
  exerciseId: string;
  exerciseName: string;
  dataPoints: {
    date: Date;
    value: number;
    workoutId: string;
  }[];
}

/**
 * Service for calculating workout analytics and progress data
 */
export class AnalyticsService {
  private workoutService: WorkoutService | null = null;
  private nostrWorkoutService: NostrWorkoutService | null = null;
  private nostrWorkoutHistoryService: NostrWorkoutHistoryService | null = null;
  private unifiedWorkoutHistoryService: UnifiedWorkoutHistoryService | null = null;
  private cache = new Map<string, any>();
  private includeNostr: boolean = true;
  
  // Set the workout service (called from React components)
  setWorkoutService(service: WorkoutService): void {
    this.workoutService = service;
  }
  
  // Set the Nostr workout service (called from React components)
  setNostrWorkoutService(service: NostrWorkoutService): void {
    this.nostrWorkoutService = service;
  }
  
  // Set the Nostr workout history service (called from React components)
  setNostrWorkoutHistoryService(service: NostrWorkoutHistoryService | UnifiedWorkoutHistoryService): void {
    if (service instanceof NostrWorkoutHistoryService) {
      this.nostrWorkoutHistoryService = service;
    } else {
      this.unifiedWorkoutHistoryService = service;
    }
  }
  
  // Set the Unified workout history service (called from React components)
  setUnifiedWorkoutHistoryService(service: UnifiedWorkoutHistoryService): void {
    this.unifiedWorkoutHistoryService = service;
  }
  
  // Set whether to include Nostr workouts in analytics
  setIncludeNostr(include: boolean): void {
    this.includeNostr = include;
    this.invalidateCache(); // Clear cache when this setting changes
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
    
    // If we have the UnifiedWorkoutHistoryService, use it to get all workouts
    if (this.unifiedWorkoutHistoryService) {
      return this.unifiedWorkoutHistoryService.getAllWorkouts({
        includeNostr: this.includeNostr,
        isAuthenticated: true
      });
    }
    
    // Fallback to NostrWorkoutHistoryService if UnifiedWorkoutHistoryService is not available
    if (this.nostrWorkoutHistoryService) {
      return this.nostrWorkoutHistoryService.getAllWorkouts({
        includeNostr: this.includeNostr,
        isAuthenticated: true
      });
    }
    
    // Fallback to using WorkoutService if NostrWorkoutHistoryService is not available
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
   * Get workout frequency data for a specific period
   */
  async getWorkoutFrequency(period: 'daily' | 'weekly' | 'monthly', limit: number = 30): Promise<AnalyticsData[]> {
    const cacheKey = `frequency-${period}-${limit}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    const now = new Date();
    let startDate: Date;
    
    // Determine date range based on period
    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - limit);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (limit * 7));
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - limit);
        break;
    }
    
    // Get workouts in the date range
    const workouts = await this.getWorkoutsForPeriod('all');
    const filteredWorkouts = workouts.filter(w => w.startTime >= startDate.getTime());
    
    // Group workouts by period
    const groupedData = new Map<string, AnalyticsData>();
    
    filteredWorkouts.forEach(workout => {
      const date = new Date(workout.startTime);
      let key: string;
      
      // Format date key based on period
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          // Get the week number (approximate)
          const weekNum = Math.floor(date.getDate() / 7);
          key = `${date.getFullYear()}-${date.getMonth() + 1}-W${weekNum}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
      }
      
      // Initialize or update group data
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          date: new Date(date),
          workoutCount: 0,
          totalVolume: 0,
          totalDuration: 0,
          exerciseCount: 0
        });
      }
      
      const data = groupedData.get(key)!;
      data.workoutCount++;
      data.totalVolume += workout.totalVolume || 0;
      data.totalDuration += (workout.endTime || date.getTime()) - workout.startTime;
      data.exerciseCount += workout.exercises?.length || 0;
    });
    
    // Convert to array and sort by date
    const result = Array.from(groupedData.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    this.cache.set(cacheKey, result);
    return result;
  }
  
  /**
   * Get volume progression data for a specific period
   */
  async getVolumeProgression(period: 'daily' | 'weekly' | 'monthly', limit: number = 30): Promise<AnalyticsData[]> {
    // This uses the same data as getWorkoutFrequency but is separated for clarity
    return this.getWorkoutFrequency(period, limit);
  }
  
  /**
   * Get streak metrics (current and longest streak)
   */
  async getStreakMetrics(): Promise<{ current: number; longest: number }> {
    const cacheKey = 'streak-metrics';
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    // Get all workouts
    const workouts = await this.getWorkoutsForPeriod('all');
    
    // Extract dates and sort them
    const dates = workouts.map(w => new Date(w.startTime).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(dates)].sort();
    
    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let currentStreakCount = 0;
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Check if the most recent workout was today or yesterday
    if (uniqueDates.length > 0) {
      const lastWorkoutDate = uniqueDates[uniqueDates.length - 1];
      const lastWorkoutTime = new Date(lastWorkoutDate).getTime();
      const todayTime = new Date(today).getTime();
      
      // If the last workout was within the last 48 hours, count the streak
      if (todayTime - lastWorkoutTime <= 48 * 60 * 60 * 1000) {
        currentStreakCount = 1;
        
        // Count consecutive days backwards
        for (let i = uniqueDates.length - 2; i >= 0; i--) {
          const currentDate = new Date(uniqueDates[i]);
          const nextDate = new Date(uniqueDates[i + 1]);
          
          // Check if dates are consecutive
          const diffTime = nextDate.getTime() - currentDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          
          if (diffDays <= 1.1) { // Allow for some time zone differences
            currentStreakCount++;
          } else {
            break;
          }
        }
      }
    }
    
    // Calculate longest streak
    let tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i - 1]);
      const nextDate = new Date(uniqueDates[i]);
      
      // Check if dates are consecutive
      const diffTime = nextDate.getTime() - currentDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (diffDays <= 1.1) { // Allow for some time zone differences
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }
    
    // Check if the final streak is the longest
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    
    const result = {
      current: currentStreakCount,
      longest: longestStreak
    };
    
    this.cache.set(cacheKey, result);
    return result;
  }
  
  /**
   * Get summary statistics for the profile overview
   */
  async getSummaryStatistics(): Promise<SummaryStatistics> {
    const cacheKey = 'summary-statistics';
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    // Get all workouts
    const workouts = await this.getWorkoutsForPeriod('all');
    
    // Calculate total workouts
    const totalWorkouts = workouts.length;
    
    // Calculate total volume
    const totalVolume = workouts.reduce((sum, workout) => sum + (workout.totalVolume || 0), 0);
    
    // Calculate total unique exercises
    const exerciseIds = new Set<string>();
    workouts.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        exerciseIds.add(exercise.exerciseId || exercise.id);
      });
    });
    const totalExercises = exerciseIds.size;
    
    // Calculate average duration
    const totalDuration = workouts.reduce((sum, workout) => {
      const duration = (workout.endTime || workout.startTime) - workout.startTime;
      return sum + duration;
    }, 0);
    const averageDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
    
    // Get streak metrics
    const { current, longest } = await this.getStreakMetrics();
    
    const result = {
      totalWorkouts,
      totalVolume,
      totalExercises,
      averageDuration,
      currentStreak: current,
      longestStreak: longest
    };
    
    this.cache.set(cacheKey, result);
    return result;
  }
  
  /**
   * Get most frequent exercises
   */
  async getMostFrequentExercises(limit: number = 5): Promise<{ exerciseId: string; exerciseName: string; count: number }[]> {
    const cacheKey = `frequent-exercises-${limit}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    // Get all workouts
    const workouts = await this.getWorkoutsForPeriod('all');
    
    // Count exercise occurrences
    const exerciseCounts = new Map<string, { name: string; count: number }>();
    
    workouts.forEach(workout => {
      workout.exercises?.forEach(exercise => {
        const id = exercise.exerciseId || exercise.id;
        if (!exerciseCounts.has(id)) {
          exerciseCounts.set(id, { name: exercise.title, count: 0 });
        }
        exerciseCounts.get(id)!.count++;
      });
    });
    
    // Convert to array and sort by count
    const result = Array.from(exerciseCounts.entries())
      .map(([id, data]) => ({
        exerciseId: id,
        exerciseName: data.name,
        count: data.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    this.cache.set(cacheKey, result);
    return result;
  }
  
  /**
   * Get workout distribution by day of week
   */
  async getWorkoutsByDayOfWeek(): Promise<{ day: number; count: number }[]> {
    const cacheKey = 'workouts-by-day';
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);
    
    // Get all workouts
    const workouts = await this.getWorkoutsForPeriod('all');
    
    // Initialize counts for each day (0 = Sunday, 6 = Saturday)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    
    // Count workouts by day
    workouts.forEach(workout => {
      const day = new Date(workout.startTime).getDay();
      dayCounts[day]++;
    });
    
    // Convert to result format
    const result = dayCounts.map((count, day) => ({ day, count }));
    
    this.cache.set(cacheKey, result);
    return result;
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
