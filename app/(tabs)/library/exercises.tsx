// app/(tabs)/library/exercises.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Dumbbell } from 'lucide-react-native';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';
import { SimplifiedExerciseList } from '@/components/exercises/SimplifiedExerciseList';
import { ExerciseDetails } from '@/components/exercises/ExerciseDetails';
import { ExerciseDisplay, ExerciseType, BaseExercise } from '@/types/exercise';
import { useExercises } from '@/lib/hooks/useExercises';

export default function ExercisesScreen() {
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ExerciseType | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDisplay | null>(null);

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

  // Update type filter when activeFilter changes
  React.useEffect(() => {
    if (activeFilter) {
      updateFilters({ type: [activeFilter] });
    } else {
      clearFilters();
    }
  }, [activeFilter, updateFilters, clearFilters]);

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
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text className="mt-4 text-muted-foreground">Loading exercises...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-background">
        <Text className="text-destructive text-center mb-4">
          {error.message}
        </Text>
        <Button onPress={refreshExercises}>
          <Text className="text-primary-foreground">Retry</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Search bar */}
      <View className="px-4 py-3">
        <View className="relative flex-row items-center bg-muted rounded-xl">
          <View className="absolute left-3 z-10">
            <Search size={18} className="text-muted-foreground" />
          </View>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            className="pl-9 bg-transparent h-10 flex-1"
          />
        </View>
      </View>

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
      <FloatingActionButton
        icon={Dumbbell}
        onPress={() => setShowNewExercise(true)}
      />

      {/* New exercise sheet */}
      <NewExerciseSheet 
        isOpen={showNewExercise}
        onClose={() => setShowNewExercise(false)}
        onSubmit={handleCreateExercise}
      />
    </View>
  );
}