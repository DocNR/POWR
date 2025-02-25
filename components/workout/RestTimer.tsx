// components/workout/RestTimer.tsx
import React, { useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Plus, Square } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore } from '@/stores/workoutStore';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const HAPTIC_THRESHOLDS = [30, 10, 5]; // Seconds remaining for haptic feedback

export default function RestTimer() {
  // Use selectors for reactive state
  const restTimer = useWorkoutStore.use.restTimer();
  const activeWorkout = useWorkoutStore.use.activeWorkout();
  const currentExerciseIndex = useWorkoutStore.use.currentExerciseIndex();
  
  // Get actions from store
  const { stopRest, startRest, tick } = useWorkoutStore.getState();

  const handleAddTime = useCallback(() => {
    if (!restTimer.isActive) return;
    startRest(restTimer.duration + 30); // Add 30 seconds
  }, [restTimer.isActive, restTimer.duration]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (restTimer.isActive && restTimer.remaining > 0) {
      interval = setInterval(() => {
        // Update the remaining time every second
        tick(1);

        // Haptic feedback at thresholds
        if (HAPTIC_THRESHOLDS.includes(restTimer.remaining)) {
          Haptics.notificationAsync(
            restTimer.remaining <= 5 
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Success
          );
        }

        // Auto-stop timer when it reaches 0
        if (restTimer.remaining <= 0) {
          stopRest();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [restTimer.isActive, restTimer.remaining]);

  // Get the next exercise if any
  const nextExercise = activeWorkout && currentExerciseIndex < activeWorkout.exercises.length - 1
    ? activeWorkout.exercises[currentExerciseIndex + 1]
    : null;

  return (
    <View className="flex-1 items-center justify-center bg-background/80">
      {/* Timer Display */}
      <View className="items-center mb-8">
        <Text className="text-4xl font-bold text-foreground mb-2">
          Rest Timer
        </Text>
        <Text className="text-6xl font-bold text-primary">
          {formatTime(restTimer.remaining)}
        </Text>
      </View>

      {/* Controls */}
      <View className="flex-row gap-4">
        <Button
          size="lg"
          variant="outline"
          onPress={stopRest}
        >
          <Square className="mr-2 text-foreground" />
          <Text>Skip</Text>
        </Button>

        <Button
          size="lg"
          variant="outline"
          onPress={handleAddTime}
        >
          <Plus className="mr-2 text-foreground" />
          <Text>Add 30s</Text>
        </Button>
      </View>

      {/* Next Exercise Preview */}
      {nextExercise && (
        <View className="mt-8 items-center">
          <Text className="text-sm text-muted-foreground mb-1">
            Next Exercise
          </Text>
          <Text className="text-lg font-semibold text-foreground">
            {nextExercise.title}
          </Text>
        </View>
      )}
    </View>
  );
}