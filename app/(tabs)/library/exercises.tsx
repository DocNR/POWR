// app/(tabs)/library/exercises.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator, ScrollView, Alert } from 'react-native';
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
import { useFocusEffect } from '@react-navigation/native';
import { FIXED_COLORS } from '@/lib/theme/colors';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Text } from '@/components/ui/text';

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
  
  // Delete alert state
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseDisplay | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  
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
    silentRefresh, // Add this
    updateFilters,
    clearFilters
  } = useExercises();  
  
  // Add this to refresh on screen focus
  useFocusEffect(
    React.useCallback(() => {
      // This will refresh without showing loading indicators if possible
      silentRefresh();
      return () => {};
    }, [silentRefresh])
  );

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

  const handleDeleteExercise = (exercise: ExerciseDisplay) => {
    setExerciseToDelete(exercise);
    setShowDeleteAlert(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!exerciseToDelete) return;
    
    try {
      await deleteExercise(exerciseToDelete.id);
      
      // If we were showing details for this exercise, close it
      if (selectedExercise?.id === exerciseToDelete.id) {
        setSelectedExercise(null);
      }
      
      // Refresh the list
      refreshExercises();
    } catch (error) {
      Alert.alert(
        "Cannot Delete Exercise",
        error instanceof Error ? error.message : 
        "This exercise cannot be deleted. It may be part of a POWR Pack."
      );
    } finally {
      setShowDeleteAlert(false);
      setExerciseToDelete(null);
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

      {/* Filter Sheet */}
      <FilterSheet 
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        options={currentFilters}
        onApplyFilters={handleApplyFilters}
        availableFilters={availableFilters}
      />

      {/* Loading indicator */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" className="mb-2" />
          <Text className="text-muted-foreground">Loading exercises...</Text>
        </View>
      ) : (
        <SimplifiedExerciseList
          exercises={exercises}
          onExercisePress={handleExercisePress}
          onDeletePress={handleDeleteExercise}
        />
      )}

      {/* Exercise details sheet */}
      <ModalExerciseDetails
        exercise={selectedExercise}
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
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Text className="text-xl font-semibold text-foreground">Delete Exercise</Text>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text className="text-muted-foreground">
                Are you sure you want to delete {exerciseToDelete?.title}? This action cannot be undone.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-end gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="mr-2">
                <Text>Cancel</Text>
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onPress={handleConfirmDelete}
                style={{ backgroundColor: FIXED_COLORS.destructive }}
              >
                <Text style={{ color: '#FFFFFF' }}>Delete</Text>
              </Button>
            </AlertDialogAction>
          </View>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}