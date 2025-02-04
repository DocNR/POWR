// contexts/WorkoutContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { BaseExercise, WorkoutExercise, WorkoutSet } from '@/types/exercise';
import { WorkoutState } from '@/types/workout';
import { WorkoutTemplate } from '@/types/template';
import { generateId } from '@/utils/ids';

type WorkoutAction =
  | { type: 'START_WORKOUT'; payload: { title: string } }
  | { type: 'END_WORKOUT' }
  | { type: 'PAUSE_WORKOUT' }
  | { type: 'RESUME_WORKOUT' }
  | { type: 'ADD_EXERCISE'; payload: BaseExercise }
  | { type: 'UPDATE_EXERCISE'; payload: Partial<WorkoutExercise> & { id: string } }
  | { type: 'REMOVE_EXERCISE'; payload: { id: string } }
  | { type: 'ADD_SET'; payload: { exerciseId: string; set: WorkoutSet } }
  | { type: 'UPDATE_SET'; payload: { exerciseId: string; setId: string; updates: Partial<WorkoutSet> } }
  | { type: 'COMPLETE_SET'; payload: { exerciseId: string; setId: string } }
  | { type: 'UPDATE_NOTES'; payload: string }
  | { type: 'UPDATE_TITLE'; payload: string }
  | { type: 'START_FROM_TEMPLATE'; payload: WorkoutTemplate }
  | { type: 'RESTORE_STATE'; payload: WorkoutState }
  | { type: 'SAVE_TEMPLATE'; payload: WorkoutTemplate };

interface WorkoutContextType extends WorkoutState {
  startWorkout: (title: string) => void;
  endWorkout: () => Promise<void>;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  addExercise: (exercise: BaseExercise) => void;
  updateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  completeSet: (exerciseId: string, setId: string) => void;
  updateNotes: (notes: string) => void;
  updateTitle: (title: string) => void;
  startFromTemplate: (template: WorkoutTemplate) => void;
  saveTemplate: (template: WorkoutTemplate) => Promise<void>;
}

const initialState: WorkoutState = {
  id: generateId(),
  title: '',
  startTime: null,
  endTime: null,
  isActive: false,
  exercises: [],
  notes: '',
  totalTime: 0,
  isPaused: false,
  created_at: Date.now(),
  totalWeight: 0,
  availability: {
    source: ['local']
  }
};

const WorkoutContext = createContext<WorkoutContextType | null>(null);

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'START_WORKOUT':
      return {
        ...initialState,
        id: generateId(),
        title: action.payload.title,
        startTime: new Date(),
        isActive: true,
        created_at: Date.now(),
        availability: {
          source: ['local']
        }
      };
      
    case 'END_WORKOUT': {
      const endTime = new Date();
      const totalTime = state.startTime 
        ? Math.floor((endTime.getTime() - state.startTime.getTime()) / 1000)
        : 0;
      
      return {
        ...state,
        isActive: false,
        endTime,
        totalTime
      };
    }

    case 'PAUSE_WORKOUT':
      return { ...state, isPaused: true };

    case 'RESUME_WORKOUT':
      return { ...state, isPaused: false };

    case 'ADD_EXERCISE': {
      // Convert BaseExercise to WorkoutExercise
      const workoutExercise: WorkoutExercise = {
        ...action.payload,
        sets: [],
      };
      return {
        ...state,
        exercises: [...state.exercises, workoutExercise]
      };
    }

    case 'UPDATE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.map(ex =>
          ex.id === action.payload.id
            ? { ...ex, ...action.payload }
            : ex
        )
      };

    case 'REMOVE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.filter(ex => ex.id !== action.payload.id),
        totalWeight: state.exercises.reduce((total, ex) => {
          if (ex.id === action.payload.id) {
            return total - ex.sets.reduce((setTotal, set) => 
              setTotal + (set.weight || 0) * (set.reps || 0), 0);
          }
          return total;
        }, state.totalWeight)
      };

    case 'ADD_SET': {
      const newSet = action.payload.set;
      const setWeight = (newSet.weight || 0) * (newSet.reps || 0);
      
      return {
        ...state,
        exercises: state.exercises.map(ex =>
          ex.id === action.payload.exerciseId
            ? { ...ex, sets: [...ex.sets, action.payload.set] }
            : ex
        ),
        totalWeight: state.totalWeight + setWeight
      };
    }

    case 'UPDATE_SET': {
      const exercise = state.exercises.find(ex => ex.id === action.payload.exerciseId);
      const oldSet = exercise?.sets.find(set => set.id === action.payload.setId);
      const oldWeight = oldSet ? (oldSet.weight || 0) * (oldSet.reps || 0) : 0;
      
      const newWeight = action.payload.updates.weight !== undefined && action.payload.updates.reps !== undefined
        ? (action.payload.updates.weight || 0) * (action.payload.updates.reps || 0)
        : action.payload.updates.weight !== undefined
          ? (action.payload.updates.weight || 0) * ((oldSet?.reps || 0))
          : action.payload.updates.reps !== undefined
            ? ((oldSet?.weight || 0)) * (action.payload.updates.reps || 0)
            : oldWeight;

      return {
        ...state,
        exercises: state.exercises.map(ex =>
          ex.id === action.payload.exerciseId
            ? {
                ...ex,
                sets: ex.sets.map(set =>
                  set.id === action.payload.setId
                    ? { ...set, ...action.payload.updates }
                    : set
                )
              }
            : ex
        ),
        totalWeight: state.totalWeight - oldWeight + newWeight
      };
    }

    case 'COMPLETE_SET':
      return {
        ...state,
        exercises: state.exercises.map(ex =>
          ex.id === action.payload.exerciseId
            ? {
                ...ex,
                sets: ex.sets.map(set =>
                  set.id === action.payload.setId
                    ? { ...set, isCompleted: !set.isCompleted }
                    : set
                )
              }
            : ex
        )
      };

    case 'UPDATE_NOTES':
      return { ...state, notes: action.payload };

    case 'UPDATE_TITLE':
      return { ...state, title: action.payload };

    case 'START_FROM_TEMPLATE':
      const template = action.payload;
      return {
        ...initialState,
        id: generateId(),
        title: template.title,
        startTime: new Date(),
        isActive: true,
        created_at: Date.now(),
        templateSource: {
          id: template.id,
          title: template.title,
          category: template.category
        },
        availability: {
          source: ['local']
        }
      };

    case 'RESTORE_STATE':
      return action.payload;

    case 'SAVE_TEMPLATE':
      return state;

    default:
      return state;
  }
}

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);

  useEffect(() => {
    if (state.isActive) {
      const saveState = async () => {
        try {
          // Save to AsyncStorage implementation pending
        } catch (error) {
          console.error('Error auto-saving workout:', error);
        }
      };

      const interval = setInterval(saveState, 30000);
      return () => clearInterval(interval);
    }
  }, [state]);

  const contextValue: WorkoutContextType = {
    ...state,
    startWorkout: (title) => dispatch({ type: 'START_WORKOUT', payload: { title } }),
    endWorkout: async () => {
      dispatch({ type: 'END_WORKOUT' });
    },
    pauseWorkout: () => dispatch({ type: 'PAUSE_WORKOUT' }),
    resumeWorkout: () => dispatch({ type: 'RESUME_WORKOUT' }),
    addExercise: (exercise) => dispatch({ type: 'ADD_EXERCISE', payload: exercise }),
    updateExercise: (id, updates) => dispatch({ type: 'UPDATE_EXERCISE', payload: { id, ...updates } }),
    removeExercise: (id) => dispatch({ type: 'REMOVE_EXERCISE', payload: { id } }),
    addSet: (exerciseId, set) => dispatch({ type: 'ADD_SET', payload: { exerciseId, set } }),
    updateSet: (exerciseId, setId, updates) => 
      dispatch({ type: 'UPDATE_SET', payload: { exerciseId, setId, updates } }),
    completeSet: (exerciseId, setId) => 
      dispatch({ type: 'COMPLETE_SET', payload: { exerciseId, setId } }),
    updateNotes: (notes) => dispatch({ type: 'UPDATE_NOTES', payload: notes }),
    updateTitle: (title) => dispatch({ type: 'UPDATE_TITLE', payload: title }),
    startFromTemplate: (template) => dispatch({ type: 'START_FROM_TEMPLATE', payload: template }),
    saveTemplate: async (template) => {
      dispatch({ type: 'SAVE_TEMPLATE', payload: template });
    }
  };

  return (
    <WorkoutContext.Provider value={contextValue}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}