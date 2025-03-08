// app/(tabs)/history/calendar.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSQLiteContext } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { format, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WorkoutHistoryService } from '@/lib/db/services/WorkoutHIstoryService';
import WorkoutCard from '@/components/workout/WorkoutCard';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';

// Add custom styles for 1/7 width (for calendar days)
const styles = {
  calendarDay: "w-[14.28%]"
};

// Week days for the calendar view - Fixed the duplicate key issue
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export default function CalendarScreen() {
  const db = useSQLiteContext();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [useMockData, setUseMockData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Initialize workout history service
  const workoutHistoryService = React.useMemo(() => new WorkoutHistoryService(db), [db]);
  
  // Load workouts function
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
  
  // Initial load workouts
  useEffect(() => {
    loadWorkouts();
  }, [workoutHistoryService]);
  
  // Pull to refresh handler
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadWorkouts();
  }, []);
  
  // Load workout dates for selected month
  useEffect(() => {
    const getWorkoutDatesForMonth = async () => {
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        
        let dates: Date[] = [];
        
        // If we're using mock data, filter from mock workouts
        if (useMockData) {
          dates = workouts
            .filter(workout => {
              const date = new Date(workout.startTime);
              return date.getFullYear() === year && date.getMonth() === month;
            })
            .map(workout => new Date(workout.startTime));
        } else {
          // Try to use the service method if it exists and table exists
          try {
            if (typeof workoutHistoryService.getWorkoutDatesInMonth === 'function') {
              dates = await workoutHistoryService.getWorkoutDatesInMonth(year, month);
            } else {
              // Otherwise filter from loaded workouts
              dates = workouts
                .filter(workout => {
                  const date = new Date(workout.startTime);
                  return date.getFullYear() === year && date.getMonth() === month;
                })
                .map(workout => new Date(workout.startTime));
            }
          } catch (error) {
            console.error('Error getting workout dates:', error);
            // If table doesn't exist, use empty array
            dates = [];
          }
        }
        
        // Convert to strings for the Set
        const dateStrings = dates.map(date => format(date, 'yyyy-MM-dd'));
        setWorkoutDates(new Set(dateStrings));
      } catch (error) {
        console.error('Error getting workout dates:', error);
        setWorkoutDates(new Set());
      }
    };
    
    getWorkoutDatesForMonth();
  }, [selectedMonth, workouts, workoutHistoryService, useMockData]);
  
  // Get dates for current month's calendar
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days: (Date | null)[] = [];
    let day = 1;
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1; // Convert to Monday-based
    
    // Add empty days for the beginning of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    while (date.getMonth() === month) {
      days.push(new Date(year, month, day));
      day++;
      date.setDate(day);
    }
    
    return days;
  };
  
  const daysInMonth = getDaysInMonth(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth()
  );
  
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  
  // Check if a date has workouts
  const hasWorkout = (date: Date | null) => {
    if (!date) return false;
    return workoutDates.has(format(date, 'yyyy-MM-dd'));
  };
  
  // Handle date selection in calendar
  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date);
  };
  
  // Get workouts for selected date
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<Workout[]>([]);
  const [loadingDateWorkouts, setLoadingDateWorkouts] = useState(false);
  
  useEffect(() => {
    const loadWorkoutsForDate = async () => {
      try {
        setLoadingDateWorkouts(true);
        
        if (useMockData) {
          // Use mock data filtering
          const filtered = workouts.filter(workout => 
            isSameDay(new Date(workout.startTime), selectedDate)
          );
          setSelectedDateWorkouts(filtered);
        } else {
          try {
            if (typeof workoutHistoryService.getWorkoutsByDate === 'function') {
              // Use the service method if available
              const dateWorkouts = await workoutHistoryService.getWorkoutsByDate(selectedDate);
              setSelectedDateWorkouts(dateWorkouts);
            } else {
              // Fall back to filtering the already loaded workouts
              const filtered = workouts.filter(workout => 
                isSameDay(new Date(workout.startTime), selectedDate)
              );
              setSelectedDateWorkouts(filtered);
            }
          } catch (error) {
            // Handle the case where the workout table doesn't exist
            console.error('Error loading workouts for date:', error);
            setSelectedDateWorkouts([]);
          }
        }
      } catch (error) {
        console.error('Error loading workouts for date:', error);
        setSelectedDateWorkouts([]);
      } finally {
        setLoadingDateWorkouts(false);
      }
    };
    
    loadWorkoutsForDate();
  }, [selectedDate, workouts, workoutHistoryService, useMockData]);
  
  return (
    <View className="flex-1 bg-background">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {useMockData && (
            <View className="bg-primary/5 rounded-lg p-4 mb-4 border border-border">
              <Text className="text-muted-foreground text-sm">
                Showing example data. Your completed workouts will appear here.
              </Text>
            </View>
          )}
          
          {/* Calendar section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Calendar size={20} className="text-primary mr-2" />
              <Text className="text-lg font-semibold">Workout Calendar</Text>
            </View>
            
            <Card>
              <CardContent className="p-4">
                {/* Month navigation */}
                <View className="flex-row justify-between items-center mb-4">
                  <TouchableOpacity
                    onPress={goToPreviousMonth}
                    className="p-2 rounded-full bg-muted"
                  >
                    <ChevronLeft size={20} className="text-foreground" />
                  </TouchableOpacity>
                  
                  <Text className="text-foreground text-lg font-semibold">
                    {format(selectedMonth, 'MMMM yyyy')}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={goToNextMonth}
                    className="p-2 rounded-full bg-muted"
                  >
                    <ChevronRight size={20} className="text-foreground" />
                  </TouchableOpacity>
                </View>
                
                {/* Week days header - Fixed with unique keys */}
                <View className="flex-row mb-2">
                  {WEEK_DAYS.map(day => (
                    <View key={day} className={styles.calendarDay}>
                      <Text className="text-center text-muted-foreground font-medium">
                        {day.charAt(0)}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {/* Calendar grid */}
                <View className="flex-row flex-wrap">
                  {daysInMonth.map((date, index) => (
                    <Pressable
                      key={`day-${index}`}
                      className={styles.calendarDay}
                      onPress={() => date && handleDateSelect(date)}
                    >
                      <View className="aspect-square items-center justify-center">
                        {date ? (
                          <View 
                            className={cn(
                              "w-8 h-8 rounded-full items-center justify-center",
                              isSameDay(date, selectedDate) && !hasWorkout(date) && "bg-muted",
                              hasWorkout(date) && "bg-primary",
                              isSameDay(date, new Date()) && !hasWorkout(date) && !isSameDay(date, selectedDate) && "border border-primary"
                            )}
                          >
                            <Text 
                              className={cn(
                                "text-foreground",
                                hasWorkout(date) && "text-primary-foreground font-medium"
                              )}
                            >
                              {date.getDate()}
                            </Text>
                          </View>
                        ) : (
                          <View className="w-8 h-8" />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              </CardContent>
            </Card>
          </View>
          
          {/* Selected date workouts */}
          <View className="mb-4">
            <Text className="text-foreground text-xl font-semibold mb-4">
              {format(selectedDate, 'MMMM d, yyyy')}
            </Text>
            
            {isLoading || loadingDateWorkouts ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="large" className="mb-4" />
                <Text className="text-muted-foreground">Loading workouts...</Text>
              </View>
            ) : selectedDateWorkouts.length === 0 ? (
              <View className="items-center justify-center py-10">
                <Text className="text-muted-foreground">No workouts on this date</Text>
                {!useMockData && (
                  <Text className="text-muted-foreground mt-2 text-center">
                    Complete a workout on this day to see it here
                  </Text>
                )}
              </View>
            ) : (
              <View>
                {selectedDateWorkouts.map(workout => (
                  <WorkoutCard 
                    key={workout.id} 
                    workout={workout}
                    showDate={false}
                    showExercises={true}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
        
        {/* Add bottom padding for better scrolling experience */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}