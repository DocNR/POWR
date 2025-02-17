// app/(tabs)/library/exercises.tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';
import { Dumbbell } from 'lucide-react-native';
import { Exercise } from '@/types/library';
import { generateId } from '@/utils/ids';
import DatabaseDebug from '@/components/DatabaseDebug';  // Add this import

const initialExercises: Exercise[] = [
  {
    id: '1',
    title: 'Barbell Back Squat',
    category: 'Legs',
    equipment: 'barbell',
    tags: ['compound', 'strength'],
    source: 'local',
    description: 'A compound exercise that primarily targets the quadriceps, hamstrings, and glutes.',
  },
  {
    id: '2',
    title: 'Pull-ups',
    category: 'Pull',
    equipment: 'bodyweight',
    tags: ['upper-body', 'compound'],
    source: 'local',
    description: 'An upper body pulling exercise that targets the latissimus dorsi and biceps.',
  },
  {
    id: '3',
    title: 'Bench Press',
    category: 'Push',
    equipment: 'barbell',
    tags: ['push', 'strength'],
    source: 'nostr',
    description: 'A compound pushing exercise that targets the chest, shoulders, and triceps.',
  },
];

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [showNewExercise, setShowNewExercise] = useState(false);

  const handleAddExercise = (exerciseData: Omit<Exercise, 'id' | 'source'>) => {
    const newExercise: Exercise = {
      ...exerciseData,
      id: generateId(),
      source: 'local',
    };
    setExercises(prev => [...prev, newExercise]);
    setShowNewExercise(false);
  };

  // Get recent exercises
  const recentExercises = exercises.slice(0, 2);

  const handleDelete = (id: string) => {
    setExercises(current => current.filter(ex => ex.id !== id));
  };

  const handleExercisePress = (exerciseId: string) => {
    console.log('Selected exercise:', exerciseId);
  };

  return (
    <View className="flex-1 bg-background">
      {__DEV__ && <DatabaseDebug />}  {/* Only show in development */}
      <ScrollView className="flex-1">
        {/* Recent Exercises Section */}
        <View className="py-4">
          <Text className="text-lg font-semibold mb-4 px-4">Recent Exercises</Text>
          <View className="gap-3">
            {recentExercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                {...exercise}
                onPress={() => handleExercisePress(exercise.id)}
                onDelete={() => handleDelete(exercise.id)}
              />
            ))}
          </View>
        </View>

        {/* All Exercises Section */}
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