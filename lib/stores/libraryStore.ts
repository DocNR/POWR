// lib/stores/libraryStore.ts
import { create } from 'zustand';
import { createSelectors } from '@/utils/createSelectors';
import { ExerciseDisplay } from '@/types/exercise';
import { WorkoutTemplate } from '@/types/templates';
import { POWRPackWithContent } from '@/types/powr-pack';

interface LibraryState {
  // Refresh counters
  exerciseRefreshCount: number;
  templateRefreshCount: number;
  packRefreshCount: number;
  
  // Loading states
  exercisesLoading: boolean;
  templatesLoading: boolean;
  packsLoading: boolean;
  
  // Optional cached data (for performance)
  cachedExercises: ExerciseDisplay[] | null;
  cachedTemplates: WorkoutTemplate[] | null;
  cachedPacks: POWRPackWithContent[] | null;
}

interface LibraryActions {
  // Refresh triggers
  refreshExercises: () => void;
  refreshTemplates: () => void;
  refreshPacks: () => void;
  refreshAll: () => void;
  
  // Loading state setters
  setExercisesLoading: (loading: boolean) => void;
  setTemplatesLoading: (loading: boolean) => void;
  setPacksLoading: (loading: boolean) => void;
  
  // Cache management
  setCachedExercises: (exercises: ExerciseDisplay[] | null) => void;
  setCachedTemplates: (templates: WorkoutTemplate[] | null) => void;
  setCachedPacks: (packs: POWRPackWithContent[] | null) => void;
  clearCache: () => void;
}

const initialState: LibraryState = {
  exerciseRefreshCount: 0,
  templateRefreshCount: 0,
  packRefreshCount: 0,
  exercisesLoading: false,
  templatesLoading: false,
  packsLoading: false,
  cachedExercises: null,
  cachedTemplates: null,
  cachedPacks: null
};

const useLibraryStoreBase = create<LibraryState & LibraryActions>((set) => ({
  ...initialState,
  
  refreshExercises: () => set(state => ({ 
    exerciseRefreshCount: state.exerciseRefreshCount + 1 
  })),
  
  refreshTemplates: () => set(state => ({ 
    templateRefreshCount: state.templateRefreshCount + 1 
  })),
  
  refreshPacks: () => set(state => ({ 
    packRefreshCount: state.packRefreshCount + 1 
  })),
  
  refreshAll: () => set(state => ({
    exerciseRefreshCount: state.exerciseRefreshCount + 1,
    templateRefreshCount: state.templateRefreshCount + 1,
    packRefreshCount: state.packRefreshCount + 1
  })),
  
  setExercisesLoading: (loading) => set({ exercisesLoading: loading }),
  setTemplatesLoading: (loading) => set({ templatesLoading: loading }),
  setPacksLoading: (loading) => set({ packsLoading: loading }),
  
  setCachedExercises: (exercises) => set({ cachedExercises: exercises }),
  setCachedTemplates: (templates) => set({ cachedTemplates: templates }),
  setCachedPacks: (packs) => set({ cachedPacks: packs }),
  
  clearCache: () => set({
    cachedExercises: null,
    cachedTemplates: null,
    cachedPacks: null
  })
}));

// Create auto-generated selectors
export const useLibraryStore = createSelectors(useLibraryStoreBase);

// Export some convenient hooks 
export function useExerciseRefresh() {
  return {
    refreshCount: useLibraryStore(state => state.exerciseRefreshCount),
    refreshExercises: useLibraryStore(state => state.refreshExercises),
    isLoading: useLibraryStore(state => state.exercisesLoading),
    setLoading: useLibraryStore(state => state.setExercisesLoading)
  };
}

export function useTemplateRefresh() {
  return {
    refreshCount: useLibraryStore(state => state.templateRefreshCount),
    refreshTemplates: useLibraryStore(state => state.refreshTemplates),
    isLoading: useLibraryStore(state => state.templatesLoading),
    setLoading: useLibraryStore(state => state.setTemplatesLoading)
  };
}

export function usePackRefresh() {
  return {
    refreshCount: useLibraryStore(state => state.packRefreshCount),
    refreshPacks: useLibraryStore(state => state.refreshPacks),
    isLoading: useLibraryStore(state => state.packsLoading),
    setLoading: useLibraryStore(state => state.setPacksLoading)
  };
}

export function useLibraryRefresh() {
  return {
    refreshAll: useLibraryStore(state => state.refreshAll)
  };
}