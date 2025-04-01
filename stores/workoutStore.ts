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
  WorkoutExercise,
  WorkoutCompletionOptions
} from '@/types/workout';
import type {
  WorkoutTemplate,
  TemplateType,
  TemplateExerciseConfig
} from '@/types/templates';
import type { BaseExercise } from '@/types/exercise';
import { openDatabaseSync } from 'expo-sqlite';
import { FavoritesService } from '@/lib/db/services/FavoritesService';
import { router } from 'expo-router';
import { useNDKStore } from '@/lib/stores/ndk';
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';
import { TemplateService } from '@/lib//db/services/TemplateService';
import { WorkoutService } from '@/lib/db/services/WorkoutService'; // Add this import
import { NostrEvent } from '@/types/nostr';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { ExerciseService } from '@/lib/db/services/ExerciseService';

/**
 * Workout Store
 * 
 * This store manages the state for active workouts including:
 * - Starting, pausing, and completing workouts
 * - Managing exercise sets and completion status
 * - Handling workout timing and duration tracking
 * - Publishing workout data to Nostr when requested
 * - Tracking favorite templates
 * 
 * The store uses a timestamp-based approach for duration tracking,
 * capturing start and end times to accurately represent workout duration
 * even when accounting for time spent in completion flow.
 */


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
  completeWorkout: (options?: WorkoutCompletionOptions) => Promise<void>;
  cancelWorkout: () => Promise<void>;
  reset: () => void;
  publishEvent: (event: NostrEvent) => Promise<any>;

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
    // First stop any existing timer to avoid duplicate timers
    get().stopWorkoutTimer();
    
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

    // Stop the timer interval when pausing
    get().stopWorkoutTimer();
    
    set({ status: 'paused' });
    // Auto-save when pausing
    saveWorkout(activeWorkout);
  },

  resumeWorkout: () => {
    const { status, activeWorkout } = get();
    if (status !== 'paused' || !activeWorkout) return;

    set({ status: 'active' });
    
    // Restart the timer when resuming
    get().startWorkoutTimer();
  },

  completeWorkout: async (options?: WorkoutCompletionOptions) => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
  
    // Ensure workout timer is stopped
    get().stopWorkoutTimer();
  
    // If no options were provided, show the completion flow
    if (!options) {
      // Navigate to the completion flow screen
      router.push('/(workout)/complete');
      return;
    }
  
    const completedWorkout = {
      ...activeWorkout,
      isCompleted: true,
      lastUpdated: Date.now()
    };  

    try {
      // Save workout locally regardless of storage option
      await saveWorkout(completedWorkout);
      
      // Calculate and save summary statistics
      const summary = calculateWorkoutSummary(completedWorkout);
      await saveSummary(summary);
      
      // Handle Nostr publishing if selected and user is authenticated
      if (options.storageType !== 'local_only') {
        try {
          const { ndk, isAuthenticated } = useNDKStore.getState();
          
          if (ndk && isAuthenticated) {
            // Create appropriate Nostr event data
            const eventData = options.storageType === 'publish_complete'
              ? NostrWorkoutService.createCompleteWorkoutEvent(completedWorkout)
              : NostrWorkoutService.createLimitedWorkoutEvent(completedWorkout);
              
            // Use NDK to publish
            try {
              try {
                console.log('Starting workout event publish...');
                
                // Create a new event
                const event = new NDKEvent(ndk as any);
                
                // Set the properties
                event.kind = eventData.kind;
                event.content = eventData.content;
                event.tags = eventData.tags || [];
                event.created_at = eventData.created_at;
                
                // Add timeout for signing to prevent hanging
                const signPromise = event.sign();
                const signTimeout = new Promise<void>((_, reject) => {
                  setTimeout(() => reject(new Error('Signing timeout after 15 seconds')), 15000);
                });
                
                try {
                  // Race the sign operation against a timeout
                  await Promise.race([signPromise, signTimeout]);
                  console.log('Event signed successfully');
                  
                  // Add timeout for publishing as well
                  const publishPromise = event.publish();
                  const publishTimeout = new Promise<void>((_, reject) => {
                    setTimeout(() => reject(new Error('Publishing timeout after 15 seconds')), 15000);
                  });
                  
                  await Promise.race([publishPromise, publishTimeout]);
                  console.log('Successfully published workout event');
                  
                  // Handle social share if selected
                  if (options.shareOnSocial && options.socialMessage) {
                    try {
                      const socialEventData = NostrWorkoutService.createSocialShareEvent(
                        event.id,
                        options.socialMessage
                      );
                      
                      // Create an NDK event for the social share
                      const socialEvent = new NDKEvent(ndk as any);
                      socialEvent.kind = socialEventData.kind;
                      socialEvent.content = socialEventData.content;
                      socialEvent.tags = socialEventData.tags || [];
                      socialEvent.created_at = socialEventData.created_at;
                      
                      // Sign with timeout
                      const socialSignPromise = socialEvent.sign();
                      const socialSignTimeout = new Promise<void>((_, reject) => {
                        setTimeout(() => reject(new Error('Social signing timeout after 15 seconds')), 15000);
                      });
                      
                      await Promise.race([socialSignPromise, socialSignTimeout]);
                      
                      // Publish with timeout
                      const socialPublishPromise = socialEvent.publish();
                      const socialPublishTimeout = new Promise<void>((_, reject) => {
                        setTimeout(() => reject(new Error('Social publishing timeout after 15 seconds')), 15000);
                      });
                      
                      await Promise.race([socialPublishPromise, socialPublishTimeout]);
                      console.log('Successfully published social share');
                    } catch (socialError) {
                      console.error('Error publishing social share:', socialError);
                      // Continue with workout completion even if social sharing fails
                    }
                  }
                } catch (error) {
                  const signError = error as Error;
                  console.error('Error signing or publishing event:', signError);
                  
                  // Specific handling for timeout errors to give user better feedback
                  if (signError.message?.includes('timeout')) {
                    console.warn('The signing operation timed out. This may be due to an issue with the external signer.');
                  }
                  
                  // Continue with workout completion even though publishing failed
                }
              } catch (eventCreationError) {
                console.error('Error creating event:', eventCreationError);
                // Continue with workout completion, but log the error
              }
            } catch (publishError) {
              console.error('Error publishing to Nostr:', publishError);
            }
          }
        } catch (error) {
          console.error('Error preparing Nostr events:', error);
          // Continue anyway to preserve local data
        }
      }
      
      // Handle template updates if needed
      if (completedWorkout.templateId && options.templateAction !== 'keep_original') {
        try {
          if (options.templateAction === 'update_existing') {
            await TemplateService.updateExistingTemplate(completedWorkout);
          } else if (options.templateAction === 'save_as_new' && options.newTemplateName) {
            await TemplateService.saveAsNewTemplate(
              completedWorkout, 
              options.newTemplateName
            );
          }
        } catch (error) {
          console.error('Error updating template:', error);
          // Continue anyway to preserve workout data
        }
      }

      // Make sure workout timer is stopped again (just to be extra safe)
      get().stopWorkoutTimer();

      // Finally update the app state
      set({
        status: 'completed',
        activeWorkout: null, // Set to null to fully clear the workout
        isActive: false,
        isMinimized: false
      });
      
      // Ensure we fully reset the state
      get().reset();
      
    } catch (error) {
      console.error('Error completing workout:', error);
      // Consider showing an error message to the user
    }
  },

  publishEvent: async (event: NostrEvent) => {
    try {
      const { ndk, isAuthenticated } = useNDKStore.getState();
      
      if (!ndk || !isAuthenticated) {
        throw new Error('Not authenticated or NDK not initialized');
      }
      
      // Create a new NDK event
      const ndkEvent = new NDKEvent(ndk as any);
      
      // Copy event properties
      ndkEvent.kind = event.kind;
      ndkEvent.content = event.content;
      ndkEvent.tags = event.tags || [];
      ndkEvent.created_at = event.created_at;
      
      // Sign and publish
      await ndkEvent.sign();
      await ndkEvent.publish();
      
      return ndkEvent;
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw error;
    }
  },

  cancelWorkout: async () => {
    const { activeWorkout } = get();
    if (!activeWorkout) return;
  
    // Ensure workout timer is stopped
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
  
  // Workout timer management - improved for reliability
  startWorkoutTimer: () => {
    // Clear any existing timer first to prevent duplicates
    if (workoutTimerInterval) {
      clearInterval(workoutTimerInterval);
      workoutTimerInterval = null;
    }
    
    // Start a new timer that continues to run even when components unmount
    workoutTimerInterval = setInterval(() => {
      // Get fresh state reference to avoid stale closures
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
  startWorkoutFromTemplate: async (templateId: string, templateData?: WorkoutTemplate) => {
    // If template data is provided directly, use it
    const template = templateData || await getTemplate(templateId);
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
  
    // Set the end time right when entering completion flow
    set({
      activeWorkout: {
        ...activeWorkout,
        endTime: Date.now(),
        lastUpdated: Date.now()
      }
    });
  
    // Make sure to stop the timer before navigating
    get().stopWorkoutTimer();
    
    // Navigate to completion screen
    router.push('/(workout)/complete');
  },

  clearAutoSave: async () => {
    // TODO: Implement clearing autosave from storage
    
    // Make sure to stop the timer
    get().stopWorkoutTimer(); 
    
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
    // Make sure to stop the timer
    get().stopWorkoutTimer();
    
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
    const favoritesService = new FavoritesService(db);
    const exerciseService = new ExerciseService(db);
    const templateService = new TemplateService(db, new ExerciseService(db));

    
    // First try to get from favorites
    const favoriteResult = await favoritesService.getContentById<WorkoutTemplate>('template', templateId);
    if (favoriteResult) {
      return favoriteResult;
    }
    
    // If not in favorites, try the templates table
    const templateResult = await templateService.getTemplate(templateId);
    return templateResult;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

async function saveWorkout(workout: Workout): Promise<void> {
  try {
    console.log('Saving workout with endTime:', workout.endTime);
    
    // Use the workout service to save the workout
    const db = openDatabaseSync('powr.db');
    const workoutService = new WorkoutService(db);
    
    await workoutService.saveWorkout(workout);
  } catch (error) {
    console.error('Error saving workout:', error);
  }
}

async function saveSummary(summary: WorkoutSummary) {
  try {
    // Use the workout service to save summary metrics
    const db = openDatabaseSync('powr.db');
    const workoutService = new WorkoutService(db);
    
    await workoutService.saveWorkoutSummary(summary.id, summary);
    console.log('Workout summary saved successfully:', summary.id);
  } catch (error) {
    console.error('Error saving workout summary:', error);
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
