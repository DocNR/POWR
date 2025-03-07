// app/(workout)/complete.tsx
import React, { useEffect } from 'react';
import { View, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react-native';
import { useWorkoutStore } from '@/stores/workoutStore';
import { WorkoutCompletionFlow } from '@/components/workout/WorkoutCompletionFlow';
import { WorkoutCompletionOptions } from '@/types/workout';
import { useColorScheme } from '@/lib/useColorScheme';

/**
 * Workout Completion Screen
 * 
 * This modal screen is presented when a user chooses to complete their workout.
 * It serves as a container for the multi-step completion flow, handling:
 * - Modal presentation and dismissal
 * - Delegating completion logic to the WorkoutCompletionFlow component
 * 
 * The screen acts primarily as a UI wrapper, with the core completion logic
 * handled by the WorkoutStore and the step-by-step flow managed by the
 * WorkoutCompletionFlow component.
 * 
 * Note: Workout timing is already stopped at this point, as the end time
 * was set when the user confirmed finishing in the create screen.
 */
export default function CompleteWorkoutScreen() {
  const { resumeWorkout, activeWorkout } = useWorkoutStore();
  const { isDarkColorScheme } = useColorScheme();
  
  // Check if we have a workout to complete
  if (!activeWorkout) {
    // If there's no active workout, redirect back to the home screen
    router.replace('/(tabs)');
    return null;
  }
  
  // Handle complete with options
  const handleComplete = async (options: WorkoutCompletionOptions) => {
    // Get a fresh reference to completeWorkout
    const { completeWorkout } = useWorkoutStore.getState();
    
    // Complete the workout with the provided options
    await completeWorkout(options);
  };
  
  // Handle cancellation (go back to workout)
  const handleCancel = () => {
    // Go back to the workout screen
    router.back();
  };
  
  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View 
          className={`bg-background ${isDarkColorScheme ? 'bg-card border border-border' : ''} rounded-lg w-[95%] h-[85%] max-w-xl shadow-xl overflow-hidden`}
          style={{ maxHeight: 700 }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-xl font-bold text-foreground">Complete Workout</Text>
            <TouchableOpacity onPress={handleCancel} className="p-1">
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View className="flex-1 p-4">
            <WorkoutCompletionFlow 
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}