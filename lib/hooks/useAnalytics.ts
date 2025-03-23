// lib/hooks/useAnalytics.ts
import { useEffect, useMemo } from 'react';
import { analyticsService } from '@/lib/services/AnalyticsService';
import { useWorkoutService } from '@/components/DatabaseProvider';

/**
 * Hook to provide access to the analytics service
 * This hook ensures the analytics service is properly initialized with
 * the necessary database services
 */
export function useAnalytics() {
  const workoutService = useWorkoutService();
  
  // Initialize the analytics service with the necessary services
  useEffect(() => {
    analyticsService.setWorkoutService(workoutService);
    
    // We could also set the NostrWorkoutService here if needed
    // analyticsService.setNostrWorkoutService(nostrWorkoutService);
    
    return () => {
      // Clear the cache when the component unmounts
      analyticsService.invalidateCache();
    };
  }, [workoutService]);
  
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
    
    // Cache management
    invalidateCache: () => analyticsService.invalidateCache()
  }), []);
  
  return analytics;
}
