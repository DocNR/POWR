// app/(tabs)/history/workoutHistory.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useSQLiteContext } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { format } from 'date-fns';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import WorkoutCard from '@/components/workout/WorkoutCard';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import { useWorkoutHistory } from '@/lib/hooks/useWorkoutHistory';

// Define colors for icons and buttons
const primaryColor = "#8b5cf6"; // Purple color
const mutedColor = "#9ca3af"; // Gray color
const primaryBgColor = "#8b5cf6"; // Purple background
const primaryTextColor = "#ffffff"; // White text for purple background
const mutedBgColor = "#f3f4f6"; // Light gray background
const mutedTextColor = "#6b7280"; // Dark gray text for light background

// Mock data for when database tables aren't yet created
const mockWorkouts: Workout[] = [
  {
    id: '1',
    title: 'Push 1',
    type: 'strength',
    exercises: [
      {
        id: 'ex1',
        exerciseId: 'bench-press',
        title: 'Bench Press',
        type: 'strength',
        category: 'Push',
        sets: [],
        isCompleted: true,
        created_at: new Date('2025-03-07T10:00:00').getTime(),
        lastUpdated: new Date('2025-03-07T10:00:00').getTime(),
        availability: { source: ['local'] },
        tags: ['compound', 'push']
      },
      {
        id: 'ex2',
        exerciseId: 'shoulder-press',
        title: 'Shoulder Press',
        type: 'strength',
        category: 'Push',
        sets: [],
        isCompleted: true,
        created_at: new Date('2025-03-07T10:00:00').getTime(),
        lastUpdated: new Date('2025-03-07T10:00:00').getTime(),
        availability: { source: ['local'] },
        tags: ['compound', 'push']
      },
      {
        id: 'ex3',
        exerciseId: 'tricep-extension',
        title: 'Tricep Extension',
        type: 'strength',
        category: 'Push',
        sets: [],
        isCompleted: true,
        created_at: new Date('2025-03-07T10:00:00').getTime(),
        lastUpdated: new Date('2025-03-07T10:00:00').getTime(),
        availability: { source: ['local'] },
        tags: ['isolation', 'push']
      }
    ],
    startTime: new Date('2025-03-07T10:00:00').getTime(),
    endTime: new Date('2025-03-07T11:47:00').getTime(),
    isCompleted: true,
    created_at: new Date('2025-03-07T10:00:00').getTime(),
    availability: { source: ['local'] },
    totalVolume: 9239
  },
  {
    id: '2',
    title: 'Pull 1',
    type: 'strength',
    exercises: [
      {
        id: 'ex4',
        exerciseId: 'pull-up',
        title: 'Pull Up',
        type: 'strength',
        category: 'Pull',
        sets: [],
        isCompleted: true,
        created_at: new Date('2025-03-05T14:00:00').getTime(),
        lastUpdated: new Date('2025-03-05T14:00:00').getTime(),
        availability: { source: ['local'] },
        tags: ['compound', 'pull']
      },
      {
        id: 'ex5',
        exerciseId: 'barbell-row',
        title: 'Barbell Row',
        type: 'strength',
        category: 'Pull',
        sets: [],
        isCompleted: true,
        created_at: new Date('2025-03-05T14:00:00').getTime(),
        lastUpdated: new Date('2025-03-05T14:00:00').getTime(),
        availability: { source: ['local'] },
        tags: ['compound', 'pull']
      }
    ],
    startTime: new Date('2025-03-05T14:00:00').getTime(),
    endTime: new Date('2025-03-05T15:36:00').getTime(),
    isCompleted: true,
    created_at: new Date('2025-03-05T14:00:00').getTime(),
    availability: { source: ['local'] },
    totalVolume: 1396
  }
];

// Group workouts by month
const groupWorkoutsByMonth = (workouts: Workout[]) => {
  const grouped: Record<string, Workout[]> = {};
  
  workouts.forEach(workout => {
    const monthKey = format(workout.startTime, 'MMMM yyyy');
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(workout);
  });
  
  return Object.entries(grouped);
};

export default function HistoryScreen() {
  const db = useSQLiteContext();
  const { isAuthenticated } = useNDKCurrentUser();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [includeNostr, setIncludeNostr] = useState(true);
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  
  // Use the unified workout history hook
  const { 
    workouts: allWorkouts, 
    loading, 
    refreshing: hookRefreshing,
    refresh,
    error
  } = useWorkoutHistory({
    includeNostr,
    filters: includeNostr ? undefined : { source: ['local'] },
    realtime: true
  });
  
  // Set workouts from the hook
  useEffect(() => {
    if (loading) {
      setIsLoading(true);
    } else {
      setWorkouts(allWorkouts);
      setIsLoading(false);
      setRefreshing(false);
      
      // Check if we need to use mock data (empty workouts)
      if (allWorkouts.length === 0 && !error) {
        console.log('No workouts found, using mock data');
        setWorkouts(mockWorkouts);
        setUseMockData(true);
      } else {
        setUseMockData(false);
      }
    }
  }, [allWorkouts, loading, error]);
  
  // Pull to refresh handler
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refresh();
  }, [refresh]);
  
  // Group workouts by month
  const groupedWorkouts = groupWorkoutsByMonth(workouts);
  
  return (
    <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Nostr Login Prompt */}
        {!isAuthenticated && (
          <View className="mx-4 mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <Text className="text-foreground font-medium mb-2">
              Connect with Nostr
            </Text>
            <Text className="text-muted-foreground mb-4">
              Login with Nostr to see your workouts from other devices and back up your workout history.
            </Text>
            <Button 
              variant="purple" 
              onPress={() => setIsLoginSheetOpen(true)}
              className="w-full"
            >
              <Text className="text-white">Login with Nostr</Text>
            </Button>
          </View>
        )}
        {isLoading && !refreshing ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" className="mb-4" />
            <Text className="text-muted-foreground">Loading workout history...</Text>
          </View>
        ) : workouts.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-muted-foreground">No workouts recorded yet.</Text>
            <Text className="text-muted-foreground mt-2">
              Complete a workout to see it here.
            </Text>
          </View>
        ) : (
          // Display grouped workouts by month
          <View className="p-4">
            {useMockData && (
              <View className="bg-primary/5 rounded-lg p-4 mb-4 border border-border">
                <Text className="text-muted-foreground text-sm">
                  Showing example data. Your completed workouts will appear here.
                </Text>
              </View>
            )}
            
            {isAuthenticated && (
              <View className="flex-row justify-end mb-4">
                <Pressable
                  onPress={() => setIncludeNostr(!includeNostr)}
                  style={{
                    backgroundColor: includeNostr ? primaryBgColor : mutedBgColor,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ 
                    color: includeNostr ? primaryTextColor : mutedTextColor,
                    fontSize: 14,
                  }}>
                    {includeNostr ? 'Showing All Workouts' : 'Local Workouts Only'}
                  </Text>
                </Pressable>
              </View>
            )}
            
            {groupedWorkouts.map(([month, monthWorkouts]) => (
              <View key={month} className="mb-6">
                <Text className="text-foreground text-xl font-semibold mb-4">
                  {month.toUpperCase()}
                </Text>
                
                {monthWorkouts.map((workout) => (
                  <WorkoutCard 
                    key={workout.id} 
                    workout={workout}
                    showDate={true}
                    showExercises={true}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
        
        {/* Add bottom padding for better scrolling experience */}
        <View className="h-20" />
      </ScrollView>
      
      {/* Nostr Login Sheet */}
      <NostrLoginSheet 
        open={isLoginSheetOpen} 
        onClose={() => setIsLoginSheetOpen(false)} 
      />
    </View>
  );
}
