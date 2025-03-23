// lib/hooks/useAnalytics.ts
import { useEffect, useMemo } from 'react';
import { analyticsService } from '@/lib/services/AnalyticsService';
import { useWorkoutService } from '@/components/DatabaseProvider';
import { useSQLiteContext } from 'expo-sqlite';
import { UnifiedWorkoutHistoryService } from '@/lib/db/services/UnifiedWorkoutHistoryService';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';

/**
 * Hook to provide access to the analytics service
 * This hook ensures the analytics service is properly initialized with
 * the necessary database services
 */
export function useAnalytics() {
  const workoutService = useWorkoutService();
  const db = useSQLiteContext();
  const { isAuthenticated } = useNDKCurrentUser();
  
  // Create UnifiedWorkoutHistoryService instance
  const unifiedWorkoutHistoryService = useMemo(() => {
    return new UnifiedWorkoutHistoryService(db);
  }, [db]);
  
  // Initialize the analytics service with the necessary services
  useEffect(() => {
    analyticsService.setWorkoutService(workoutService);
    analyticsService.setNostrWorkoutHistoryService(unifiedWorkoutHistoryService);
    
    return () => {
      // Clear the cache when the component unmounts
      analyticsService.invalidateCache();
    };
  }, [workoutService, unifiedWorkoutHistoryService]);
  
  // Create a memoized object with the analytics methods
  const analytics = useMemo(() => ({
    // Workout statistics
    getWorkoutStats: (period: 'week' | 'month' | 'year' | 'all') => 
      analyticsService.getWorkoutStats(period),
    
    // Exercise progress
    getExerciseProgress: (
      exerciseId: string,
      metric: 'weight' | 'reps' | 'volume',
      period: 'month' | 'year' | 'all'
    ) => analyticsService.getExerciseProgress(exerciseId, metric, period),
    
    // Personal records
    getPersonalRecords: (exerciseIds?: string[], limit?: number) => 
      analyticsService.getPersonalRecords(exerciseIds, limit),
    
    // New methods for Profile tab
    getWorkoutFrequency: (period: 'daily' | 'weekly' | 'monthly', limit?: number) => 
      analyticsService.getWorkoutFrequency(period, limit),
    
    getVolumeProgression: (period: 'daily' | 'weekly' | 'monthly', limit?: number) => 
      analyticsService.getVolumeProgression(period, limit),
    
    getStreakMetrics: () => 
      analyticsService.getStreakMetrics(),
    
    getSummaryStatistics: () => 
      analyticsService.getSummaryStatistics(),
    
    getMostFrequentExercises: (limit?: number) => 
      analyticsService.getMostFrequentExercises(limit),
    
    getWorkoutsByDayOfWeek: () => 
      analyticsService.getWorkoutsByDayOfWeek(),
    
    // Cache management
    invalidateCache: () => analyticsService.invalidateCache()
  }), []);
  
  return analytics;
}
