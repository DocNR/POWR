// app/(tabs)/library/exercises.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Dumbbell, ListFilter } from 'lucide-react-native';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { ExerciseSheet } from '@/components/library/ExerciseSheet';
import { SimplifiedExerciseList } from '@/components/exercises/SimplifiedExerciseList';
import { ModalExerciseDetails } from '@/components/exercises/ModalExerciseDetails';
import { ExerciseDisplay, ExerciseType, BaseExercise, Equipment } from '@/types/exercise';
import { useExercises } from '@/lib/hooks/useExercises';
import { FilterSheet, type FilterOptions, type SourceType } from '@/components/library/FilterSheet';
import { useWorkoutStore } from '@/stores/workoutStore';
import { generateId } from '@/utils/ids';
import { useNDKStore } from '@/lib/stores/ndk';
import { useIconColor } from '@/lib/theme/iconUtils';

// Default available filters
const availableFilters = {
  equipment: ['Barbell', 'Dumbbell', 'Bodyweight', 'Machine', 'Cables', 'Other'],
  tags: ['Strength', 'Cardio', 'Mobility', 'Recovery'],
  source: ['local', 'powr', 'nostr'] as SourceType[]
};

// Initial filter state
const initialFilters: FilterOptions = {
  equipment: [],
  tags: [],
  source: []
};

export default function ExercisesScreen() {
  // Basic state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters);
  const [activeFilters, setActiveFilters] = useState(0);
  const { getIconProps } = useIconColor();

  // Exercise sheet state
  const [showExerciseSheet, setShowExerciseSheet] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<ExerciseDisplay | undefined>(undefined);
  const [editMode, setEditMode] = useState<'create' | 'edit' | 'fork'>('create');
  
  // Exercise details state
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDisplay | null>(null);
  
  // Other hooks
  const { isActive, isMinimized } = useWorkoutStore();
  const { currentUser } = useNDKStore();
  const shouldShowFAB = !isActive || !isMinimized;

  const {
    exercises,
    loading,
    error,
    createExercise,
    deleteExercise,
    updateExercise, 
    refreshExercises,
    updateFilters,
    clearFilters
  } = useExercises();

  // Filter exercises based on search query
  React.useEffect(() => {
    if (searchQuery) {
      updateFilters({ searchQuery });
    } else {
      updateFilters({ searchQuery: undefined });
    }
  }, [searchQuery, updateFilters]);

  const handleExercisePress = (exercise: ExerciseDisplay) => {
    setSelectedExercise(exercise);
  };

  // Mock exercise update function
  const handleUpdateExercise = async (id: string, updatedData: Partial<BaseExercise>): Promise<void> => {
    try {
      // Since we don't have a real update function, we'll fake it with delete + create
      // In a real app, this would be replaced with an actual update API call
      console.log(`Updating exercise ${id} with data:`, updatedData);
      
      // Delete the old exercise
      await deleteExercise(id);
      
      // Create a new exercise with the same ID and updated data
      await createExercise({
        ...updatedData,
        availability: updatedData.availability || { source: ['local'] }
      } as Omit<BaseExercise, 'id'>);
      
      // Refresh the exercise list
      refreshExercises();
    } catch (error) {
      console.error('Error updating exercise:', error);
    }
  };

  // Handle editing an exercise
  const handleEdit = () => {
    if (!selectedExercise) return;
    
    // Close the details modal
    setSelectedExercise(null);
    
    // Determine if we should edit or fork based on Nostr ownership
    const isNostrExercise = selectedExercise.source === 'nostr';
    const isCurrentUserAuthor = isNostrExercise && 
      selectedExercise.availability?.lastSynced?.nostr?.metadata?.pubkey === currentUser?.pubkey;
    
    const mode = isNostrExercise && !isCurrentUserAuthor ? 'fork' : 'edit';
    
    // Set up edit state
    setEditMode(mode);
    setExerciseToEdit(selectedExercise);
    
    // Open the exercise sheet
    setShowExerciseSheet(true);
  };

  // Handle creating a new exercise
  const handleCreateExercise = () => {
    setEditMode('create');
    setExerciseToEdit(undefined);
    setShowExerciseSheet(true);
  };

  // Handle submitting exercise form (create, edit, or fork)
  const handleSubmitExercise = async (exerciseData: BaseExercise) => {
    try {
      if (editMode === 'create') {
        // For new exercises, ensure the availability is set
        const exerciseWithSource: Omit<BaseExercise, 'id'> = {
          ...exerciseData,
          availability: {
            source: ['local']
          }
        };
        // Remove the ID from the data for new creation
        delete (exerciseWithSource as any).id;
        
        await createExercise(exerciseWithSource);
      } 
      else if (editMode === 'edit') {
        // Use the new updateExercise function directly
        await updateExercise(exerciseData.id, exerciseData);
      } 
      else if (editMode === 'fork') {
        // For forking, create a new exercise but keep the original data
        const { id: _, ...forkedExerciseData } = exerciseData;
        const forkedExercise: Omit<BaseExercise, 'id'> = {
          ...forkedExerciseData,
          availability: {
            source: ['local'] // Start as a local exercise
          }
        };
        await createExercise(forkedExercise);
      }
      
      // Refresh the exercise list after changes
      refreshExercises();
    } catch (error) {
      console.error('Error handling exercise submission:', error);
    }
    
    // Close the sheet regardless of success/failure
    setShowExerciseSheet(false);
  };

  const handleApplyFilters = (filters: FilterOptions) => {
    setCurrentFilters(filters);
    const totalFilters = Object.values(filters).reduce(
      (acc, curr) => acc + curr.length, 
      0
    );
    setActiveFilters(totalFilters);

    // Update the exercises hook filters with proper type casting
    if (filters.equipment.length > 0) {
      // Convert string[] to Equipment[] 
      const typedEquipment = filters.equipment.filter(eq => 
        ['bodyweight', 'barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'other'].includes(eq.toLowerCase())
      ) as Equipment[];
      
      updateFilters({ equipment: typedEquipment });
    }
    
    if (filters.tags.length > 0) {
      updateFilters({ tags: filters.tags });
    }
    if (filters.source.length > 0) {
      updateFilters({ source: filters.source as any[] });
    }
    
    if (totalFilters === 0) {
      clearFilters();
    }
  };

  return (
    <View className="flex-1 bg-background">
          {/* Search bar with filter button */}
          <View className="px-4 py-2 border-b border-border">
            <View className="flex-row items-center">
              <View className="relative flex-1">
                <View className="absolute left-3 z-10 h-full justify-center">
                  <Search size={18} {...getIconProps('primary')} />
                </View>
                <Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search exercises"
                  className="pl-9 pr-10 border-0 bg-background"
                />
                <View className="absolute right-2 z-10 h-full justify-center">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onPress={() => setFilterSheetOpen(true)}
                  >
                    <View className="relative">
                      <ListFilter size={20} {...getIconProps('primary')} />
                      {activeFilters > 0 && (
                        <View className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f7931a' }} />
                      )}
                    </View>
                  </Button>
                </View>
              </View>
            </View>
          </View>
        );

      {/* Filter Sheet */}
      <FilterSheet 
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        options={currentFilters}
        onApplyFilters={handleApplyFilters}
        availableFilters={availableFilters}
      />

      {/* Exercises list */}
      <SimplifiedExerciseList
        exercises={exercises}
        onExercisePress={handleExercisePress}
      />

      {/* Exercise details sheet */}
      <ModalExerciseDetails
        exercise={selectedExercise} // This can now be null
        open={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onEdit={handleEdit}
      />

      {/* FAB for adding new exercise */}
      {shouldShowFAB && (
        <FloatingActionButton
          icon={Dumbbell}
          onPress={handleCreateExercise}
        />
      )}

      {/* Exercise sheet for create/edit/fork */}
      <ExerciseSheet 
        isOpen={showExerciseSheet}
        onClose={() => setShowExerciseSheet(false)}
        onSubmit={handleSubmitExercise}
        exerciseToEdit={exerciseToEdit}
        mode={editMode}
      />
    </View>
  );
}