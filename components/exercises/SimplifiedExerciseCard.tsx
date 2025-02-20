// components/exercises/SimplifiedExerciseCard.tsx
import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { ExerciseDisplay } from '@/types/exercise';

interface SimplifiedExerciseCardProps {
  exercise: ExerciseDisplay;
  onPress: () => void;
}

export function SimplifiedExerciseCard({ exercise, onPress }: SimplifiedExerciseCardProps) {
  const { 
    title, 
    category, 
    equipment, 
    type,
    source,
  } = exercise;
  
  const firstLetter = title.charAt(0).toUpperCase();
  
  // Helper to check if exercise has workout-specific properties
  const isWorkoutExercise = 'sets' in exercise && Array.isArray((exercise as any).sets);
  
  // Access sets safely if available
  const workoutExercise = isWorkoutExercise ? 
    (exercise as ExerciseDisplay & { sets: Array<{weight?: number, reps?: number}> }) :
    null;
  
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row items-center py-3 border-b border-border"
    >
      {/* Image placeholder or first letter */}
      <View className="w-12 h-12 rounded-full bg-card flex items-center justify-center mr-3 overflow-hidden">
        <Text className="text-2xl font-bold text-foreground">
          {firstLetter}
        </Text>
      </View>
      
      <View className="flex-1">
        {/* Title */}
        <Text className="text-base font-semibold text-foreground mb-1">
          {title}
        </Text>
        
        {/* Tags row */}
        <View className="flex-row flex-wrap gap-1">
          {/* Category Badge */}
          <Badge variant="outline" className="rounded-full py-0.5">
            <Text className="text-xs">{category}</Text>
          </Badge>
          
          {/* Equipment Badge (if available) */}
          {equipment && (
            <Badge variant="outline" className="rounded-full py-0.5">
              <Text className="text-xs">{equipment}</Text>
            </Badge>
          )}
          
          {/* Type Badge */}
          {type && (
            <Badge variant="outline" className="rounded-full py-0.5">
              <Text className="text-xs">{type}</Text>
            </Badge>
          )}
          
          {/* Source Badge - colored for 'powr' */}
          {source && (
            <Badge 
              variant={source === 'powr' ? 'default' : 'secondary'} 
              className={`rounded-full py-0.5 ${
                source === 'powr' ? 'bg-violet-500' : ''
              }`}
            >
              <Text className={`text-xs ${
                source === 'powr' ? 'text-white' : ''
              }`}>
                {source}
              </Text>
            </Badge>
          )}
        </View>
      </View>
      
      {/* Weight/Reps information if available from sets */}
      {workoutExercise?.sets?.[0] && (
        <View className="items-end">
          <Text className="text-muted-foreground text-sm">
            {workoutExercise.sets[0].weight && `${workoutExercise.sets[0].weight} lb`}
            {workoutExercise.sets[0].weight && workoutExercise.sets[0].reps && ' '}
            {workoutExercise.sets[0].reps && `(×${workoutExercise.sets[0].reps})`}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}