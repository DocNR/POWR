// lib/hooks/useExercises.ts
import React, { useState, useCallback, useEffect } from 'react';
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
  
  const [exercises, setExercises] = useState<ExerciseDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<ExerciseFilters>({});
  const [stats, setStats] = useState<ExerciseStats>(initialStats);

  // Load all exercises from the database
  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      const allExercises = await libraryService.getExercises();
      setExercises(allExercises);
      
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
  }, [libraryService]);

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
      await loadExercises(); // Reload all exercises to update stats
      return id;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create exercise'));
      throw err;
    }
  }, [libraryService, loadExercises]);

  // Delete an exercise
  const deleteExercise = useCallback(async (id: string) => {
    try {
      await libraryService.deleteExercise(id);
      await loadExercises(); // Reload to update stats
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete exercise'));
      throw err;
    }
  }, [libraryService, loadExercises]);

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

  // Initial load
  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  return {
    exercises: getFilteredExercises(),
    loading,
    error,
    stats,
    filters,
    updateFilters,
    clearFilters,
    createExercise,
    deleteExercise,
    refreshExercises: loadExercises
  };
}