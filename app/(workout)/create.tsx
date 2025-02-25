// app/(workout)/create.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TextInput } from 'react-native';
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
  AlertDialogTitle,
  AlertDialogCancel 
} from '@/components/ui/alert-dialog';
import { useWorkoutStore } from '@/stores/workoutStore';
import { ArrowLeft, Plus, Pause, Play, MoreHorizontal, CheckCircle2, Dumbbell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditableText from '@/components/EditableText';
import { cn } from '@/lib/utils';
import { generateId } from '@/utils/ids';
import { WorkoutSet } from '@/types/workout';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { formatTime } from '@/utils/formatTime';

export default function CreateWorkoutScreen() {
  const { 
    status,
    activeWorkout,
    elapsedTime,
    restTimer,
    clearAutoSave,
    isMinimized
  } = useWorkoutStore();

  const { 
    pauseWorkout, 
    resumeWorkout, 
    completeWorkout, 
    updateWorkoutTitle,
    updateSet,
    cancelWorkout,
    minimizeWorkout,
    maximizeWorkout
  } = useWorkoutStore.getState();

  // Check if we're coming from minimized state when component mounts
  useEffect(() => {
    if (isMinimized) {
      maximizeWorkout();
    }
    
    // No need to set up a timer here as it's now managed by the store
  }, [isMinimized]);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const insets = useSafeAreaInsets();

  // Handler for confirming workout cancellation
  const confirmCancelWorkout = async () => {
    setShowCancelDialog(false);
    
    // If cancelWorkout exists in the store, use it
    if (typeof cancelWorkout === 'function') {
      await cancelWorkout();
    } else {
      // Otherwise use the clearAutoSave function
      await clearAutoSave();
    }
    
    router.back();
  };

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

  // Handler for minimizing workout and going back
  const handleMinimize = () => {
    minimizeWorkout();
    router.back();
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

  // Show rest timer overlay when active
  if (restTimer.isActive) {
    return (
      <TabScreen>
        <View className="flex-1 items-center justify-center bg-background/80">
          {/* Timer Display */}
          <View className="items-center mb-8">
            <Text className="text-4xl font-bold text-foreground mb-2">
              Rest Timer
            </Text>
            <Text className="text-6xl font-bold text-primary">
              {formatTime(restTimer.remaining * 1000)}
            </Text>
          </View>

          {/* Controls */}
          <View className="flex-row gap-4">
            <Button
              size="lg"
              variant="outline"
              onPress={() => useWorkoutStore.getState().stopRest()}
            >
              <Text>Skip</Text>
            </Button>

            <Button
              size="lg"
              variant="outline"
              onPress={() => useWorkoutStore.getState().extendRest(30)}
            >
              <Plus className="mr-2 text-foreground" size={18} />
              <Text>Add 30s</Text>
            </Button>
          </View>
        </View>
      </TabScreen>
    );
  }

  const hasExercises = activeWorkout.exercises.length > 0;

  return (
    <TabScreen>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Swipe indicator and back button */}
        <View className="w-full items-center py-2">
          <View className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </View>
        
        {/* Header with Title and Finish Button */}
        <View className="px-4 py-3 border-b border-border">
          {/* Top row with minimize and finish buttons */}
          <View className="flex-row justify-between items-center mb-2">
            <Button
              variant="ghost"
              className="flex-row items-center"
              onPress={handleMinimize}
            >
              <ArrowLeft className="mr-1 text-foreground" size={18} />
              <Text className="text-foreground">Minimize</Text>
            </Button>
            
            <Button
              variant="purple"
              className="px-4"
              onPress={() => completeWorkout()}
              disabled={!hasExercises}
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

        {/* Content Area */}
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ 
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            paddingTop: 16,
            ...(hasExercises ? {} : { flex: 1 })
          }}
        >
          {hasExercises ? (
            // Exercise List when exercises exist
            <>
              {activeWorkout.exercises.map((exercise, exerciseIndex) => (
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
                        <TextInput
                            className={cn(
                            "bg-secondary h-10 rounded-md px-3 text-center text-foreground",
                            set.isCompleted && "bg-primary/10"
                            )}
                            value={set.weight ? set.weight.toString() : ''}
                            onChangeText={(text) => {
                            const weight = text === '' ? 0 : parseFloat(text);
                            if (!isNaN(weight)) {
                                updateSet(exerciseIndex, setIndex, { weight });
                            }
                            }}
                            keyboardType="numeric"
                            selectTextOnFocus
                        />
                        </View>

                        {/* Reps Input */}
                        <View className="flex-1 px-2">
                        <TextInput
                            className={cn(
                            "bg-secondary h-10 rounded-md px-3 text-center text-foreground",
                            set.isCompleted && "bg-primary/10"
                            )}
                            value={set.reps ? set.reps.toString() : ''}
                            onChangeText={(text) => {
                            const reps = text === '' ? 0 : parseInt(text, 10);
                            if (!isNaN(reps)) {
                                updateSet(exerciseIndex, setIndex, { reps });
                            }
                            }}
                            keyboardType="numeric"
                            selectTextOnFocus
                        />
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
              ))}
              
              {/* Cancel Button - only shown at the bottom when exercises exist */}
              <View className="mt-4 mb-8">
                <Button
                  variant="outline"
                  className="w-full"
                  onPress={() => setShowCancelDialog(true)}
                >
                  <Text className="text-foreground">Cancel Workout</Text>
                </Button>
              </View>
            </>
          ) : (
            // Empty State with nice message and icon
            <View className="flex-1 justify-center items-center px-4">
              <Dumbbell className="text-muted-foreground mb-6" size={80} />
              <Text className="text-xl font-semibold text-center mb-2">
                No exercises added
              </Text>
              <Text className="text-base text-muted-foreground text-center mb-8">
                Add exercises to start tracking your workout
              </Text>
              
              {/* Add Exercises Button for empty state */}
              <Button
                variant="purple"
                className="w-full mb-4"
                onPress={() => router.push('/(workout)/add-exercises')}
              >
                <Text className="text-white font-medium">Add Exercises</Text>
              </Button>
              
              {/* Cancel Button for empty state */}
              <Button
                variant="outline"
                className="w-full"
                onPress={() => setShowCancelDialog(true)}
              >
                <Text className="text-foreground">Cancel Workout</Text>
              </Button>
            </View>
          )}
        </ScrollView>

        {/* Add Exercise FAB - only shown when exercises exist */}
        {hasExercises && (
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
        )}
      </View>

      {/* Cancel Workout Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Workout</AlertDialogTitle>
            <AlertDialogDescription>
              <Text>Are you sure you want to cancel this workout? All progress will be lost.</Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-end gap-3">
            <AlertDialogCancel onPress={() => setShowCancelDialog(false)}>
              <Text>Continue Workout</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmCancelWorkout}>
              <Text>Cancel Workout</Text>
            </AlertDialogAction>
          </View>
        </AlertDialogContent>
      </AlertDialog>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  timerText: {
    fontVariant: ['tabular-nums']
  }
});