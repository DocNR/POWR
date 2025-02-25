// components/workout/ExerciseTracker.tsx
import React, { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, TimerReset, Dumbbell } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/card';
import SetInput from '@/components/workout/SetInput';
import { useWorkoutStore } from '@/stores/workoutStore';
import { generateId } from '@/utils/ids';
import type { WorkoutSet } from '@/types/workout';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';

export default function ExerciseTracker() {
  const router = useRouter();
  const activeWorkout = useWorkoutStore.use.activeWorkout();
  const currentExerciseIndex = useWorkoutStore.use.currentExerciseIndex();
  const { nextExercise, previousExercise, startRest, updateSet } = useWorkoutStore.getState();

  // Handle adding a new set - define callback before any conditional returns
  const handleAddSet = useCallback(() => {
    if (!activeWorkout?.exercises[currentExerciseIndex]) return;

    const currentExercise = activeWorkout.exercises[currentExerciseIndex];
    const lastSet = currentExercise.sets[currentExercise.sets.length - 1];
    const newSet: WorkoutSet = {
      id: generateId('local'),
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      type: 'normal',
      isCompleted: false
    };

    updateSet(currentExerciseIndex, currentExercise.sets.length, newSet);
  }, [activeWorkout, currentExerciseIndex, updateSet]);

  // Empty state check after hooks
  if (!activeWorkout?.exercises || activeWorkout.exercises.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <View className="items-center opacity-60">
          <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center mb-6">
            <Dumbbell size={48} className="text-primary" />
          </View>
          <Text className="text-xl font-semibold mb-2">No exercises added</Text>
          <Text className="text-muted-foreground text-center">
            Tap the + button to add exercises to your workout
          </Text>
        </View>
      </View>
    );
  }

  // Prepare derivative state after hooks
  const currentExercise = activeWorkout.exercises[currentExerciseIndex];
  const hasNextExercise = currentExerciseIndex < activeWorkout.exercises.length - 1;
  const hasPreviousExercise = currentExerciseIndex > 0;

  if (!currentExercise) return null;

  return (
    <View className="flex-1">
      {/* Exercise Navigation */}
      <View className="flex-row items-center justify-between px-4 py-2 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onPress={() => previousExercise()}
          disabled={!hasPreviousExercise}
        >
          <ChevronLeft className="text-foreground" />
        </Button>
        
        <View className="flex-1 px-4">
          <Text className="text-lg font-semibold text-center">
            {currentExercise.title}
          </Text>
          <Text className="text-sm text-muted-foreground text-center">
            {currentExercise.equipment} • {currentExercise.category}
          </Text>
        </View>
        
        <Button
          variant="ghost"
          size="icon"
          onPress={() => nextExercise()}
          disabled={!hasNextExercise}
        >
          <ChevronRight className="text-foreground" />
        </Button>
      </View>

      {/* Sets List */}
      <ScrollView className="flex-1 px-4 py-2">
        <Card>
          <CardContent className="p-0">
            {/* Header Row */}
            <View className={cn(
              "flex-row items-center px-4 py-2 border-b border-border",
              "bg-muted/50"
            )}>
              <Text className="w-8 text-sm font-medium text-muted-foreground">Set</Text>
              <Text className="w-20 text-sm text-center text-muted-foreground">Prev</Text>
              <Text className="flex-1 text-sm text-center text-muted-foreground">kg</Text>
              <Text className="flex-1 text-sm text-center text-muted-foreground">Reps</Text>
              <View className="w-10" />
            </View>

            {/* Sets */}
            {currentExercise.sets.map((set: WorkoutSet, index: number) => (
              <SetInput
                key={set.id}
                exerciseIndex={currentExerciseIndex}
                setIndex={index}
                setNumber={index + 1}
                weight={set.weight}
                reps={set.reps}
                isCompleted={set.isCompleted}
                previousSet={index > 0 ? currentExercise.sets[index - 1] : undefined}
              />
            ))}
          </CardContent>
        </Card>
      </ScrollView>

      {/* Bottom Controls */}
      <View className="flex-row justify-center gap-2 p-4 border-t border-border">
        <Button
          variant="outline"
          className="flex-1"
          onPress={() => startRest(90)}
        >
          <TimerReset className="mr-2 text-foreground" />
          <Text>Rest Timer</Text>
        </Button>

        <Button
          variant="outline"
          className="flex-1"
          onPress={handleAddSet}
        >
          <Plus className="mr-2 text-foreground" />
          <Text>Add Set</Text>
        </Button>
      </View>
    </View>
  );
}