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
import type { BaseExercise } from '@/types/exercise'; // Add this import

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

interface FavoriteItem {
  id: string;
  content: WorkoutTemplate;
  addedAt: number;
}

interface ExtendedWorkoutState extends WorkoutState {
  isActive: boolean;
  favorites: FavoriteItem[];
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

  // New favorite management
  getFavorites: () => Promise<FavoriteItem[]>;
  addFavorite: (template: WorkoutTemplate) => Promise<void>;
  removeFavorite: (templateId: string) => Promise<void>;
  checkFavoriteStatus: (templateId: string) => boolean;

  // New template management
  startWorkoutFromTemplate: (templateId: string) => Promise<void>;
  
  // Additional workout actions
  endWorkout: () => Promise<void>;
  clearAutoSave: () => Promise<void>;
  updateWorkoutTitle: (title: string) => void;
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
  favorites: []
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
      isActive: true
    });
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
      activeWorkout: completedWorkout
    });
  },

  cancelWorkout: () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    // Save cancelled state for recovery if needed
    saveWorkout({
      ...activeWorkout,
      isCompleted: false,
      endTime: Date.now(),
      lastUpdated: Date.now()
    });

    set(initialState);
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
    sets[setIndex] = {
      ...sets[setIndex],
      isCompleted: true,
      completedAt: now,
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
      set((state: WorkoutState) => ({
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
        sets: Array(templateExercise.targetSets || 3).fill({
          id: generateId('local'),
          type: 'normal',
          weight: 0,
          reps: templateExercise.targetReps || 0,
          isCompleted: false
        }),
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

  // Favorite Management
  getFavorites: async () => {
    const { favorites } = get();
    return favorites;
  },

  addFavorite: async (template: WorkoutTemplate) => {
    const favorites = [...get().favorites];
    favorites.push({
      id: template.id,
      content: template,
      addedAt: Date.now()
    });
    set({ favorites });
  },

  removeFavorite: async (templateId: string) => {
    const favorites = get().favorites.filter(f => f.id !== templateId);
    set({ favorites });
  },

  checkFavoriteStatus: (templateId: string) => {
    return get().favorites.some(f => f.id === templateId);
  },

  endWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;

    await get().completeWorkout();
    set({ isActive: false });
  },

  clearAutoSave: async () => {
    // TODO: Implement clearing autosave from storage
    set(initialState);
  },

  reset: () => set(initialState)
}));

// Helper functions
async function getTemplate(templateId: string): Promise<WorkoutTemplate | null> {
    // This is a placeholder - you'll need to implement actual template fetching
    // from your database/storage service
    try {
      // Example implementation:
      // return await db.getTemplate(templateId);
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