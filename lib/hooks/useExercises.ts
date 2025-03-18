// lib/hooks/useExercises.ts
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { 
  ExerciseDisplay, 
  ExerciseCategory, 
  Equipment, 
  ExerciseType, 
  BaseExercise,
  toExerciseDisplay 
} from '@/types/exercise';
import { LibraryService } from '../db/services/LibraryService';
import { useExerciseRefresh } from '@/lib/stores/libraryStore';

// Filtering types
export interface ExerciseFilters {
  type?: ExerciseType[];
  category?: ExerciseCategory[];
  equipment?: Equipment[];
  tags?: string[];
  source?: ('local' | 'powr' | 'nostr')[];
  searchQuery?: string;
}

interface ExerciseStats {
  totalCount: number;
  byCategory: Partial<Record<ExerciseCategory, number>>;
  byType: Partial<Record<ExerciseType, number>>;
  byEquipment: Partial<Record<Equipment, number>>;
}

const initialStats: ExerciseStats = {
  totalCount: 0,
  byCategory: {},
  byType: {},
  byEquipment: {},
};

export function useExercises() {
  const db = useSQLiteContext();
  const libraryService = React.useMemo(() => new LibraryService(db), [db]);
  const { refreshCount, refreshExercises, isLoading, setLoading } = useExerciseRefresh();
  
  const [exercises, setExercises] = useState<ExerciseDisplay[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [stats, setStats] = useState<ExerciseStats>(initialStats);
  
  // Add a loaded flag to track if we've successfully loaded exercises at least once
  const hasLoadedRef = useRef(false);

  // Define loadExercises before using it in useEffect
  const loadExercises = useCallback(async (showLoading: boolean = true) => {
    try {
      // Only show loading indicator if we haven't loaded before or if explicitly requested
      if (showLoading && (!hasLoadedRef.current || exercises.length === 0)) {
        setLoading(true);
      }
      
      const allExercises = await libraryService.getExercises();
      setExercises(allExercises);
      hasLoadedRef.current = true;
      
      // Calculate stats
      const newStats = allExercises.reduce((acc: ExerciseStats, exercise: ExerciseDisplay) => {
        // Increment total count
        acc.totalCount++;
        
        // Update category stats with type checking
        if (exercise.category) {
          acc.byCategory[exercise.category] = (acc.byCategory[exercise.category] || 0) + 1;
        }
        
        // Update type stats with type checking
        if (exercise.type) {
          acc.byType[exercise.type] = (acc.byType[exercise.type] || 0) + 1;
        }
        
        // Update equipment stats with type checking
        if (exercise.equipment) {
          acc.byEquipment[exercise.equipment] = (acc.byEquipment[exercise.equipment] || 0) + 1;
        }
        
        return acc;
      }, {
        totalCount: 0,
        byCategory: {},
        byType: {},
        byEquipment: {},
      });
      
      setStats(newStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load exercises'));
    } finally {
      setLoading(false);
    }
  }, [libraryService, setLoading, exercises.length]);

  // Add a silentRefresh method that doesn't show loading indicators
  const silentRefresh = useCallback(() => {
    loadExercises(false);
  }, [loadExercises]);

  // Load exercises when refreshCount changes
  useEffect(() => {
    loadExercises();
  }, [refreshCount, loadExercises]);

  // Filter exercises based on current filters
  const getFilteredExercises = useCallback(() => {
    return exercises.filter(exercise => {
      // Type filter
      if (filters.type?.length && !filters.type.includes(exercise.type)) {
        return false;
      }
      
      // Category filter
      if (filters.category?.length && !filters.category.includes(exercise.category)) {
        return false;
      }
      
      // Equipment filter
      if (filters.equipment?.length && exercise.equipment && !filters.equipment.includes(exercise.equipment)) {
        return false;
      }
      
      // Tags filter
      if (filters.tags?.length && !exercise.tags.some((tag: string) => filters.tags?.includes(tag))) {
        return false;
      }
      
      // Source filter
      if (filters.source?.length && !filters.source.includes(exercise.source)) {
        return false;
      }
      
      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          exercise.title.toLowerCase().includes(query) ||
          (exercise.description?.toLowerCase() || '').includes(query) ||
          exercise.tags.some((tag: string) => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [exercises, filters]);

  // Create a new exercise
  const createExercise = useCallback(async (exercise: Omit<BaseExercise, 'id'>) => {
    try {
      // Create a display version of the exercise with source
      const displayExercise: Omit<ExerciseDisplay, 'id'> = {
        ...exercise,
        source: 'local', // Set default source for new exercises
        isFavorite: false
      };

      const id = await libraryService.addExercise(displayExercise);
      refreshExercises(); // Use the store's refresh function instead of loading directly
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create exercise'));
      throw err;
    }
  }, [libraryService, refreshExercises]);

  // Delete an exercise
  const deleteExercise = useCallback(async (id: string) => {
    try {
      await libraryService.deleteExercise(id);
      refreshExercises(); // Use the store's refresh function
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete exercise'));
      throw err;
    }
  }, [libraryService, refreshExercises]);

  // Update an exercise
  const updateExercise = useCallback(async (id: string, updateData: Partial<BaseExercise>) => {
    try {
      // Get the existing exercise first
      const existingExercises = await libraryService.getExercises();
      const existingExercise = existingExercises.find(ex => ex.id === id);
      
      if (!existingExercise) {
        throw new Error(`Exercise with ID ${id} not found`);
      }
      
      // Delete the old exercise
      await libraryService.deleteExercise(id);
      
      // Prepare the updated exercise data (without id since it's Omit<ExerciseDisplay, "id">)
      const updatedExercise: Omit<ExerciseDisplay, 'id'> = {
        ...existingExercise,
        ...updateData,
        source: existingExercise.source || 'local',
        isFavorite: existingExercise.isFavorite || false
      };
      
      // Remove id property since it's not allowed in this type
      const { id: _, ...exerciseWithoutId } = updatedExercise as any;
      
      // Add the updated exercise with the same ID
      await libraryService.addExercise(exerciseWithoutId);
      
      // Refresh exercises to get the updated list
      refreshExercises();
      
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update exercise'));
      throw err;
    }
  }, [libraryService, refreshExercises]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<ExerciseFilters>) => {
    setFilters(current => ({
      ...current,
      ...newFilters
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    exercises: getFilteredExercises(),
    loading: isLoading,
    error,
    stats,
    filters,
    updateFilters,
    clearFilters,
    createExercise,
    deleteExercise,
    updateExercise, 
    refreshExercises, // Return the refresh function from the store
    silentRefresh // Add the silent refresh function
  };
}