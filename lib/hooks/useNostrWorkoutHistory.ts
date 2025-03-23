// lib/hooks/useNostrWorkoutHistory.ts
import { useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { UnifiedWorkoutHistoryService } from '@/lib/db/services/UnifiedWorkoutHistoryService';
import { Workout } from '@/types/workout';

/**
 * @deprecated This hook is deprecated. Please use useWorkoutHistory instead.
 * See docs/design/WorkoutHistory/MigrationGuide.md for migration instructions.
 */
export function useNostrWorkoutHistory() {
  console.warn(
    'useNostrWorkoutHistory is deprecated. ' +
    'Please use useWorkoutHistory instead. ' +
    'See docs/design/WorkoutHistory/MigrationGuide.md for migration instructions.'
  );
  
  const db = useSQLiteContext();
  
  // Create UnifiedWorkoutHistoryService instance
  const unifiedWorkoutHistoryService = useMemo(() => {
    return new UnifiedWorkoutHistoryService(db);
  }, [db]);
  
  // Return a compatibility layer that mimics the old API
  return {
    getAllWorkouts: (options?: {
      limit?: number;
      offset?: number;
      includeNostr?: boolean;
      isAuthenticated?: boolean;
    }): Promise<Workout[]> => {
      return unifiedWorkoutHistoryService.getAllWorkouts(options);
    },
    
    getWorkoutsByDate: (date: Date): Promise<Workout[]> => {
      return unifiedWorkoutHistoryService.getWorkoutsByDate(date);
    },
    
    getWorkoutDatesInMonth: (year: number, month: number): Promise<Date[]> => {
      return unifiedWorkoutHistoryService.getWorkoutDatesInMonth(year, month);
    },
    
    getWorkoutDetails: (workoutId: string): Promise<Workout | null> => {
      return unifiedWorkoutHistoryService.getWorkoutDetails(workoutId);
    }
  };
}
