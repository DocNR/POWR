// app/(workout)/create.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { TabScreen } from '@/components/layout/TabScreen';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
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
import { Plus, Pause, Play, MoreHorizontal, Dumbbell, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditableText from '@/components/EditableText';
import { cn } from '@/lib/utils';
import { generateId } from '@/utils/ids';
import { WorkoutSet } from '@/types/workout';
import { formatTime } from '@/utils/formatTime';
import { ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import SetInput from '@/components/workout/SetInput';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import { WorkoutAlertDialog } from '@/components/workout/WorkoutAlertDialog';
import { useIconColor } from '@/lib/theme/iconUtils';

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

  // Get theme colors
  const { isDarkColorScheme } = useColorScheme();
  // Get icon utilities
  const { getIconProps } = useIconColor();

  // Create dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    timerText: {
      fontVariant: ['tabular-nums']
    },
    cardContainer: {
      marginBottom: 24,
      backgroundColor: isDarkColorScheme ? '#1F1F23' : 'white',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDarkColorScheme ? '#333' : '#eee',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    cardHeader: {
      padding: 16, 
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: isDarkColorScheme ? '#333' : '#eee'
    },
    cardTitle: {
      fontSize: 18, 
      fontWeight: 'bold', 
      color: '#8B5CF6' // Purple is used in both themes
    },
    setsInfo: {
      paddingHorizontal: 16, 
      paddingVertical: 4
    },
    setsInfoText: {
      fontSize: 14, 
      color: isDarkColorScheme ? '#999' : '#666'
    },
    headerRow: {
      flexDirection: 'row', 
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderTopWidth: 1,
      borderTopColor: isDarkColorScheme ? '#333' : '#eee',
      backgroundColor: isDarkColorScheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
    },
    headerCell: {
      fontSize: 14, 
      fontWeight: '500', 
      color: isDarkColorScheme ? '#999' : '#666', 
      textAlign: 'center'
    },
    setNumberCell: {
      width: 32
    },
    prevCell: {
      width: 80
    },
    valueCell: {
      flex: 1
    },
    spacer: {
      width: 44
    },
    setsList: {
      padding: 0
    },
    actionButton: {
      borderTopWidth: 1, 
      borderTopColor: isDarkColorScheme ? '#333' : '#eee'
    },
    iconColor: {
      color: isDarkColorScheme ? '#999' : '#666'
    }
  });

  type CreateScreenNavigationProp = NativeStackNavigationProp<ParamListBase>;
  const navigation = useNavigation<CreateScreenNavigationProp>();

  // Check if we're coming from minimized state when component mounts
  useEffect(() => {
    if (isMinimized) {
      maximizeWorkout();
    }
  }, [isMinimized, maximizeWorkout]);

  // Handle back navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If we have an active workout, just minimize it before continuing
      if (activeWorkout && !isMinimized) {
        // Call minimizeWorkout to update the state
        minimizeWorkout();
        
        // Let the navigation continue naturally
        // Don't call router.back() here to avoid recursion
      }
    });
    
    return unsubscribe;
  }, [navigation, activeWorkout, isMinimized, minimizeWorkout]);

  const [showFinishDialog, setShowFinishDialog] = useState(false);
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
              <View>
                <Plus {...getIconProps('primary')} size={18} />
              </View>
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
        {/* Header with back button */}
        <View className="px-4 py-3 flex-row items-center justify-between border-b border-border">
          <View className="flex-row items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onPress={() => {
                minimizeWorkout();
                router.back();
              }}
            >
              <View>
                <ChevronLeft {...getIconProps('primary')} />
              </View>
            </Button>
            <Text className="text-xl font-semibold ml-2">Back</Text>
          </View>
          
          <Button
            variant="purple"
            className="px-4"
            onPress={() => setShowFinishDialog(true)}
            disabled={!hasExercises}
          >
            <Text className="text-white font-medium">Finish</Text>
          </Button>
        </View>
        
        {/* Full-width workout title */}
        <View className="px-4 py-3">
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
        <View className="flex-row items-center px-4 pb-3 border-b border-border">
          <Text style={dynamicStyles.timerText} className={cn(
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
              <View>
                <Pause {...getIconProps('primary')} />
              </View>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="ml-2"
              onPress={resumeWorkout}
            >
              <View>
                <Play {...getIconProps('primary')} />
              </View>
            </Button>
          )}
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
                <View key={exercise.id} style={dynamicStyles.cardContainer}>
                  {/* Exercise Header */}
                  <View style={dynamicStyles.cardHeader}>
                    <Text style={dynamicStyles.cardTitle}>
                      {exercise.title}
                    </Text>
                    <TouchableOpacity onPress={() => console.log('Open exercise options')}>
                      <View>
                        <MoreHorizontal {...getIconProps('muted')} size={20} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  
                  {/* Sets Info */}
                  <View style={dynamicStyles.setsInfo}>
                    <Text style={dynamicStyles.setsInfoText}>
                      {exercise.sets.filter(s => s.isCompleted).length} sets completed
                    </Text>
                  </View>
                  
                  {/* Set Headers */}
                  <View style={dynamicStyles.headerRow}>
                    <Text style={[dynamicStyles.headerCell, dynamicStyles.setNumberCell]}>SET</Text>
                    <Text style={[dynamicStyles.headerCell, dynamicStyles.prevCell]}>PREV</Text>
                    <Text style={[dynamicStyles.headerCell, dynamicStyles.valueCell]}>KG</Text>
                    <Text style={[dynamicStyles.headerCell, dynamicStyles.valueCell]}>REPS</Text>
                    <View style={dynamicStyles.spacer} />
                  </View>
                  
                  {/* Exercise Sets */}
                  <View style={dynamicStyles.setsList}>
                    {exercise.sets.map((set, setIndex) => {
                      const previousSet = setIndex > 0 ? exercise.sets[setIndex - 1] : undefined;
                      
                      return (
                        <SetInput
                          key={set.id}
                          exerciseIndex={exerciseIndex}
                          setIndex={setIndex}
                          setNumber={setIndex + 1}
                          weight={set.weight}
                          reps={set.reps}
                          isCompleted={set.isCompleted}
                          previousSet={previousSet}
                        />
                      );
                    })}
                  </View>
                  
                  {/* Add Set Button */}
                  <View style={dynamicStyles.actionButton}>
                    <Button
                      variant="ghost"
                      className="flex-row justify-center items-center py-2"
                      onPress={() => handleAddSet(exerciseIndex)}
                    >
                      <View>
                        <Plus {...getIconProps('primary')} size={18} />
                      </View>
                      <Text className="text-foreground">Add Set</Text>
                    </Button>
                  </View>
                </View>
              ))}
              
              {/* Add Exercises Button */}
              <Button
                variant="purple"
                className="w-full mb-4"
                onPress={() => router.push('/(workout)/add-exercises')}
              >
                <Text className="text-white font-medium">Add Exercises</Text>
              </Button>
              
              {/* Cancel Button */}
              <Button
                variant="outline"
                className="w-full mb-8"
                onPress={() => setShowCancelDialog(true)}
              >
                <Text className="text-foreground">Cancel Workout</Text>
              </Button>
            </>
          ) : (
            // Empty State with nice message and icon
            <View className="flex-1 justify-center items-center px-4">
              <View>
                <Dumbbell {...getIconProps('muted')} size={80} />
              </View>
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
      </View>

      {/* Finish Workout Dialog */}
      <WorkoutAlertDialog
        open={showFinishDialog}
        onOpenChange={setShowFinishDialog}
        onConfirm={() => {
          setShowFinishDialog(false);
          // Set the end time before navigating
          useWorkoutStore.setState(state => ({
            activeWorkout: state.activeWorkout ? {
              ...state.activeWorkout,
              endTime: Date.now(),
              lastUpdated: Date.now()
            } : null
          }));
          // Navigate to completion screen
          router.push('/(workout)/complete');
        }}
        title="Complete Workout?"
        description="Are you sure you want to finish this workout? This will end your current session."
        confirmText="Complete Workout"
      />

      {/* Cancel Workout Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Text>Cancel Workout</Text>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text>Are you sure you want to cancel this workout? All progress will be lost.</Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-center gap-3 px-4 mt-2">
            <AlertDialogCancel onPress={() => setShowCancelDialog(false)}>
              <Text>Continue Workout</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmCancelWorkout} className='bg-destructive'>
              <Text className='text-destructive-foreground'>Cancel Workout</Text>
            </AlertDialogAction>
          </View>
        </AlertDialogContent>
      </AlertDialog>
    </TabScreen>
  );
}