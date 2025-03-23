// app/(tabs)/profile/progress.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { ActivityIndicator } from 'react-native';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { WorkoutStats, PersonalRecord } from '@/lib/services/AnalyticsService';

// Period selector component
function PeriodSelector({ period, setPeriod }: { 
  period: 'week' | 'month' | 'year' | 'all', 
  setPeriod: (period: 'week' | 'month' | 'year' | 'all') => void 
}) {
  return (
    <View className="flex-row justify-center my-4">
      <Button 
        variant={period === 'week' ? 'purple' : 'outline'} 
        size="sm" 
        className="mx-1"
        onPress={() => setPeriod('week')}
      >
        <Text className={period === 'week' ? 'text-white' : 'text-foreground'}>Week</Text>
      </Button>
      <Button 
        variant={period === 'month' ? 'purple' : 'outline'} 
        size="sm" 
        className="mx-1"
        onPress={() => setPeriod('month')}
      >
        <Text className={period === 'month' ? 'text-white' : 'text-foreground'}>Month</Text>
      </Button>
      <Button 
        variant={period === 'year' ? 'purple' : 'outline'} 
        size="sm" 
        className="mx-1"
        onPress={() => setPeriod('year')}
      >
        <Text className={period === 'year' ? 'text-white' : 'text-foreground'}>Year</Text>
      </Button>
      <Button 
        variant={period === 'all' ? 'purple' : 'outline'} 
        size="sm" 
        className="mx-1"
        onPress={() => setPeriod('all')}
      >
        <Text className={period === 'all' ? 'text-white' : 'text-foreground'}>All</Text>
      </Button>
    </View>
  );
}

// Format duration in hours and minutes
function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default function ProgressScreen() {
  const { isAuthenticated } = useNDKCurrentUser();
  const analytics = useAnalytics();
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  
  // Load workout statistics when period changes
  useEffect(() => {
    async function loadStats() {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        const workoutStats = await analytics.getWorkoutStats(period);
        setStats(workoutStats);
        
        // Load personal records
        const personalRecords = await analytics.getPersonalRecords(undefined, 5);
        setRecords(personalRecords);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadStats();
  }, [isAuthenticated, period, analytics]);
  
  // Workout frequency chart
  const WorkoutFrequencyChart = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return (
      <View className="h-40 bg-muted rounded-lg items-center justify-center">
        <Text className="text-muted-foreground">Workout Frequency Chart</Text>
        <View className="flex-row justify-evenly w-full mt-2">
          {stats?.frequencyByDay.map((count, index) => (
            <View key={index} className="items-center">
              <View 
                style={{ 
                  height: count * 8, 
                  width: 20, 
                  backgroundColor: 'hsl(var(--purple))',
                  borderRadius: 4
                }} 
              />
              <Text className="text-xs text-muted-foreground mt-1">{days[index]}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  // Exercise distribution chart
  const ExerciseDistributionChart = () => {
    // Sample exercise names for demonstration
    const exerciseNames = [
      'Bench Press', 'Squat', 'Deadlift', 'Pull-up', 'Shoulder Press'
    ];
    
    // Convert exercise distribution to percentages
    const exerciseDistribution = stats?.exerciseDistribution || {};
    const total = Object.values(exerciseDistribution).reduce((sum, count) => sum + count, 0) || 1;
    const percentages = Object.entries(exerciseDistribution).reduce((acc, [id, count]) => {
      acc[id] = Math.round((count / total) * 100);
      return acc;
    }, {} as Record<string, number>);
    
    // Take top 5 exercises
    const topExercises = Object.entries(percentages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    return (
      <View className="h-40 bg-muted rounded-lg items-center justify-center">
        <Text className="text-muted-foreground">Exercise Distribution</Text>
        <View className="flex-row justify-evenly w-full mt-2">
          {topExercises.map(([id, percentage], index) => (
            <View key={index} className="items-center mx-1">
              <View 
                style={{ 
                  height: percentage * 1.5, 
                  width: 20, 
                  backgroundColor: `hsl(${index * 50}, 70%, 50%)`,
                  borderRadius: 4
                }} 
              />
              <Text className="text-xs text-muted-foreground mt-1 text-center">
                {exerciseNames[index % exerciseNames.length].substring(0, 8)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-muted-foreground">
          Log in to view your progress
        </Text>
      </View>
    );
  }
  
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  
  return (
    <ScrollView className="flex-1 p-4">
      <PeriodSelector period={period} setPeriod={setPeriod} />
      
      {/* Workout Summary */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold mb-2">Workout Summary</Text>
          <Text className="mb-1">Workouts: {stats?.workoutCount || 0}</Text>
          <Text className="mb-1">Total Time: {formatDuration(stats?.totalDuration || 0)}</Text>
          <Text className="mb-1">Total Volume: {(stats?.totalVolume || 0).toLocaleString()} lb</Text>
        </CardContent>
      </Card>
      
      {/* Workout Frequency Chart */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold mb-2">Workout Frequency</Text>
          <WorkoutFrequencyChart />
        </CardContent>
      </Card>
      
      {/* Muscle Group Distribution */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold mb-2">Exercise Distribution</Text>
          <ExerciseDistributionChart />
        </CardContent>
      </Card>
      
      {/* Personal Records */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold mb-2">Personal Records</Text>
          {records.length === 0 ? (
            <Text className="text-muted-foreground text-center py-4">
              No personal records yet. Complete more workouts to see your progress.
            </Text>
          ) : (
            records.map((record) => (
              <View key={record.id} className="py-2 border-b border-border">
                <Text className="font-medium">{record.exerciseName}</Text>
                <Text>{record.value} {record.unit} × {record.reps} reps</Text>
                <Text className="text-muted-foreground text-sm">
                  {new Date(record.date).toLocaleDateString()}
                </Text>
                {record.previousRecord && (
                  <Text className="text-muted-foreground text-sm">
                    Previous: {record.previousRecord.value} {record.unit}
                  </Text>
                )}
              </View>
            ))
          )}
        </CardContent>
      </Card>
      
      {/* Note about future implementation */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Text className="text-muted-foreground text-center">
            Note: This is a placeholder UI. In the future, this tab will display real analytics based on your workout history.
          </Text>
        </CardContent>
      </Card>
    </ScrollView>
  );
}
