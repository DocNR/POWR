// app/(tabs)/library/exercises.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, SectionList } from 'react-native';
import { Text } from '@/components/ui/text';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';
import { Dumbbell } from 'lucide-react-native';
import { Exercise, BaseExercise } from '@/types/exercise';
import { useSQLiteContext } from 'expo-sqlite';
import { ExerciseService } from '@/lib/db/services/ExerciseService';

export default function ExercisesScreen() {
  const db = useSQLiteContext();
  const exerciseService = React.useMemo(() => new ExerciseService(db), [db]);
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showNewExercise, setShowNewExercise] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const loadedExercises = await exerciseService.getAllExercises();
      setExercises(loadedExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const handleAddExercise = async (exerciseData: BaseExercise) => {
    try {
      await exerciseService.createExercise({
        ...exerciseData,
        created_at: Date.now(),
        source: 'local'
      });
      await loadExercises();
      setShowNewExercise(false);
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await exerciseService.deleteExercise(id);
      await loadExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const handleExercisePress = (exerciseId: string) => {
    console.log('Selected exercise:', exerciseId);
  };

  const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <View className="flex-1 bg-background">
      <View className="absolute right-0 top-0 bottom-0 w-6 z-10 justify-center bg-transparent">
        {alphabet.map((letter) => (
          <Text 
            key={letter}
            className="text-xs text-muted-foreground text-center"
            onPress={() => {
              // TODO: Implement scroll to section
              console.log('Scroll to:', letter);
            }}
          >
            {letter}
          </Text>
        ))}
      </View>

      <ScrollView className="flex-1 mr-6">
        <View className="py-4">
          <Text className="text-lg font-semibold mb-4 px-4">All Exercises</Text>
          <View className="gap-3">
            {exercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                {...exercise}
                onPress={() => handleExercisePress(exercise.id)}
                onDelete={() => handleDelete(exercise.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <FloatingActionButton
        icon={Dumbbell}
        onPress={() => setShowNewExercise(true)}
      />

      <NewExerciseSheet 
        isOpen={showNewExercise}
        onClose={() => setShowNewExercise(false)}
        onSubmit={handleAddExercise}
      />
    </View>
  );
}