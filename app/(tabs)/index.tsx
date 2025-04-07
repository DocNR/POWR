// app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react'; 
import { ScrollView, View, TouchableOpacity, Platform } from 'react-native'
import { useFocusEffect, useTheme } from '@react-navigation/native';
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
import { useWorkoutStore } from '@/stores/workoutStore'
import { Text } from '@/components/ui/text'
import { getRandomWorkoutTitle } from '@/utils/workoutTitles'
import { Bell, Star, Clock, Dumbbell } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { useIconColor } from '@/lib/theme/iconUtils';

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
  
const purpleColor = 'hsl(261, 90%, 66%)';

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

  const theme = useTheme();
  const { getIconProps } = useIconColor();

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

  // Helper function to format time ago
  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hr ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths === 1) return '1 month ago';
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    
    return 'Over a year ago';
  };

  return (
    <TabScreen>
      <Header useLogo={true} showNotifications={true} />
      
      <ScrollView 
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >

      {/* Start a Workout section - without the outer box */}
      <View className="mb-6">
        <Text className="text-xl font-semibold mb-4">Start a Workout</Text>
        <Text className="text-sm text-muted-foreground mb-4">
          Begin a new workout or choose from one of your templates.
        </Text>
        
        {/* Quick Start button */}
        <View className="gap-4">
          <Button 
            variant="default"  // This ensures it uses the primary purple color
            className="w-full"
            onPress={handleQuickStart}
            style={{ backgroundColor: purpleColor }}
          >
            <Text className="text-white font-medium">Quick Start</Text>
          </Button>
        </View>
      </View>
        
        {/* Favorites section with adjusted grid layout */}
        <View className="mt-6">
          <Text className="text-xl font-semibold mb-4">Favorites</Text>
          
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
            <View className="flex-row flex-wrap justify-between">
              {favoriteWorkouts.map(template => (
                <TouchableOpacity 
                  key={template.id}
                  activeOpacity={0.7} 
                  onPress={() => handleStartWorkout(template.id)}
                  className="w-[48%] mb-3"
                  style={{ aspectRatio: 1 / 0.85 }} // Slightly less tall than a square
                >
                  <Card className="border border-border h-full">
                    <CardContent className="p-4 flex-1 justify-between">
                      {/* Top section with title and star */}
                      <View className="flex-1">
                        <View className="flex-row justify-between items-start">
                          <Text className="text-base font-medium flex-1 mr-1" numberOfLines={2}>
                            {template.title}
                          </Text>
                          
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleFavoritePress(template.id);
                            }}
                          >
                            <Star 
                              size={16}
                              className="text-primary"
                              fill="currentColor"
                            />
                          </TouchableOpacity>
                        </View>
                        
                        {/* First 2 exercises */}
                        <View className="mt-2">
                          {template.exercises.slice(0, 2).map((exercise, index) => (
                            <Text key={index} className="text-xs text-foreground" numberOfLines={1}>
                              • {exercise.title}
                            </Text>
                          ))}
                          {template.exercises.length > 2 && (
                            <Text className="text-xs text-muted-foreground">
                              +{template.exercises.length - 2} more
                            </Text>
                          )}
                        </View>
                      </View>
                      
                      {/* Stats row */}
                      <View className="mt-2 pt-2 border-t border-border">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center">
                            <Dumbbell size={14} className="text-muted-foreground mr-1" />
                            <Text className="text-xs text-muted-foreground">
                              {template.exerciseCount}
                            </Text>
                          </View>
                          
                          {template.duration && (
                            <View className="flex-row items-center">
                              <Clock size={14} className="text-muted-foreground mr-1" />
                              <Text className="text-xs text-muted-foreground">
                                {Math.round(template.duration / 60)} min
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {/* Last performed info */}
                        {template.lastUsed && (
                          <View className="flex-row items-center mt-2">
                            <Clock size={14} className="text-muted-foreground mr-1" />
                            <Text className="text-xs text-muted-foreground">
                              Last: {getTimeAgo(template.lastUsed)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
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
