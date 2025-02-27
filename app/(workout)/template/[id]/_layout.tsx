// app/(workout)/template/[id]/_layout.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useWorkoutStore } from '@/stores/workoutStore';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { 
  ChevronLeft, 
  Play, 
  Heart 
} from 'lucide-react-native';

// UI Components
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TabScreen } from '@/components/layout/TabScreen';

// Import tab screens
import OverviewTab from './index';
import SocialTab from './social';
import HistoryTab from './history';

// Types
import { WorkoutTemplate } from '@/types/templates';
import type { CustomTheme } from '@/lib/theme';

// Create the tab navigator
const Tab = createMaterialTopTabNavigator();

export default function TemplateDetailsLayout() {
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  
  const templateId = typeof params.id === 'string' ? params.id : '';
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const theme = useTheme() as CustomTheme;
  
  // Use the workoutStore
  const { startWorkoutFromTemplate, checkFavoriteStatus, addFavorite, removeFavorite } = useWorkoutStore();
  
  useEffect(() => {
    async function loadTemplate() {
      try {
        setIsLoading(true);
        
        if (!templateId) {
          router.replace('/');
          return;
        }
        
        // Check if it's a favorite
        const isFav = checkFavoriteStatus(templateId);
        setIsFavorite(isFav);
        
        // If it's a favorite, get it from favorites
        if (isFav) {
          const favorites = await useWorkoutStore.getState().getFavorites();
          const favoriteTemplate = favorites.find(f => f.id === templateId);
          
          if (favoriteTemplate) {
            setWorkoutTemplate(favoriteTemplate.content);
            setIsLoading(false);
            return;
          }
        }
        
        // If not found in favorites or not a favorite, fetch from database
        // TODO: Implement fetching from database if needed
        
        // For now, create a mock template if we couldn't find it
        if (!workoutTemplate) {
          // This is a fallback mock. In production, you'd show an error
          const mockTemplate: WorkoutTemplate = {
            id: templateId,
            title: "Sample Workout",
            type: "strength",
            category: "Full Body",
            exercises: [{
              exercise: {
                id: "ex1",
                title: "Barbell Squat",
                type: "strength",
                category: "Legs",
                tags: ["compound", "legs"],
                availability: { source: ["local"] },
                created_at: Date.now()
              },
              targetSets: 3,
              targetReps: 8
            }],
            isPublic: false,
            tags: ["strength", "beginner"],
            version: 1,
            created_at: Date.now(),
            availability: { source: ["local"] }
          };
          
          setWorkoutTemplate(mockTemplate);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading template:", error);
        setIsLoading(false);
      }
    }
    
    loadTemplate();
  }, [templateId, db]);
  
  const handleStartWorkout = async () => {
    if (!workoutTemplate) return;
    
    try {
      // Use the workoutStore action to start a workout from template
      await startWorkoutFromTemplate(workoutTemplate.id);
      
      // Navigate to the active workout screen
      router.push('/(workout)/create');
    } catch (error) {
      console.error("Error starting workout:", error);
    }
  };
  
  const handleGoBack = () => {
    router.back();
  };
  
  const handleToggleFavorite = async () => {
    if (!workoutTemplate) return;
    
    try {
      if (isFavorite) {
        await removeFavorite(workoutTemplate.id);
      } else {
        await addFavorite(workoutTemplate);
      }
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };
  
  if (isLoading || !workoutTemplate) {
    return (
      <TabScreen>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View className="px-4 py-3 flex-row items-center border-b border-border">
            <Button 
              variant="ghost" 
              size="icon"
              onPress={handleGoBack}
            >
              <ChevronLeft className="text-foreground" />
            </Button>
            <Text className="text-xl font-semibold ml-2">
              Template Details
            </Text>
          </View>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" className="mb-4" />
            <Text className="text-muted-foreground">Loading template...</Text>
          </View>
        </View>
      </TabScreen>
    );
  }

  return (
    <TabScreen>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header with back button, title and Start button */}
        <View className="px-4 py-3 flex-row items-center justify-between border-b border-border">
          <View className="flex-row items-center flex-1 mr-2">
            <Button 
              variant="ghost" 
              size="icon"
              onPress={handleGoBack}
            >
              <ChevronLeft className="text-foreground" />
            </Button>
            <Text className="text-xl font-semibold ml-2" numberOfLines={1}>
              {workoutTemplate.title}
            </Text>
          </View>
          
          <View className="flex-row items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onPress={handleToggleFavorite}
              className="mr-2"
            >
              <Heart 
                className={isFavorite ? "text-primary" : "text-muted-foreground"} 
                fill={isFavorite ? "currentColor" : "none"}
                size={22} 
              />
            </Button>
            
            {/* Updated to match Add Exercises button */}
            <Button 
              variant="purple"
              className="flex-row items-center justify-center"
              onPress={handleStartWorkout}
            >
              <Text className="text-white font-medium">Start Workout</Text>
            </Button>
          </View>
        </View>
        
        {/* Context provider to pass template to the tabs */}
        <TemplateContext.Provider value={{ template: workoutTemplate }}>
          <Tab.Navigator
            screenOptions={{
              // Match exact library tab styling
              tabBarActiveTintColor: theme.colors.tabIndicator,
              tabBarInactiveTintColor: theme.colors.tabInactive,
              tabBarLabelStyle: {
                fontSize: 14,
                textTransform: 'capitalize',
                fontWeight: 'bold',
              },
              tabBarIndicatorStyle: {
                backgroundColor: theme.colors.tabIndicator,
                height: 2,
              },
              tabBarStyle: { 
                backgroundColor: theme.colors.background,
                elevation: 0,
                shadowOpacity: 0,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              },
              tabBarPressColor: theme.colors.primary,
            }}
          >
            <Tab.Screen
              name="index"
              component={OverviewTab}
              options={{ title: 'Overview' }}
            />
            <Tab.Screen
              name="social"
              component={SocialTab}
              options={{ title: 'Social' }}
            />
            <Tab.Screen
              name="history"
              component={HistoryTab}
              options={{ title: 'History' }}
            />
          </Tab.Navigator>
        </TemplateContext.Provider>
      </View>
    </TabScreen>
  );
}

// Create a context to share the template with the tab screens
interface TemplateContextType {
  template: WorkoutTemplate | null;
}

export const TemplateContext = React.createContext<TemplateContextType>({
  template: null
});

// Custom hook to access the template
export function useTemplate() {
  const context = React.useContext(TemplateContext);
  if (!context.template) {
    throw new Error('useTemplate must be used within a TemplateContext.Provider');
  }
  return context.template;
}