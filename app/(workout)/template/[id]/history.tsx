// app/(workout)/template/[id]/history.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react-native';
import { useTemplate } from './_templateContext';

// Format date helper
const formatDate = (date: Date) => {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Mock workout history - this would come from your database in a real app
const mockWorkoutHistory = [
  {
    id: 'hist1',
    date: new Date(2024, 1, 25),
    duration: 62, // minutes
    completed: true,
    notes: "Increased weight on squats by 10lbs",
    exercises: [
      { name: "Barbell Squat", sets: 3, reps: 8, weight: 215 },
      { name: "Bench Press", sets: 3, reps: 8, weight: 175 },
      { name: "Bent Over Row", sets: 3, reps: 8, weight: 155 }
    ]
  },
  {
    id: 'hist2',
    date: new Date(2024, 1, 18),
    duration: 58, // minutes
    completed: true,
    exercises: [
      { name: "Barbell Squat", sets: 3, reps: 8, weight: 205 },
      { name: "Bench Press", sets: 3, reps: 8, weight: 175 },
      { name: "Bent Over Row", sets: 3, reps: 8, weight: 155 }
    ]
  },
  {
    id: 'hist3',
    date: new Date(2024, 1, 11),
    duration: 65, // minutes
    completed: false,
    notes: "Stopped early due to time constraints",
    exercises: [
      { name: "Barbell Squat", sets: 3, reps: 8, weight: 205 },
      { name: "Bench Press", sets: 3, reps: 8, weight: 170 },
      { name: "Bent Over Row", sets: 2, reps: 8, weight: 150 }
    ]
  }
];

export default function HistoryTab() {
  const template = useTemplate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulate loading history data
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoading(false);
    };
    
    loadHistory();
  }, [template.id]);
  
  return (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 p-4">
        {/* Performance Summary */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Performance Summary</Text>
          <Card className="bg-card">
            <CardContent className="p-4">
              <View className="flex-row justify-between">
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Total Workouts</Text>
                  <Text className="text-xl font-semibold">{mockWorkoutHistory.length}</Text>
                </View>
                
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Avg Duration</Text>
                  <Text className="text-xl font-semibold">
                    {Math.round(mockWorkoutHistory.reduce((acc, w) => acc + w.duration, 0) / mockWorkoutHistory.length)} min
                  </Text>
                </View>
                
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Completion</Text>
                  <Text className="text-xl font-semibold">
                    {Math.round(mockWorkoutHistory.filter(w => w.completed).length / mockWorkoutHistory.length * 100)}%
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      
        {/* History List */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Workout History</Text>
          
          {isLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="small" className="mb-2" />
              <Text className="text-muted-foreground">Loading history...</Text>
            </View>
          ) : mockWorkoutHistory.length > 0 ? (
            <View className="gap-4">
              {mockWorkoutHistory.map((workout) => (
                <Card key={workout.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <View className="flex-row justify-between mb-2">
                      <Text className="font-semibold">{formatDate(workout.date)}</Text>
                      <Badge variant={workout.completed ? "default" : "outline"}>
                        <Text>{workout.completed ? "Completed" : "Incomplete"}</Text>
                      </Badge>
                    </View>
                    
                    <View className="flex-row justify-between mb-3">
                      <View>
                        <Text className="text-xs text-muted-foreground">Duration</Text>
                        <Text className="text-sm">{workout.duration} min</Text>
                      </View>
                      
                      <View>
                        <Text className="text-xs text-muted-foreground">Sets</Text>
                        <Text className="text-sm">
                          {workout.exercises.reduce((acc, ex) => acc + ex.sets, 0)}
                        </Text>
                      </View>
                      
                      <View>
                        <Text className="text-xs text-muted-foreground">Volume</Text>
                        <Text className="text-sm">
                          {workout.exercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0)} lbs
                        </Text>
                      </View>
                    </View>
                    
                    {workout.notes && (
                      <Text className="text-sm text-muted-foreground mb-3">
                        {workout.notes}
                      </Text>
                    )}
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <Text>View Details</Text>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : (
            <View className="bg-muted p-8 rounded-lg items-center justify-center">
              <Calendar size={24} className="text-muted-foreground mb-2" />
              <Text className="text-muted-foreground text-center">
                No workout history available yet
              </Text>
              <Text className="text-sm text-muted-foreground text-center mt-1">
                Complete a workout using this template to see your history
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}