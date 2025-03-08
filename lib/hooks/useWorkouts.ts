// lib/hooks/useWorkouts.ts
import { useState, useCallback, useEffect } from 'react';
import { Workout } from '@/types/workout';
import { useWorkoutService } from '@/components/DatabaseProvider';

export function useWorkouts() {
  const workoutService = useWorkoutService();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadWorkouts = useCallback(async (limit: number = 50, offset: number = 0) => {
    try {
      setLoading(true);
      const data = await workoutService.getAllWorkouts(limit, offset);
      setWorkouts(data);
      setError(null);
    } catch (err) {
      console.error('Error loading workouts:', err);
      setError(err instanceof Error ? err : new Error('Failed to load workouts'));
      // Use mock data in dev mode if database is not ready
      if (__DEV__) {
        console.log('Using mock data because workout tables not yet created');
        setWorkouts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [workoutService]);

  const getWorkout = useCallback(async (id: string) => {
    try {
      return await workoutService.getWorkout(id);
    } catch (err) {
      console.error('Error getting workout:', err);
      throw err;
    }
  }, [workoutService]);

  const getWorkoutsByDate = useCallback(async (date: Date) => {
    try {
      // Create start and end of day timestamps
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      return await workoutService.getWorkoutsByDateRange(
        startOfDay.getTime(), 
        endOfDay.getTime()
      );
    } catch (err) {
      console.error('Error loading workouts for date:', err);
      throw err;
    }
  }, [workoutService]);

  const getWorkoutDates = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      return await workoutService.getWorkoutDates(
        startDate.getTime(),
        endDate.getTime()
      );
    } catch (err) {
      console.error('Error getting workout dates:', err);
      return [];
    }
  }, [workoutService]);

  const saveWorkout = useCallback(async (workout: Workout) => {
    try {
      await workoutService.saveWorkout(workout);
      await loadWorkouts(); // Refresh the list
    } catch (err) {
      console.error('Error saving workout:', err);
      throw err;
    }
  }, [workoutService, loadWorkouts]);

  const deleteWorkout = useCallback(async (id: string) => {
    try {
      await workoutService.deleteWorkout(id);
      setWorkouts(current => current.filter(w => w.id !== id));
    } catch (err) {
      console.error('Error deleting workout:', err);
      throw err;
    }
  }, [workoutService]);

  // Initial load
  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  return {
    workouts,
    loading,
    error,
    loadWorkouts,
    getWorkout,
    getWorkoutsByDate,
    getWorkoutDates,
    saveWorkout,
    deleteWorkout,
    refreshWorkouts: loadWorkouts
  };
}