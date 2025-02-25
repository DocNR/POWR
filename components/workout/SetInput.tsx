// components/workout/SetInput.tsx
import React, { useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { useWorkoutStore } from '@/stores/workoutStore';
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
  }, [exerciseIndex, setIndex]);

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

  return (
    <View className={cn(
      "flex-row items-center px-4 py-2 border-b border-border",
      isCompleted && "bg-primary/5"
    )}>
      {/* Set Number */}
      <Text className="w-8 text-sm font-medium text-muted-foreground">
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
            "h-10 px-3 rounded-md text-center text-foreground",
            "bg-secondary border border-border",
            isCompleted && "bg-primary/10 border-primary/20"
          )}
          value={weightValue === '0' ? '' : weightValue}
          onChangeText={handleWeightChange}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="text-muted-foreground"
          returnKeyType="next"
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
            "h-10 px-3 rounded-md text-center text-foreground",
            "bg-secondary border border-border",
            isCompleted && "bg-primary/10 border-primary/20"
          )}
          value={repsValue === '0' ? '' : repsValue}
          onChangeText={handleRepsChange}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="text-muted-foreground"
          returnKeyType="done"
          selectTextOnFocus
        />
      </TouchableOpacity>

      {/* Complete Button */}
      <Button
        variant={isCompleted ? "secondary" : "ghost"}
        size="icon"
        className="w-10 h-10"
        onPress={handleCompleteSet}
      >
        <Check 
          className={cn(
            "w-4 h-4",
            isCompleted ? "text-primary" : "text-muted-foreground"
          )} 
        />
      </Button>
    </View>
  );
}