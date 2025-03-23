// components/workout/WorkoutCard.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { ChevronRight, CloudIcon, SmartphoneIcon, CloudOffIcon } from 'lucide-react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Workout } from '@/types/workout';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { cn } from '@/lib/utils';

export interface EnhancedWorkoutCardProps {
  workout: Workout;
  showDate?: boolean;
  showExercises?: boolean;
  source?: 'local' | 'nostr' | 'both';
  publishStatus?: {
    isPublished: boolean;
    relayCount?: number;
    lastPublished?: number;
  };
  onShare?: () => void;
  onImport?: () => void;
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

export const WorkoutCard: React.FC<EnhancedWorkoutCardProps> = ({ 
  workout, 
  showDate = true,
  showExercises = true,
  source,
  publishStatus,
  onShare,
  onImport
}) => {
  const router = useRouter();
  
  const handlePress = () => {
    // Navigate to workout details
    console.log(`Navigate to workout ${workout.id}`);
    router.push(`/workout/${workout.id}`);
  };
  
  // Determine source if not explicitly provided
  const workoutSource = source || 
    (workout.availability?.source?.includes('nostr') && workout.availability?.source?.includes('local') 
      ? 'both' 
      : workout.availability?.source?.includes('nostr') 
        ? 'nostr' 
        : 'local');
  
  // Determine publish status if not explicitly provided
  const workoutPublishStatus = publishStatus || {
    isPublished: Boolean(workout.availability?.nostrEventId),
    relayCount: workout.availability?.nostrRelayCount,
    lastPublished: workout.availability?.nostrPublishedAt
  };

  // Debug: Log exercises
  console.log(`WorkoutCard for ${workout.id} has ${workout.exercises?.length || 0} exercises`);
  if (workout.exercises && workout.exercises.length > 0) {
    console.log(`First exercise: ${workout.exercises[0].title}`);
  }
  
  // Define colors for icons
  const primaryColor = "#8b5cf6"; // Purple color
  const mutedColor = "#9ca3af"; // Gray color
  
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} testID={`workout-card-${workout.id}`}>
      <Card 
        className={cn(
          "mb-4",
          workoutSource === 'nostr' && "border-primary border-2",
          workoutSource === 'both' && "border-primary border"
        )}
      >
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <Text 
                className={cn(
                  "text-lg font-semibold",
                  workoutSource === 'nostr' || workoutSource === 'both' 
                    ? "text-primary" 
                    : "text-foreground"
                )}
              >
                {workout.title}
              </Text>
              
              {/* Source indicator */}
              <View className="ml-2">
                {workoutSource === 'local' && (
                  <SmartphoneIcon size={16} color={mutedColor} />
                )}
                {workoutSource === 'nostr' && (
                  <CloudIcon size={16} color={primaryColor} />
                )}
                {workoutSource === 'both' && (
                  <View className="flex-row">
                    <SmartphoneIcon size={16} color={mutedColor} />
                    <View style={{ width: 4 }} />
                    <CloudIcon size={16} color={primaryColor} />
                  </View>
                )}
              </View>
            </View>
            
            <ChevronRight size={20} color={mutedColor} />
          </View>
        
        {showDate && (
          <Text className="text-muted-foreground mb-2">
            {format(workout.startTime, 'EEEE, MMM d')}
          </Text>
        )}
        
        {/* Publish status indicator */}
        {workoutSource !== 'nostr' && (
          <View className="flex-row items-center mb-2">
            {workoutPublishStatus.isPublished ? (
              <View className="flex-row items-center">
                <CloudIcon size={14} color={primaryColor} style={{ marginRight: 4 }} />
                <Text className="text-xs text-muted-foreground">
                  Published to {workoutPublishStatus.relayCount || 0} relays
                  {workoutPublishStatus.lastPublished && 
                    ` on ${format(workoutPublishStatus.lastPublished, 'MMM d')}`}
                </Text>
                
                {onShare && (
                  <TouchableOpacity 
                    onPress={onShare}
                    className="ml-2 px-2 py-1 bg-primary/10 rounded"
                  >
                    <Text className="text-xs text-primary">Republish</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="flex-row items-center">
                <CloudOffIcon size={14} color={mutedColor} style={{ marginRight: 4 }} />
                <Text className="text-xs text-muted-foreground">Local only</Text>
                
                {onShare && (
                  <TouchableOpacity 
                    onPress={onShare}
                    className="ml-2 px-2 py-1 bg-primary/10 rounded"
                  >
                    <Text className="text-xs text-primary">Publish</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        
        {/* Import button for Nostr-only workouts */}
        {workoutSource === 'nostr' && onImport && (
          <View className="mb-2">
            <TouchableOpacity 
              onPress={onImport}
              className="px-2 py-1 bg-primary/10 rounded self-start"
            >
              <Text className="text-xs text-primary">Import to local</Text>
            </TouchableOpacity>
          </View>
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
    </TouchableOpacity>
  );
};

export default WorkoutCard;
