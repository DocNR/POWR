// app/(tabs)/index.tsx
import { useState, useEffect } from 'react'
import { ScrollView, View } from 'react-native'
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
import type { WorkoutTemplate } from '@/types/templates'
import { Text } from '@/components/ui/text'
import { getRandomWorkoutTitle } from '@/utils/workoutTitles'

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

export default function WorkoutScreen() {
  const { startWorkout } = useWorkoutStore.getState();
  const [showActiveWorkoutModal, setShowActiveWorkoutModal] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [favoriteWorkouts, setFavoriteWorkouts] = useState<FavoriteTemplateData[]>([])
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true)

  const { 
    getFavorites,
    startWorkoutFromTemplate,
    removeFavorite,
    checkFavoriteStatus,
    isActive,
    endWorkout
  } = useWorkoutStore()

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    setIsLoadingFavorites(true)
    try {
      const favorites = await getFavorites()
      
      const workoutTemplates = favorites
        .filter(f => f.content && f.content.id && checkFavoriteStatus(f.content.id))
        .map(f => {
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

      setFavoriteWorkouts(workoutTemplates)
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setIsLoadingFavorites(false)
    }
  }

  const handleStartWorkout = async (templateId: string) => {
    if (isActive) {
      setPendingTemplateId(templateId)
      setShowActiveWorkoutModal(true)
      return
    }
  
    try {
      await startWorkoutFromTemplate(templateId)
      router.push('/(workout)/create')
    } catch (error) {
      console.error('Error starting workout:', error)
    }
  }

  const handleStartNew = async () => {
    if (!pendingTemplateId) return
    
    const templateToStart = pendingTemplateId
    setShowActiveWorkoutModal(false)
    setPendingTemplateId(null)

    await endWorkout()
    await startWorkoutFromTemplate(templateToStart)
    router.push('/(workout)/create')
  }

  const handleContinueExisting = () => {
    setShowActiveWorkoutModal(false)
    setPendingTemplateId(null)
    router.push('/(workout)/create')
  }

  const handleFavoritePress = async (templateId: string) => {
    try {
      await removeFavorite(templateId)
      await loadFavorites()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleQuickStart = () => {
    // Initialize a new workout with a random funny title
    startWorkout({
      title: getRandomWorkoutTitle(),
      type: 'strength',
      exercises: []
    });
    
    router.push('/(workout)/create');
  };

  return (
    <TabScreen>
      <Header title="Workout" />
      
      <ScrollView 
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <HomeWorkout 
          onStartBlank={handleQuickStart}  // Use the new handler here
          onSelectTemplate={() => router.push('/(workout)/template-select')}
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
              You have an active workout in progress. Would you like to finish it first?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-end gap-3">
            <AlertDialogCancel onPress={() => setShowActiveWorkoutModal(false)}>
              <Text>Start New</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={handleContinueExisting}>
              <Text>Continue Workout</Text>
            </AlertDialogAction>
          </View>
        </AlertDialogContent>
      </AlertDialog>
    </TabScreen>
  )
}