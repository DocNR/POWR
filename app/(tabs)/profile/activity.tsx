// app/(tabs)/profile/activity.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import { useRouter } from 'expo-router';
import { useAnalytics } from '@/lib/hooks/useAnalytics';
import { PersonalRecord } from '@/lib/services/AnalyticsService';
import { formatDistanceToNow } from 'date-fns';
import { useWorkouts } from '@/lib/hooks/useWorkouts';
import { useTemplates } from '@/lib/hooks/useTemplates';
import WorkoutCard from '@/components/workout/WorkoutCard';
import { Dumbbell, BarChart2, Award, Calendar } from 'lucide-react-native';

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useNDKCurrentUser();
  const analytics = useAnalytics();
  const { workouts, loading: workoutsLoading } = useWorkouts();
  const { templates, loading: templatesLoading } = useTemplates();
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stats
  const completedWorkouts = workouts?.filter(w => w.isCompleted)?.length || 0;
  const totalTemplates = templates?.length || 0;
  const totalPrograms = 0; // Placeholder for programs count
  
  // Load personal records
  useEffect(() => {
    async function loadRecords() {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        const personalRecords = await analytics.getPersonalRecords(undefined, 3);
        setRecords(personalRecords);
      } catch (error) {
        console.error('Error loading personal records:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadRecords();
  }, [isAuthenticated, analytics]);
  
  // Show different UI when not authenticated
  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-muted-foreground mb-8">
          Login with your Nostr private key to view your activity and stats.
        </Text>
        <Button 
          onPress={() => setIsLoginSheetOpen(true)}
          className="px-6"
        >
          <Text className="text-white">Login with Nostr</Text>
        </Button>
        
        {/* NostrLoginSheet */}
        <NostrLoginSheet 
          open={isLoginSheetOpen} 
          onClose={() => setIsLoginSheetOpen(false)} 
        />
      </View>
    );
  }
  
  if (loading || workoutsLoading || templatesLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  
  return (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{
        paddingBottom: insets.bottom + 20
      }}
    >
      {/* Stats Cards - Row 1 */}
      <View className="flex-row px-4 pt-4">
        <View className="flex-1 pr-2">
          <Card>
            <CardContent className="p-4 items-center justify-center">
              <Dumbbell size={24} className="text-primary mb-2" />
              <Text className="text-2xl font-bold">{completedWorkouts}</Text>
              <Text className="text-muted-foreground">Workouts</Text>
            </CardContent>
          </Card>
        </View>
        
        <View className="flex-1 pl-2">
          <Card>
            <CardContent className="p-4 items-center justify-center">
              <Calendar size={24} className="text-primary mb-2" />
              <Text className="text-2xl font-bold">{totalTemplates}</Text>
              <Text className="text-muted-foreground">Templates</Text>
            </CardContent>
          </Card>
        </View>
      </View>
      
      {/* Stats Cards - Row 2 */}
      <View className="flex-row px-4 pt-4 mb-4">
        <View className="flex-1 pr-2">
          <Card>
            <CardContent className="p-4 items-center justify-center">
              <BarChart2 size={24} className="text-primary mb-2" />
              <Text className="text-2xl font-bold">{totalPrograms}</Text>
              <Text className="text-muted-foreground">Programs</Text>
            </CardContent>
          </Card>
        </View>
        
        <View className="flex-1 pl-2">
          <Card>
            <CardContent className="p-4 items-center justify-center">
              <Award size={24} className="text-primary mb-2" />
              <Text className="text-2xl font-bold">{records.length}</Text>
              <Text className="text-muted-foreground">PRs</Text>
            </CardContent>
          </Card>
        </View>
      </View>

      {/* Personal Records */}
      <Card className="mx-4 mb-4">
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold">Personal Records</Text>
            <Pressable onPress={() => router.push('/profile/progress')}>
              <Text className="text-primary">View All</Text>
            </Pressable>
          </View>
          
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
                  {formatDistanceToNow(new Date(record.date), { addSuffix: true })}
                </Text>
              </View>
            ))
          )}
        </CardContent>
      </Card>
      
      {/* Recent Workouts */}
      <Card className="mx-4 mb-4">
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold">Recent Workouts</Text>
            <Pressable onPress={() => router.push('/history/workoutHistory')}>
              <Text className="text-primary">View All</Text>
            </Pressable>
          </View>
          
          {workouts && workouts.length > 0 ? (
            workouts
              .filter(workout => workout.isCompleted)
              .slice(0, 2)
              .map(workout => (
                <View key={workout.id} className="mb-3">
                  <WorkoutCard 
                    workout={workout} 
                    showDate={true}
                    showExercises={false}
                  />
                </View>
              ))
          ) : (
            <Text className="text-muted-foreground text-center py-4">
              No recent workouts. Complete a workout to see it here.
            </Text>
          )}
        </CardContent>
      </Card>
      
      {/* Quick Actions */}
      <View className="p-4 gap-2">
        <Button 
          variant="purple" 
          className="mb-2"
          onPress={() => router.push('/')}
        >
          <Text className="text-white">Start a Workout</Text>
        </Button>
        <Button 
          variant="outline" 
          className="mb-2"
          onPress={() => router.push('/profile/progress')}
        >
          <Text>View Progress</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
