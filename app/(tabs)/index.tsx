// app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react'; 
import { ScrollView, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TabScreen } from '@/components/layout/TabScreen'
import Header from '@/components/Header'
import HomeWorkout from '@/components/workout/HomeWorkout'
import FavoriteTemplate from '@/components/workout/FavoriteTemplate'
import { useWorkoutStore } from '@/stores/workoutStore'
import { Text } from '@/components/ui/text'
import { getRandomWorkoutTitle } from '@/utils/workoutTitles'
import { Bell } from 'lucide-react-native';
import { Button } from '@/components/ui/button';

interface FavoriteTemplateData {
  id: string;
  title: string;
  description: string;
  exercises: Array<{
    title: string;
    sets: number;
    reps: number;
  }>;
  exerciseCount: number;
  duration?: number;
  isFavorited: boolean;
  lastUsed?: number;
  source: 'local' | 'powr' | 'nostr';
}

// Type for tracking pending workout actions
type PendingWorkoutAction = 
  | { type: 'quick-start' } 
  | { type: 'template', templateId: string }
  | { type: 'template-select' };

export default function WorkoutScreen() {
  const { startWorkout } = useWorkoutStore.getState();
  const [showActiveWorkoutModal, setShowActiveWorkoutModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingWorkoutAction | null>(null);
  const [favoriteWorkouts, setFavoriteWorkouts] = useState<FavoriteTemplateData[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  const { 
    getFavorites,
    startWorkoutFromTemplate,
    removeFavorite,
    checkFavoriteStatus,
    isActive,
    endWorkout
  } = useWorkoutStore();

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      return () => {}; // Cleanup function
    }, [])
  );

  const loadFavorites = async () => {
    setIsLoadingFavorites(true);
    try {
      const favorites = await getFavorites();
      
      const workoutTemplates = favorites.map(f => {
        const content = f.content;
        return {
          id: content.id,
          title: content.title || 'Untitled Workout',
          description: content.description || '',
          exercises: content.exercises.map(ex => ({
            title: ex.exercise.title,
            sets: ex.targetSets,
            reps: ex.targetReps
          })),
          exerciseCount: content.exercises.length,
          duration: content.metadata?.averageDuration,
          isFavorited: true,
          lastUsed: content.metadata?.lastUsed,
          source: content.availability.source.includes('nostr') 
            ? 'nostr' 
            : content.availability.source.includes('powr')
              ? 'powr'
              : 'local'
        } as FavoriteTemplateData;
      });

      setFavoriteWorkouts(workoutTemplates);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  // Handle starting a template-based workout
  const handleStartWorkout = async (templateId: string) => {
    if (isActive) {
      // Save what the user wants to do for later
      setPendingAction({ type: 'template', templateId });
      setShowActiveWorkoutModal(true);
      return;
    }
  
    try {
      await startWorkoutFromTemplate(templateId);
      router.push('/(workout)/create');
    } catch (error) {
      console.error('Error starting workout:', error);
    }
  };

  // Handle selecting a template
  const handleSelectTemplate = () => {
    if (isActive) {
      setPendingAction({ type: 'template-select' });
      setShowActiveWorkoutModal(true);
      return;
    }
    
    router.push('/(workout)/template-select');
  };

  // Handle quick start
  const handleQuickStart = () => {
    // Check if there's already an active workout
    if (isActive) {
      setPendingAction({ type: 'quick-start' });
      setShowActiveWorkoutModal(true);
      return;
    }
    
    // Initialize a new workout with a random funny title
    startWorkout({
      title: getRandomWorkoutTitle(),
      type: 'strength',
      exercises: []
    });
    
    router.push('/(workout)/create');
  };

  // Handle starting a new workout (after ending the current one)
  const handleStartNew = async () => {
    if (!pendingAction) return;
    
    setShowActiveWorkoutModal(false);
    
    // End the current workout first
    await endWorkout();
    
    // Now handle the pending action
    switch (pendingAction.type) {
      case 'quick-start':
        // Start a new quick workout
        startWorkout({
          title: getRandomWorkoutTitle(),
          type: 'strength',
          exercises: []
        });
        router.push('/(workout)/create');
        break;
        
      case 'template':
        // Start a workout from the selected template
        await startWorkoutFromTemplate(pendingAction.templateId);
        router.push('/(workout)/create');
        break;
        
      case 'template-select':
        // Navigate to template selection
        router.push('/(workout)/template-select');
        break;
    }
    
    // Clear the pending action
    setPendingAction(null);
  };

  // Handle continuing the existing workout
  const handleContinueExisting = () => {
    setShowActiveWorkoutModal(false);
    setPendingAction(null);
    router.push('/(workout)/create');
  };

  const handleFavoritePress = async (templateId: string) => {
    try {
      await removeFavorite(templateId);
      await loadFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <TabScreen>
      <Header 
        useLogo={true}
        rightElement={
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => console.log('Open notifications')}
          >
            <View className="relative">
              <Bell className="text-foreground" />
              <View className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </View>
          </Button>
        }
      />
      
      <ScrollView 
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <HomeWorkout 
          onStartBlank={handleQuickStart}
          onSelectTemplate={handleSelectTemplate}
        />
        
        {/* Favorites section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Favorites</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingFavorites ? (
              <View className="p-6">
                <Text className="text-muted-foreground text-center">
                  Loading favorites...
                </Text>
              </View>
            ) : favoriteWorkouts.length === 0 ? (
              <View className="p-6">
                <Text className="text-muted-foreground text-center">
                  Star workouts from your library to see them here
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {favoriteWorkouts.map(template => (
                  <FavoriteTemplate
                    key={template.id}
                    title={template.title}
                    exercises={template.exercises}
                    duration={template.duration}
                    exerciseCount={template.exerciseCount}
                    isFavorited={true}
                    onPress={() => handleStartWorkout(template.id)}
                    onFavoritePress={() => handleFavoritePress(template.id)}
                  />
                ))}
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>

      <AlertDialog open={showActiveWorkoutModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Active Workout</AlertDialogTitle>
            <AlertDialogDescription>
              <Text>You have an active workout in progress. Would you like to continue it or start a new workout?</Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-end gap-3">
            <AlertDialogCancel onPress={handleStartNew}>
              <Text>Start New</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleContinueExisting}>
              <Text>Continue Workout</Text>
            </AlertDialogAction>
          </View>
        </AlertDialogContent>
      </AlertDialog>
    </TabScreen>
  );
}