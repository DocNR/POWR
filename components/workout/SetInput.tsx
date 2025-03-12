// components/workout/SetInput.tsx
import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Circle, CheckCircle } from 'lucide-react-native'; // Lucide React icons
import { cn } from '@/lib/utils';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import type { WorkoutSet } from '@/types/workout';
import debounce from 'lodash/debounce';

interface SetInputProps {
  exerciseIndex: number;
  setIndex: number;
  setNumber: number;
  weight?: number;
  reps?: number;
  isCompleted?: boolean;
  previousSet?: WorkoutSet;
}

export default function SetInput({
  exerciseIndex,
  setIndex,
  setNumber,
  weight = 0,
  reps = 0,
  isCompleted = false,
  previousSet
}: SetInputProps) {
  // Get theme colors
  const { isDarkColorScheme } = useColorScheme();
  
  // Local state for controlled inputs
  const [weightValue, setWeightValue] = useState(weight.toString());
  const [repsValue, setRepsValue] = useState(reps.toString());

  // Get actions from store
  const { updateSet, completeSet } = useWorkoutStore.getState();

  // Debounced update functions to prevent too many state updates
  const debouncedUpdateWeight = useCallback(
    debounce((value: number) => {
      updateSet(exerciseIndex, setIndex, { weight: value });
    }, 500),
    [exerciseIndex, setIndex]
  );

  const debouncedUpdateReps = useCallback(
    debounce((value: number) => {
      updateSet(exerciseIndex, setIndex, { reps: value });
    }, 500),
    [exerciseIndex, setIndex]
  );

  const handleWeightChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWeightValue(value);
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        debouncedUpdateWeight(numValue);
      }
    }
  };

  const handleRepsChange = (value: string) => {
    if (value === '' || /^\d*$/.test(value)) {
      setRepsValue(value);
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        debouncedUpdateReps(numValue);
      }
    }
  };

  const handleCompleteSet = useCallback(() => {
    completeSet(exerciseIndex, setIndex);
  }, [exerciseIndex, setIndex, completeSet]);

  const handleCopyPreviousWeight = useCallback(() => {
    if (previousSet?.weight) {
      handleWeightChange(previousSet.weight.toString());
    }
  }, [previousSet]);

  const handleCopyPreviousReps = useCallback(() => {
    if (previousSet?.reps) {
      handleRepsChange(previousSet.reps.toString());
    }
  }, [previousSet]);

  // Get the appropriate colors based on theme variables
  const purpleColor = 'hsl(261, 90%, 66%)'; // --purple from your constants
  const mutedForegroundColor = isDarkColorScheme 
    ? 'hsl(240, 5%, 64.9%)' // --muted-foreground dark
    : 'hsl(240, 3.8%, 46.1%)'; // --muted-foreground light

  return (
    <View className={cn(
      "flex-row items-center px-4 py-1 border-b border-border",
      isCompleted && "bg-primary/5"
    )}>
      {/* Set Number */}
      <Text className="w-8 text-sm font-medium text-muted-foreground text-center">
        {setNumber}
      </Text>

      {/* Previous Set */}
      <Text className="w-20 text-sm text-center text-muted-foreground">
        {previousSet ? `${previousSet.weight}×${previousSet.reps}` : '—'}
      </Text>

      {/* Weight Input */}
      <TouchableOpacity 
        className="flex-1 mx-1" 
        activeOpacity={0.7}
        onLongPress={handleCopyPreviousWeight}
      >
        <TextInput
          className={cn(
            "h-8 px-3 rounded-md text-center text-foreground",
            "bg-secondary border border-border",
            isCompleted && "bg-primary/10 border-primary/20"
          )}
          value={weightValue === '0' ? '' : weightValue}
          onChangeText={handleWeightChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={mutedForegroundColor}
          selectTextOnFocus
        />
      </TouchableOpacity>

      {/* Reps Input */}
      <TouchableOpacity 
        className="flex-1 mx-1"
        activeOpacity={0.7}
        onLongPress={handleCopyPreviousReps}
      >
        <TextInput
          className={cn(
            "h-8 px-3 rounded-md text-center text-foreground",
            "bg-secondary border border-border",
            isCompleted && "bg-primary/10 border-primary/20"
          )}
          value={repsValue === '0' ? '' : repsValue}
          onChangeText={handleRepsChange}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={mutedForegroundColor}
          selectTextOnFocus
        />
      </TouchableOpacity>

      {/* Complete Button using Lucide React icons - without fill */}
      <TouchableOpacity 
        className="w-10 h-10 items-center justify-center"
        onPress={handleCompleteSet}
      >
        {isCompleted ? (
          <CheckCircle 
            size={24} 
            color={purpleColor}
            // Removed fill and fillOpacity properties
          />
        ) : (
          <Circle 
            size={24} 
            color={mutedForegroundColor}
          />
        )}
      </TouchableOpacity>
    </View>
  );
}