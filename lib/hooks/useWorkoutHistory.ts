// lib/hooks/useWorkoutHistory.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { UnifiedWorkoutHistoryService, WorkoutFilters } from '@/lib/db/services/UnifiedWorkoutHistoryService';
import { Workout } from '@/types/workout';

interface UseWorkoutHistoryOptions {
  includeNostr?: boolean;
  filters?: WorkoutFilters;
  realtime?: boolean;
}

/**
 * Hook for fetching and managing workout history from both local database and Nostr
 * This hook uses the UnifiedWorkoutHistoryService to provide a consistent interface
 * for working with workouts from multiple sources.
 */
export function useWorkoutHistory(options: UseWorkoutHistoryOptions = {}) {
  const {
    includeNostr = true,
    filters,
    realtime = false
  } = options;
  
  const db = useSQLiteContext();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Initialize service
  const workoutHistoryService = useMemo(() => new UnifiedWorkoutHistoryService(db), [db]);
  
  // Load workouts function
  const loadWorkouts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let result: Workout[];
      
      if (filters) {
        // Use filters if provided
        result = await workoutHistoryService.filterWorkouts(filters);
      } else {
        // Otherwise get all workouts
        result = await workoutHistoryService.getAllWorkouts({
          includeNostr,
          isAuthenticated
        });
      }
      
      setWorkouts(result);
      return result;
    } catch (err) {
      console.error('Error loading workouts:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workoutHistoryService, filters, includeNostr, isAuthenticated]);
  
  // Initial load
  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);
  
  // Set up real-time subscription if enabled
  useEffect(() => {
    if (!realtime || !isAuthenticated || !currentUser?.pubkey || !includeNostr) {
      return;
    }
    
    // Subscribe to real-time updates
    const subId = workoutHistoryService.subscribeToNostrWorkouts(
      currentUser.pubkey,
      (newWorkout) => {
        setWorkouts(prev => {
          // Check if workout already exists
          const exists = prev.some(w => w.id === newWorkout.id);
          if (exists) {
            // Update existing workout
            return prev.map(w => w.id === newWorkout.id ? newWorkout : w);
          } else {
            // Add new workout
            return [newWorkout, ...prev];
          }
        });
      }
    );
    
    // Clean up subscription
    return () => {
      workoutHistoryService.unsubscribeFromNostrWorkouts(subId);
    };
  }, [workoutHistoryService, currentUser?.pubkey, isAuthenticated, realtime, includeNostr]);
  
  // Refresh function for pull-to-refresh
  const refresh = useCallback(() => {
    setRefreshing(true);
    return loadWorkouts();
  }, [loadWorkouts]);
  
  // Get workouts for a specific date
  const getWorkoutsByDate = useCallback(async (date: Date): Promise<Workout[]> => {
    try {
      return await workoutHistoryService.getWorkoutsByDate(date);
    } catch (err) {
      console.error('Error getting workouts by date:', err);
      return [];
    }
  }, [workoutHistoryService]);
  
  // Get workout details
  const getWorkoutDetails = useCallback(async (workoutId: string): Promise<Workout | null> => {
    try {
      return await workoutHistoryService.getWorkoutDetails(workoutId);
    } catch (err) {
      console.error('Error getting workout details:', err);
      return null;
    }
  }, [workoutHistoryService]);
  
  // Publish workout to Nostr
  const publishWorkoutToNostr = useCallback(async (workoutId: string): Promise<string> => {
    try {
      return await workoutHistoryService.publishWorkoutToNostr(workoutId);
    } catch (err) {
      console.error('Error publishing workout to Nostr:', err);
      throw err;
    }
  }, [workoutHistoryService]);
  
  // Import Nostr workout to local
  const importNostrWorkoutToLocal = useCallback(async (eventId: string): Promise<string> => {
    try {
      return await workoutHistoryService.importNostrWorkoutToLocal(eventId);
    } catch (err) {
      console.error('Error importing Nostr workout:', err);
      throw err;
    }
  }, [workoutHistoryService]);
  
  return {
    workouts,
    loading,
    error,
    refreshing,
    refresh,
    getWorkoutsByDate,
    getWorkoutDetails,
    publishWorkoutToNostr,
    importNostrWorkoutToLocal,
    service: workoutHistoryService
  };
}
