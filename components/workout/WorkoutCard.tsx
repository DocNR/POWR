// components/workout/WorkoutCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Workout } from '@/types/workout';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

interface WorkoutCardProps {
  workout: Workout;
  showDate?: boolean;
  showExercises?: boolean;
}

// Calculate duration in hours and minutes
const formatDuration = (startTime: number, endTime: number) => {
  const durationMs = endTime - startTime;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export const WorkoutCard: React.FC<WorkoutCardProps> = ({ 
  workout, 
  showDate = true,
  showExercises = true
}) => {
  const router = useRouter();
  
  const handlePress = () => {
    // Navigate to workout details
    console.log(`Navigate to workout ${workout.id}`);
    // Implement navigation when endpoint is available
    // router.push(`/workout/${workout.id}`);
  };
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-foreground text-lg font-semibold">{workout.title}</Text>
          <TouchableOpacity onPress={handlePress}>
            <ChevronRight className="text-muted-foreground" size={20} />
          </TouchableOpacity>
        </View>
        
        {showDate && (
          <Text className="text-muted-foreground mb-2">
            {format(workout.startTime, 'EEEE, MMM d')}
          </Text>
        )}
        
        <View className="flex-row items-center mt-2">
          <View className="flex-row items-center mr-4">
            <View className="w-6 h-6 items-center justify-center mr-1">
              <Text className="text-muted-foreground">⏱️</Text>
            </View>
            <Text className="text-muted-foreground">
              {formatDuration(workout.startTime, workout.endTime || Date.now())}
            </Text>
          </View>
          
          <View className="flex-row items-center mr-4">
            <View className="w-6 h-6 items-center justify-center mr-1">
              <Text className="text-muted-foreground">⚖️</Text>
            </View>
            <Text className="text-muted-foreground">
              {workout.totalVolume ? `${workout.totalVolume} lb` : '0 lb'}
            </Text>
          </View>
          
          {workout.totalReps && (
            <View className="flex-row items-center">
              <View className="w-6 h-6 items-center justify-center mr-1">
                <Text className="text-muted-foreground">🔄</Text>
              </View>
              <Text className="text-muted-foreground">
                {workout.totalReps} reps
              </Text>
            </View>
          )}
        </View>
        
        {/* Show exercises if requested */}
        {showExercises && (
          <View className="mt-4">
            <Text className="text-foreground font-semibold mb-1">Exercise</Text>
            {/* In a real implementation, you would map through actual exercises */}
            {workout.exercises && workout.exercises.length > 0 ? (
              workout.exercises.slice(0, 3).map((exercise, idx) => (
                <Text key={idx} className="text-foreground mb-1">
                  {exercise.title}
                </Text>
              ))
            ) : (
              <Text className="text-muted-foreground">No exercises recorded</Text>
            )}
            
            {workout.exercises && workout.exercises.length > 3 && (
              <Text className="text-muted-foreground">
                +{workout.exercises.length - 3} more exercises
              </Text>
            )}
          </View>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkoutCard;