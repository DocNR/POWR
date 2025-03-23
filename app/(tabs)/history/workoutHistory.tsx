// app/(tabs)/history/workoutHistory.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSQLiteContext } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { format } from 'date-fns';
import { WorkoutHistoryService } from '@/lib/db/services/WorkoutHistoryService';
import WorkoutCard from '@/components/workout/WorkoutCard';

// Mock data for when database tables aren't yet created
const mockWorkouts: Workout[] = [
  {
    id: '1',
    title: 'Push 1',
    type: 'strength',
    exercises: [],
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
    exercises: [],
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
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Initialize workout history service
  const workoutHistoryService = React.useMemo(() => new WorkoutHistoryService(db), [db]);
  
  // Load workouts
  const loadWorkouts = async () => {
    try {
      setIsLoading(true);
      const allWorkouts = await workoutHistoryService.getAllWorkouts();
      setWorkouts(allWorkouts);
      setUseMockData(false);
    } catch (error) {
      console.error('Error loading workouts:', error);
      
      // Check if the error is about missing tables
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('no such table')) {
        console.log('Using mock data because workout tables not yet created');
        setWorkouts(mockWorkouts);
        setUseMockData(true);
      } else {
        // For other errors, just show empty state
        setWorkouts([]);
        setUseMockData(false);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadWorkouts();
  }, [workoutHistoryService]);
  
  // Pull to refresh handler
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadWorkouts();
  }, []);
  
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
    </View>
  );
}
