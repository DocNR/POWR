// app/(workout)/create.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { TabScreen } from '@/components/layout/TabScreen';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent, 
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Plus, Pause, Play, MoreHorizontal, CheckCircle2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditableText from '@/components/EditableText';
import { cn } from '@/lib/utils';
import { generateId } from '@/utils/ids';
import { WorkoutSet } from '@/types/workout';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';

export default function CreateWorkoutScreen() {
  const { 
    status,
    activeWorkout,
    elapsedTime,
    restTimer,
    clearAutoSave
  } = useWorkoutStore();

  const { 
    pauseWorkout, 
    resumeWorkout, 
    completeWorkout, 
    updateWorkoutTitle,
    updateSet
  } = useWorkoutStore.getState();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const insets = useSafeAreaInsets();

  // Format time as mm:ss in monospace font
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Timer update effect
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    
    if (status === 'active') {
      timerInterval = setInterval(() => {
        useWorkoutStore.getState().tick(1000);
      }, 1000);
    }
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [status]);

  // Handler for adding a new set to an exercise
  const handleAddSet = (exerciseIndex: number) => {
    if (!activeWorkout) return;
    
    const exercise = activeWorkout.exercises[exerciseIndex];
    const lastSet = exercise.sets[exercise.sets.length - 1];
    
    const newSet: WorkoutSet = {
      id: generateId('local'),
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      type: 'normal',
      isCompleted: false
    };

    updateSet(exerciseIndex, exercise.sets.length, newSet);
  };

  // Handler for completing a set
  const handleCompleteSet = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return;
    
    const exercise = activeWorkout.exercises[exerciseIndex];
    const set = exercise.sets[setIndex];
    
    updateSet(exerciseIndex, setIndex, {
      ...set,
      isCompleted: !set.isCompleted
    });
  };

  // Show empty state when no workout is active
  if (!activeWorkout) {
    return (
      <TabScreen>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-xl font-semibold text-foreground text-center mb-4">
            No active workout
          </Text>
          <Button 
            onPress={() => router.back()}
          >
            <Text className="text-primary-foreground">Go Back</Text>
          </Button>
        </View>
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Swipe indicator */}
        <View className="w-full items-center py-2">
          <View className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </View>
        
        {/* Header with Title and Finish Button */}
        <View className="px-4 py-3 border-b border-border">
          {/* Finish button in top right */}
          <View className="flex-row justify-end mb-2">
            <Button
              variant="purple"
              className="px-4"
              onPress={() => completeWorkout()}
            >
              <Text className="text-white font-medium">Finish</Text>
            </Button>
          </View>
          
          {/* Full-width workout title */}
          <View className="mb-3">
            <EditableText
              value={activeWorkout.title}
              onChangeText={(newTitle) => updateWorkoutTitle(newTitle)}
              placeholder="Workout Title"
              textStyle={{
                fontSize: 24,
                fontWeight: '700',
              }}
            />
          </View>
          
          {/* Timer Display */}
          <View className="flex-row items-center">
            <Text style={styles.timerText} className={cn(
              "text-2xl font-mono",
              status === 'paused' ? "text-muted-foreground" : "text-foreground"
            )}>
              {formatTime(elapsedTime)}
            </Text>
            
            {status === 'active' ? (
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onPress={pauseWorkout}
              >
                <Pause className="text-foreground" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onPress={resumeWorkout}
              >
                <Play className="text-foreground" />
              </Button>
            )}
          </View>
        </View>

        {/* Scrollable Exercises List */}
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ 
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            paddingTop: 16
          }}
        >
          {activeWorkout.exercises.length > 0 ? (
            activeWorkout.exercises.map((exercise, exerciseIndex) => (
              <Card 
                key={exercise.id} 
                className="mb-6 overflow-hidden border border-border bg-card"
              >
                {/* Exercise Header */}
                <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
                  <Text className="text-lg font-semibold text-purple">
                    {exercise.title}
                  </Text>
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => {
                      // Open exercise options menu
                      console.log('Open exercise options');
                    }}
                  >
                    <MoreHorizontal className="text-muted-foreground" size={20} />
                  </Button>
                </View>
                
                {/* Sets Info */}
                <View className="px-4 py-2">
                  <Text className="text-sm text-muted-foreground">
                    {exercise.sets.filter(s => s.isCompleted).length} sets completed
                  </Text>
                </View>
                
                {/* Set Headers */}
                <View className="flex-row px-4 py-2 border-t border-border bg-muted/30">
                  <Text className="w-16 text-sm font-medium text-muted-foreground">SET</Text>
                  <Text className="w-20 text-sm font-medium text-muted-foreground">PREV</Text>
                  <Text className="flex-1 text-sm font-medium text-center text-muted-foreground">KG</Text>
                  <Text className="flex-1 text-sm font-medium text-center text-muted-foreground">REPS</Text>
                  <View style={{ width: 44 }} />
                </View>
                
                {/* Exercise Sets */}
                <CardContent className="p-0">
                  {exercise.sets.map((set, setIndex) => {
                    const previousSet = setIndex > 0 ? exercise.sets[setIndex - 1] : null;
                    return (
                      <View 
                        key={set.id}
                        className={cn(
                          "flex-row items-center px-4 py-3 border-t border-border",
                          set.isCompleted && "bg-primary/5"
                        )}
                      >
                        {/* Set Number */}
                        <Text className="w-16 text-base font-medium text-foreground">
                          {setIndex + 1}
                        </Text>
                        
                        {/* Previous Set */}
                        <Text className="w-20 text-sm text-muted-foreground">
                          {previousSet ? `${previousSet.weight}×${previousSet.reps}` : '—'}
                        </Text>
                        
                        {/* Weight Input */}
                        <View className="flex-1 px-2">
                          <View className={cn(
                            "bg-secondary h-10 rounded-md px-3 justify-center",
                            set.isCompleted && "bg-primary/10"
                          )}>
                            <Text className="text-center text-foreground">
                              {set.weight}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Reps Input */}
                        <View className="flex-1 px-2">
                          <View className={cn(
                            "bg-secondary h-10 rounded-md px-3 justify-center",
                            set.isCompleted && "bg-primary/10"
                          )}>
                            <Text className="text-center text-foreground">
                              {set.reps}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Complete Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-11 h-11"
                          onPress={() => handleCompleteSet(exerciseIndex, setIndex)}
                        >
                          <CheckCircle2 
                            className={set.isCompleted ? "text-purple" : "text-muted-foreground"} 
                            fill={set.isCompleted ? "currentColor" : "none"}
                            size={22} 
                          />
                        </Button>
                      </View>
                    );
                  })}
                </CardContent>
                
                {/* Add Set Button */}
                <Button
                  variant="ghost"
                  className="flex-row justify-center items-center py-3 border-t border-border"
                  onPress={() => handleAddSet(exerciseIndex)}
                >
                  <Plus size={18} className="text-foreground mr-2" />
                  <Text className="text-foreground">Add Set</Text>
                </Button>
              </Card>
            ))
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-lg text-muted-foreground text-center">
                No exercises added. Add exercises to start your workout.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Add Exercise FAB */}
        <View style={{ 
          position: 'absolute', 
          right: 16, 
          bottom: insets.bottom + 16
        }}>
          <FloatingActionButton 
            icon={Plus}
            onPress={() => router.push('/(workout)/add-exercises')}
          />
        </View>

        {/* Cancel Workout Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Workout</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this workout? All progress will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <View className="flex-row justify-end gap-3">
              <AlertDialogAction 
                onPress={() => setShowCancelDialog(false)}
              >
                <Text>Continue Workout</Text>
              </AlertDialogAction>
              <AlertDialogAction 
                onPress={async () => {
                  await clearAutoSave();
                  router.back();
                }}
              >
                <Text>Cancel Workout</Text>
              </AlertDialogAction>
            </View>
          </AlertDialogContent>
        </AlertDialog>
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  timerText: {
    fontVariant: ['tabular-nums']
  }
});