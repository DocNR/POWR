// components/workout/WorkoutDetailView.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Workout, WorkoutExercise, WorkoutSet } from '@/types/workout';
import { CloudIcon, SmartphoneIcon, CloudOffIcon, Share2Icon, DownloadIcon } from 'lucide-react-native';
import { formatDuration } from '@/utils/formatTime';

interface WorkoutDetailViewProps {
  workout: Workout;
  onPublish?: () => void;
  onImport?: () => void;
  onExport?: (format: 'csv' | 'json') => void;
}

export const WorkoutDetailView: React.FC<WorkoutDetailViewProps> = ({
  workout,
  onPublish,
  onImport,
  onExport
}) => {
  // Determine source
  const workoutSource = 
    (workout.availability?.source?.includes('nostr') && workout.availability?.source?.includes('local') 
      ? 'both' 
      : workout.availability?.source?.includes('nostr') 
        ? 'nostr' 
        : 'local');
  
  // Determine publish status
  const isPublished = Boolean(workout.availability?.nostrEventId);
  const relayCount = workout.availability?.nostrRelayCount || 0;
  const lastPublished = workout.availability?.nostrPublishedAt;
  
  // Format workout duration
  const duration = workout.endTime && workout.startTime 
    ? formatDuration(workout.endTime - workout.startTime)
    : 'N/A';
  
  // Render a set
  const renderSet = (set: WorkoutSet, index: number) => (
    <View key={set.id} className="flex-row items-center py-2 border-b border-border">
      <View className="w-10">
        <Text className="text-foreground font-medium">{index + 1}</Text>
      </View>
      <View className="flex-1 flex-row">
        {set.weight && (
          <Text className="text-foreground mr-4">{set.weight} lb</Text>
        )}
        {set.reps && (
          <Text className="text-foreground mr-4">{set.reps} reps</Text>
        )}
        {set.rpe && (
          <Text className="text-foreground">RPE {set.rpe}</Text>
        )}
      </View>
      <View>
        <Text className={`${set.isCompleted ? 'text-green-500' : 'text-muted-foreground'}`}>
          {set.isCompleted ? 'Completed' : 'Skipped'}
        </Text>
      </View>
    </View>
  );
  
  // Render an exercise with its sets
  const renderExercise = (exercise: WorkoutExercise, index: number) => (
    <Card key={exercise.id} className="mb-4">
      <CardContent className="p-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-foreground text-lg font-semibold">
            {index + 1}. {exercise.title}
          </Text>
          <View className="bg-muted px-2 py-1 rounded">
            <Text className="text-xs text-muted-foreground">
              {exercise.sets.length} sets
            </Text>
          </View>
        </View>
        
        {exercise.notes && (
          <View className="mb-4 bg-muted/50 p-2 rounded">
            <Text className="text-muted-foreground text-sm">{exercise.notes}</Text>
          </View>
        )}
        
        <View className="mt-2">
          {/* Set header */}
          <View className="flex-row items-center py-2 border-b border-border">
            <View className="w-10">
              <Text className="text-muted-foreground font-medium">Set</Text>
            </View>
            <View className="flex-1">
              <Text className="text-muted-foreground">Weight/Reps</Text>
            </View>
            <View>
              <Text className="text-muted-foreground">Status</Text>
            </View>
          </View>
          
          {/* Sets */}
          {exercise.sets.map((set, idx) => renderSet(set, idx))}
        </View>
      </CardContent>
    </Card>
  );
  
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-foreground text-2xl font-bold">{workout.title}</Text>
            
            {/* Source indicator */}
            <View className="flex-row items-center bg-muted px-3 py-1 rounded">
              {workoutSource === 'local' && (
                <>
                  <SmartphoneIcon size={16} className="text-muted-foreground mr-1" />
                  <Text className="text-muted-foreground text-sm">Local</Text>
                </>
              )}
              {workoutSource === 'nostr' && (
                <>
                  <CloudIcon size={16} className="text-primary mr-1" />
                  <Text className="text-primary text-sm">Nostr</Text>
                </>
              )}
              {workoutSource === 'both' && (
                <>
                  <SmartphoneIcon size={16} className="text-muted-foreground mr-1" />
                  <CloudIcon size={16} className="text-primary ml-1 mr-1" />
                  <Text className="text-muted-foreground text-sm">Both</Text>
                </>
              )}
            </View>
          </View>
          
          <Text className="text-muted-foreground mb-4">
            {format(workout.startTime, 'EEEE, MMMM d, yyyy')} at {format(workout.startTime, 'h:mm a')}
          </Text>
          
          {/* Publish status */}
          {workoutSource !== 'nostr' && (
            <View className="flex-row items-center mb-4">
              {isPublished ? (
                <View className="flex-row items-center">
                  <CloudIcon size={16} className="text-primary mr-2" />
                  <Text className="text-muted-foreground">
                    Published to {relayCount} relays
                    {lastPublished && 
                      ` on ${format(lastPublished, 'MMM d, yyyy')}`}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <CloudOffIcon size={16} className="text-muted-foreground mr-2" />
                  <Text className="text-muted-foreground">Local only</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Action buttons */}
          <View className="flex-row flex-wrap">
            {/* Publish button for local workouts */}
            {workoutSource !== 'nostr' && !isPublished && onPublish && (
              <TouchableOpacity 
                onPress={onPublish}
                className="mr-2 mb-2 flex-row items-center bg-primary px-3 py-2 rounded"
              >
                <Share2Icon size={16} className="text-primary-foreground mr-1" />
                <Text className="text-primary-foreground">Publish to Nostr</Text>
              </TouchableOpacity>
            )}
            
            {/* Republish button for already published workouts */}
            {workoutSource !== 'nostr' && isPublished && onPublish && (
              <TouchableOpacity 
                onPress={onPublish}
                className="mr-2 mb-2 flex-row items-center bg-primary/10 px-3 py-2 rounded"
              >
                <Share2Icon size={16} className="text-primary mr-1" />
                <Text className="text-primary">Republish</Text>
              </TouchableOpacity>
            )}
            
            {/* Import button for Nostr-only workouts */}
            {workoutSource === 'nostr' && onImport && (
              <TouchableOpacity 
                onPress={onImport}
                className="mr-2 mb-2 flex-row items-center bg-primary px-3 py-2 rounded"
              >
                <DownloadIcon size={16} className="text-primary-foreground mr-1" />
                <Text className="text-primary-foreground">Import to local</Text>
              </TouchableOpacity>
            )}
            
            {/* Export buttons */}
            {onExport && (
              <View className="flex-row">
                <TouchableOpacity 
                  onPress={() => onExport('json')}
                  className="mr-2 mb-2 flex-row items-center bg-muted px-3 py-2 rounded"
                >
                  <Text className="text-muted-foreground">Export JSON</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => onExport('csv')}
                  className="mr-2 mb-2 flex-row items-center bg-muted px-3 py-2 rounded"
                >
                  <Text className="text-muted-foreground">Export CSV</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        
        {/* Workout stats */}
        <View className="flex-row flex-wrap mb-6">
          <View className="bg-muted p-3 rounded mr-2 mb-2">
            <Text className="text-muted-foreground text-xs mb-1">Duration</Text>
            <Text className="text-foreground font-semibold">{duration}</Text>
          </View>
          
          <View className="bg-muted p-3 rounded mr-2 mb-2">
            <Text className="text-muted-foreground text-xs mb-1">Total Volume</Text>
            <Text className="text-foreground font-semibold">
              {workout.totalVolume ? `${workout.totalVolume} lb` : 'N/A'}
            </Text>
          </View>
          
          <View className="bg-muted p-3 rounded mr-2 mb-2">
            <Text className="text-muted-foreground text-xs mb-1">Total Reps</Text>
            <Text className="text-foreground font-semibold">
              {workout.totalReps || 'N/A'}
            </Text>
          </View>
          
          <View className="bg-muted p-3 rounded mb-2">
            <Text className="text-muted-foreground text-xs mb-1">Exercises</Text>
            <Text className="text-foreground font-semibold">
              {workout.exercises?.length || 0}
            </Text>
          </View>
        </View>
        
        {/* Notes */}
        {workout.notes && (
          <View className="mb-6">
            <Text className="text-foreground text-lg font-semibold mb-2">Notes</Text>
            <Card>
              <CardContent className="p-4">
                <Text className="text-foreground">{workout.notes}</Text>
              </CardContent>
            </Card>
          </View>
        )}
        
        {/* Exercises */}
        <View className="mb-6">
          <Text className="text-foreground text-lg font-semibold mb-2">Exercises</Text>
          {workout.exercises && workout.exercises.length > 0 ? (
            workout.exercises.map((exercise, idx) => renderExercise(exercise, idx))
          ) : (
            <Card>
              <CardContent className="p-4">
                <Text className="text-muted-foreground">No exercises recorded</Text>
              </CardContent>
            </Card>
          )}
        </View>
        
        {/* Add bottom padding for better scrolling experience */}
        <View className="h-20" />
      </View>
    </ScrollView>
  );
};

export default WorkoutDetailView;
