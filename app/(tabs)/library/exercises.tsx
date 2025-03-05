// app/(tabs)/library/exercises.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Dumbbell, ListFilter } from 'lucide-react-native';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';
import { SimplifiedExerciseList } from '@/components/exercises/SimplifiedExerciseList';
import { ExerciseDetails } from '@/components/exercises/ExerciseDetails';
import { ExerciseDisplay, ExerciseType, BaseExercise, Equipment } from '@/types/exercise';
import { useExercises } from '@/lib/hooks/useExercises';
import { FilterSheet, type FilterOptions, type SourceType } from '@/components/library/FilterSheet';
import { useWorkoutStore } from '@/stores/workoutStore';

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
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDisplay | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters);
  const [activeFilters, setActiveFilters] = useState(0);
  const { isActive, isMinimized } = useWorkoutStore();
  const shouldShowFAB = !isActive || !isMinimized;

  const {
    exercises,
    loading,
    error,
    createExercise,
    deleteExercise,
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

  const handleEdit = async () => {
    // TODO: Implement edit functionality
    setSelectedExercise(null);
  };

  const handleCreateExercise = async (exerciseData: BaseExercise) => {
    // Convert BaseExercise to include required source information
    const exerciseWithSource: Omit<BaseExercise, 'id'> = {
      ...exerciseData,
      availability: {
        source: ['local']
      }
    };
    
    await createExercise(exerciseWithSource);
    setShowNewExercise(false);
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
              <Search size={18} className="text-muted-foreground" />
            </View>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search exercises"
              className="pl-9 pr-10 bg-muted/50 border-0"
            />
            <View className="absolute right-2 z-10 h-full justify-center">
              <Button 
                variant="ghost" 
                size="icon"
                onPress={() => setFilterSheetOpen(true)}
              >
                <View className="relative">
                  <ListFilter className="text-muted-foreground" size={20} />
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

      {/* Exercises list */}
      <SimplifiedExerciseList
        exercises={exercises}
        onExercisePress={handleExercisePress}
      />

      {/* Exercise details sheet */}
      {selectedExercise && (
        <ExerciseDetails
          exercise={selectedExercise}
          open={!!selectedExercise}
          onOpenChange={(open) => {
            if (!open) setSelectedExercise(null);
          }}
          onEdit={handleEdit}
        />
      )}

      {/* FAB for adding new exercise */}
      {shouldShowFAB && (
        <FloatingActionButton
          icon={Dumbbell}
          onPress={() => setShowNewExercise(true)}
        />
      )}

      {/* New exercise sheet */}
      <NewExerciseSheet 
        isOpen={showNewExercise}
        onClose={() => setShowNewExercise(false)}
        onSubmit={handleCreateExercise}
      />
    </View>
  );
}