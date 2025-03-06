// stores/workoutStore.ts

import { create } from 'zustand';
import { createSelectors } from '@/utils/createSelectors';
import { generateId } from '@/utils/ids';
import type { 
  Workout, 
  WorkoutState, 
  WorkoutAction, 
  RestTimer,
  WorkoutSet,
  WorkoutSummary,
  WorkoutExercise
} from '@/types/workout';
import type {
  WorkoutTemplate,
  TemplateType,
  TemplateExerciseConfig
} from '@/types/templates';
import type { BaseExercise } from '@/types/exercise';
import { openDatabaseSync } from 'expo-sqlite';
import { FavoritesService } from '@/lib/db/services/FavoritesService';


const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Define a module-level timer reference for the workout timer
// This ensures it persists even when components unmount
let workoutTimerInterval: NodeJS.Timeout | null = null;

interface FavoriteItem {
  id: string;
  content: WorkoutTemplate;
  addedAt: number;
}

interface ExtendedWorkoutState extends WorkoutState {
  isActive: boolean;
  isMinimized: boolean;
  favoriteIds: string[]; // Only store IDs in memory
  favoritesLoaded: boolean;
}

interface WorkoutActions {
  // Core Workout Flow
  startWorkout: (workout: Partial<Workout>) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  completeWorkout: () => void;
  cancelWorkout: () => void;
  reset: () => void;

  // Exercise and Set Management
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet>) => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;
  nextExercise: () => void;
  previousExercise: () => void;

  // Rest Timer
  startRest: (duration: number) => void;
  stopRest: () => void;
  extendRest: (additionalSeconds: number) => void;

  // Timer Actions
  tick: (elapsed: number) => void;
}

interface ExtendedWorkoutActions extends WorkoutActions {
  // Core Workout Flow from original implementation
  startWorkout: (workout: Partial<Workout>) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  completeWorkout: () => void;
  cancelWorkout: () => void;
  reset: () => void;

  // Exercise and Set Management from original implementation
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet>) => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;
  nextExercise: () => void;
  previousExercise: () => void;
  addExercises: (exercises: BaseExercise[]) => void;

  // Rest Timer from original implementation
  startRest: (duration: number) => void;
  stopRest: () => void;
  extendRest: (additionalSeconds: number) => void;

  // Timer Actions from original implementation
  tick: (elapsed: number) => void;

  // New favorite management with persistence
  getFavorites: () => Promise<FavoriteItem[]>;
  addFavorite: (template: WorkoutTemplate) => Promise<void>;
  removeFavorite: (templateId: string) => Promise<void>;
  checkFavoriteStatus: (templateId: string) => boolean;
  loadFavorites: () => Promise<void>;

  // New template management
  startWorkoutFromTemplate: (templateId: string) => Promise<void>;
  
  // Additional workout actions
  endWorkout: () => Promise<void>;
  clearAutoSave: () => Promise<void>;
  updateWorkoutTitle: (title: string) => void;
  
  // Minimized state actions
  minimizeWorkout: () => void;
  maximizeWorkout: () => void;
  
  // Workout timer management
  startWorkoutTimer: () => void;
  stopWorkoutTimer: () => void;
}

const initialState: ExtendedWorkoutState = {
  status: 'idle',
  activeWorkout: null,
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  elapsedTime: 0,
  restTimer: {
    isActive: false,
    duration: 0,
    remaining: 0
  },
  isActive: false,
  isMinimized: false,
  favoriteIds: [],
  favoritesLoaded: false
};

const useWorkoutStoreBase = create<ExtendedWorkoutState & ExtendedWorkoutActions>()((set, get) => ({
  ...initialState,  

  // Core Workout Flow
  startWorkout: (workoutData: Partial<Workout> = {}) => {
    const workout: Workout = {
      id: generateId('local'),
      title: workoutData.title || 'Quick Workout',
      type: workoutData.type || 'strength',
      exercises: workoutData.exercises || [], // Start with empty exercises array
      startTime: Date.now(),
      isCompleted: false,
      created_at: Date.now(),
      lastUpdated: Date.now(),
      availability: {
        source: ['local']
      },
      ...workoutData
    };
  
    set({
      status: 'active',
      activeWorkout: workout,
      currentExerciseIndex: 0,
      elapsedTime: 0,
      isActive: true,
      isMinimized: false
    });
    
    // Start the workout timer
    get().startWorkoutTimer();
  },

  pauseWorkout: () => {
    const { status, activeWorkout } = get();
    if (status !== 'active' || !activeWorkout) return;

    set({ status: 'paused' });
    // Auto-save when pausing
    saveWorkout(activeWorkout);
  },

  resumeWorkout: () => {
    const { status, activeWorkout } = get();
    if (status !== 'paused' || !activeWorkout) return;

    set({ status: 'active' });
  },

  completeWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    // Stop the workout timer
    get().stopWorkoutTimer();

    const completedWorkout = {
      ...activeWorkout,
      isCompleted: true,
      endTime: Date.now(),
      lastUpdated: Date.now()
    };

    // Save final workout state
    await saveWorkout(completedWorkout);

    // Calculate and save summary statistics
    const summary = calculateWorkoutSummary(completedWorkout);
    await saveSummary(summary);

    set({
      status: 'completed',
      activeWorkout: completedWorkout,
      isActive: false,
      isMinimized: false
    });
  },

  cancelWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
  
    // Stop the workout timer
    get().stopWorkoutTimer();
    
    // Prepare canceled workout with proper metadata
    const canceledWorkout = {
      ...activeWorkout,
      isCompleted: false,
      endTime: Date.now(),
      lastUpdated: Date.now(),
      status: 'canceled'
    };
    
    // Log the cancellation if needed
    console.log('Workout canceled:', canceledWorkout.id);
    
    // Save the canceled state for analytics or recovery purposes
    await saveWorkout(canceledWorkout);
    
    // Clear any auto-saves
    // This would be the place to implement storage cleanup if needed
    await get().clearAutoSave();
    
    // Reset to initial state, but preserve favorites
    const favoriteIds = get().favoriteIds;
    const favoritesLoaded = get().favoritesLoaded;
    set({
      ...initialState,
      favoriteIds,
      favoritesLoaded
    });
  },

  // Exercise and Set Management
  updateSet: (exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet>) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const exercises = [...activeWorkout.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];

    const now = Date.now();
    sets[setIndex] = {
      ...sets[setIndex],
      ...data,
      lastUpdated: now
    };

    exercise.sets = sets;
    exercise.lastUpdated = now;
    exercises[exerciseIndex] = exercise;

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises,
        lastUpdated: now
      }
    });
  },

  completeSet: (exerciseIndex: number, setIndex: number) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    const exercises = [...activeWorkout.exercises];
    const exercise = { ...exercises[exerciseIndex] };
    const sets = [...exercise.sets];

    const now = Date.now();
    
    // Toggle completion status
    const isCurrentlyCompleted = sets[setIndex].isCompleted;
    
    sets[setIndex] = {
      ...sets[setIndex],
      isCompleted: !isCurrentlyCompleted,
      completedAt: !isCurrentlyCompleted ? now : undefined,
      lastUpdated: now
    };

    exercise.sets = sets;
    exercise.lastUpdated = now;
    exercises[exerciseIndex] = exercise;

    set({
      activeWorkout: {
        ...activeWorkout,
        exercises,
        lastUpdated: now
      }
    });
  },

  nextExercise: () => {
    const { activeWorkout, currentExerciseIndex } = get();
    if (!activeWorkout) return;

    const nextIndex = Math.min(
      currentExerciseIndex + 1,
      activeWorkout.exercises.length - 1
    );

    set({ 
      currentExerciseIndex: nextIndex,
      currentSetIndex: 0
    });
  },

  previousExercise: () => {
    const { currentExerciseIndex } = get();
    
    set({ 
      currentExerciseIndex: Math.max(currentExerciseIndex - 1, 0),
      currentSetIndex: 0
    });
  },

  addExercises: (exercises: BaseExercise[]) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
  
    const now = Date.now();
    const newExercises: WorkoutExercise[] = exercises.map(ex => ({
      id: generateId('local'),
      title: ex.title,
      type: ex.type,
      category: ex.category,
      equipment: ex.equipment,
      tags: ex.tags || [],
      availability: {
        source: ['local']
      },
      created_at: now,
      lastUpdated: now,
      sets: [
        {
          id: generateId('local'),
          type: 'normal',
          weight: 0,
          reps: 0,
          isCompleted: false
        }
      ],
      isCompleted: false
    }));
  
    set({
      activeWorkout: {
        ...activeWorkout,
        exercises: [...activeWorkout.exercises, ...newExercises],
        lastUpdated: now
      }
    });
  },

  // Rest Timer
  startRest: (duration: number) => set({
    restTimer: {
      isActive: true,
      duration,
      remaining: duration
    }
  }),

  stopRest: () => set({
    restTimer: initialState.restTimer
  }),

  extendRest: (additionalSeconds: number) => {
    const { restTimer } = get();
    if (!restTimer.isActive) return;

    set({
      restTimer: {
        ...restTimer,
        duration: restTimer.duration + additionalSeconds,
        remaining: restTimer.remaining + additionalSeconds
      }
    });
  },

  // Timer Actions
  tick: (elapsed: number) => {
    const { status, restTimer } = get();
    
    if (status === 'active') {
      set((state: ExtendedWorkoutState) => ({
        elapsedTime: state.elapsedTime + elapsed
      }));

      // Update rest timer if active
      if (restTimer.isActive) {
        const remaining = Math.max(0, restTimer.remaining - elapsed/1000);
        
        if (remaining === 0) {
          set({ restTimer: initialState.restTimer });
        } else {
          set({
            restTimer: {
              ...restTimer,
              remaining
            }
          });
        }
      }
    }
  },
  
  // Workout timer management - new functions
  startWorkoutTimer: () => {
    // Clear any existing timer first to prevent duplicates
    if (workoutTimerInterval) {
      clearInterval(workoutTimerInterval);
      workoutTimerInterval = null;
    }
    
    // Start a new timer that continues to run even when components unmount
    workoutTimerInterval = setInterval(() => {
      const { status } = useWorkoutStoreBase.getState();
      if (status === 'active') {
        useWorkoutStoreBase.getState().tick(1000);
      }
    }, 1000);
    
    console.log('Workout timer started');
  },
  
  stopWorkoutTimer: () => {
    if (workoutTimerInterval) {
      clearInterval(workoutTimerInterval);
      workoutTimerInterval = null;
      console.log('Workout timer stopped');
    }
  },

  // Template Management
  startWorkoutFromTemplate: async (templateId: string) => {
    // Get template from your template store/service
    const template = await getTemplate(templateId);
    if (!template) return;
  
    // Convert template exercises to workout exercises
    const exercises: WorkoutExercise[] = template.exercises.map(templateExercise => ({
        id: generateId('local'),
        title: templateExercise.exercise.title,
        type: templateExercise.exercise.type,
        category: templateExercise.exercise.category,
        equipment: templateExercise.exercise.equipment,
        tags: templateExercise.exercise.tags || [],
        availability: {
          source: ['local']
        },
        created_at: Date.now(),
        sets: Array(templateExercise.targetSets || 3).fill(0).map(() => ({
          id: generateId('local'),
          type: 'normal',
          weight: 0,
          reps: templateExercise.targetReps || 0,
          isCompleted: false
        })),
        isCompleted: false,
        notes: templateExercise.notes || ''
      }));
    
      // Start workout with template data
      get().startWorkout({
        title: template.title,
        type: template.type || 'strength',
        exercises,
        templateId: template.id
      });
    },

  updateWorkoutTitle: (title: string) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
    
    set({
      activeWorkout: {
        ...activeWorkout,
        title,
        lastUpdated: Date.now()
      }
    });
  },

  // Favorite Management with SQLite persistence - IMPROVED VERSION
  loadFavorites: async () => {
    try {
      // Get the favorites service through a local import trick since we can't use hooks here
      const db = openDatabaseSync('powr.db');
      const favoritesService = new FavoritesService(db);
      
      // Load just the IDs 
      const favoriteIds = await favoritesService.getFavoriteIds('template');
      
      set({ 
        favoriteIds, 
        favoritesLoaded: true 
      });
      
      console.log(`Loaded ${favoriteIds.length} favorite IDs from database`);
    } catch (error) {
      console.error('Error loading favorites:', error);
      set({ favoritesLoaded: true }); // Mark as loaded even on error
    }
  },
  
  getFavorites: async () => {
    const { favoriteIds, favoritesLoaded } = get();
    
    // If favorites haven't been loaded from database yet, load them
    if (!favoritesLoaded) {
      await get().loadFavorites();
    }
    
    // If no favorites, return empty array
    if (get().favoriteIds.length === 0) {
      return [];
    }
    
    try {
      const db = openDatabaseSync('powr.db');
      const favoritesService = new FavoritesService(db);
      
      return await favoritesService.getFavorites('template');
    } catch (error) {
      console.error('Error fetching favorites content:', error);
      return [];
    }
  },
  
  addFavorite: async (template: WorkoutTemplate) => {
    try {
      const db = openDatabaseSync('powr.db');
      const favoritesService = new FavoritesService(db);
      
      // Add to favorites database
      await favoritesService.addFavorite('template', template.id, template);
      
      // Update just the ID in memory state
      set(state => {
        // Only add if not already present
        if (!state.favoriteIds.includes(template.id)) {
          return { favoriteIds: [...state.favoriteIds, template.id] };
        }
        return state;
      });
      
      console.log(`Added template "${template.title}" to favorites`);
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  },
  
  removeFavorite: async (templateId: string) => {
    try {
      const db = openDatabaseSync('powr.db');
      const favoritesService = new FavoritesService(db);
      
      // Remove from favorites database
      await favoritesService.removeFavorite('template', templateId);
      
      // Update IDs in memory state
      set(state => ({
        favoriteIds: state.favoriteIds.filter(id => id !== templateId)
      }));
      
      console.log(`Removed template with ID "${templateId}" from favorites`);
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },

  checkFavoriteStatus: (templateId: string) => {
    return get().favoriteIds.includes(templateId);
  },

  endWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    await get().completeWorkout();
  },

  clearAutoSave: async () => {
    // TODO: Implement clearing autosave from storage
    get().stopWorkoutTimer(); // Make sure to stop the timer
    
    // Preserve favorites when resetting
    const favoriteIds = get().favoriteIds;
    const favoritesLoaded = get().favoritesLoaded;
    
    set({
      ...initialState,
      favoriteIds,
      favoritesLoaded
    });
  },
  
  // New actions for minimized state
  minimizeWorkout: () => {
    set({ isMinimized: true });
  },
  
  maximizeWorkout: () => {
    set({ isMinimized: false });
  },

  reset: () => {
    get().stopWorkoutTimer(); // Make sure to stop the timer
    
    // Preserve favorites when resetting
    const favoriteIds = get().favoriteIds;
    const favoritesLoaded = get().favoritesLoaded;
    
    set({
      ...initialState,
      favoriteIds,
      favoritesLoaded
    });
  }
}));

// Helper functions
async function getTemplate(templateId: string): Promise<WorkoutTemplate | null> {
  try {
    // Try to get it from favorites in the database
    const db = openDatabaseSync('powr.db');
    
    const result = await db.getFirstAsync<{
      content: string
    }>(
      `SELECT content FROM favorites WHERE content_type = 'template' AND content_id = ?`,
      [templateId]
    );
    
    if (result && result.content) {
      return JSON.parse(result.content);
    }
    
    // If not found in favorites, could implement fetching from template database
    // Example: return await db.getTemplate(templateId);
    console.log('Template not found in favorites:', templateId);
    return null;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

async function saveWorkout(workout: Workout): Promise<void> {
  try {
    // TODO: Implement actual save logic using our database service
    console.log('Saving workout:', workout);
  } catch (error) {
    console.error('Error saving workout:', error);
  }
}

function calculateWorkoutSummary(workout: Workout): WorkoutSummary {
  return {
    id: generateId('local'),
    title: workout.title,
    type: workout.type,
    duration: workout.endTime ? workout.endTime - workout.startTime : 0,
    startTime: workout.startTime,
    endTime: workout.endTime || Date.now(),
    exerciseCount: workout.exercises.length,
    completedExercises: workout.exercises.filter(e => e.isCompleted).length,
    totalVolume: calculateTotalVolume(workout),
    totalReps: calculateTotalReps(workout),
    averageRpe: calculateAverageRpe(workout),
    exerciseSummaries: [],
    personalRecords: []
  };
}

function calculateTotalVolume(workout: Workout): number {
  return workout.exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((setTotal, set) => {
      return setTotal + (set.weight || 0) * (set.reps || 0);
    }, 0);
  }, 0);
}

function calculateTotalReps(workout: Workout): number {
  return workout.exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((setTotal, set) => {
      return setTotal + (set.reps || 0);
    }, 0);
  }, 0);
}

function calculateAverageRpe(workout: Workout): number {
  const rpeSets = workout.exercises.reduce((sets, exercise) => {
    return sets.concat(exercise.sets.filter(set => set.rpe !== undefined));
  }, [] as WorkoutSet[]);

  if (rpeSets.length === 0) return 0;

  const totalRpe = rpeSets.reduce((total, set) => total + (set.rpe || 0), 0);
  return totalRpe / rpeSets.length;
}

async function saveSummary(summary: WorkoutSummary) {
  // TODO: Implement summary saving
  console.log('Saving summary:', summary);
}

// Create auto-generated selectors
export const useWorkoutStore = createSelectors(useWorkoutStoreBase);

// Clean up interval on hot reload in development
if (typeof module !== 'undefined' && 'hot' in module) {
  // @ts-ignore - 'hot' exists at runtime but TypeScript doesn't know about it
  module.hot?.dispose(() => {
    if (workoutTimerInterval) {
      clearInterval(workoutTimerInterval);
      workoutTimerInterval = null;
      console.log('Workout timer cleared on hot reload');
    }
  });
}