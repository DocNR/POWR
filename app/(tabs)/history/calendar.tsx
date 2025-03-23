// app/(tabs)/history/calendar.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Pressable, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSQLiteContext } from 'expo-sqlite';
import { Workout } from '@/types/workout';
import { format, isSameDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import WorkoutCard from '@/components/workout/WorkoutCard';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { useWorkoutHistory } from '@/lib/hooks/useWorkoutHistory';

// Add custom styles for 1/7 width (for calendar days)
const styles = {
  calendarDay: "w-[14.28%]"
};

// Week days for the calendar view - Fixed the duplicate key issue
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Define colors for icons and styling
const primaryColor = "#8b5cf6"; // Purple color
const mutedColor = "#9ca3af"; // Gray color
const primaryBgColor = "rgba(139, 92, 246, 0.2)"; // Semi-transparent purple for date highlights

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
  
  const { isAuthenticated } = useNDKCurrentUser();
  const [includeNostr, setIncludeNostr] = useState(true);
  
  // Use the unified workout history hook
  const { 
    workouts: allWorkouts, 
    loading, 
    refresh, 
    getWorkoutsByDate,
    service: workoutHistoryService
  } = useWorkoutHistory({
    includeNostr: includeNostr,
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
      if (allWorkouts.length === 0) {
        console.log('No workouts found, using mock data');
        setWorkouts(mockWorkouts);
        setUseMockData(true);
      } else {
        setUseMockData(false);
      }
    }
  }, [allWorkouts, loading]);
  
  // Pull to refresh handler
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refresh();
  }, [refresh]);
  
  // Load workout dates for the selected month
  useEffect(() => {
    const loadDatesForMonth = async () => {
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
          // Use the service to get dates
          dates = await workoutHistoryService.getWorkoutDatesInMonth(year, month);
          
          // Also check all workouts manually as a fallback
          const manualDates = allWorkouts
            .filter(workout => {
              const date = new Date(workout.startTime);
              return date.getFullYear() === year && date.getMonth() === month;
            })
            .map(workout => new Date(workout.startTime));
          
          // Combine both sets of dates
          dates = [...dates, ...manualDates];
        }
        
        // Convert to strings for the Set
        const dateStrings = dates.map(date => format(date, 'yyyy-MM-dd'));
        console.log(`Found ${dateStrings.length} workout dates for ${year}-${month+1}:`, dateStrings);
        setWorkoutDates(new Set(dateStrings));
      } catch (error) {
        console.error('Error getting workout dates:', error);
        setWorkoutDates(new Set());
      }
    };
    
    loadDatesForMonth();
  }, [selectedMonth, workouts, allWorkouts, workoutHistoryService, useMockData]);
  
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
    const dateString = format(date, 'yyyy-MM-dd');
    const result = workoutDates.has(dateString);
    console.log(`Checking if ${dateString} has workouts: ${result}`);
    return result;
  };
  
  // Handle date selection in calendar
  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date);
  };
  
  // Get workouts for the selected date
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<Workout[]>([]);
  const [loadingDateWorkouts, setLoadingDateWorkouts] = useState(false);
  
  useEffect(() => {
    const loadWorkoutsForDate = async () => {
      try {
        setLoadingDateWorkouts(true);
        console.log(`Loading workouts for date: ${format(selectedDate, 'yyyy-MM-dd')}`);
        
        if (useMockData) {
          // Use mock data filtering
          const filtered = workouts.filter(workout => 
            isSameDay(new Date(workout.startTime), selectedDate)
          );
          console.log(`Found ${filtered.length} mock workouts for selected date`);
          setSelectedDateWorkouts(filtered);
        } else {
          // Use the hook's getWorkoutsByDate method
          console.log('Calling getWorkoutsByDate...');
          const dateWorkouts = await getWorkoutsByDate(selectedDate);
          console.log(`getWorkoutsByDate returned ${dateWorkouts.length} workouts`);
          
          // If no workouts found, try filtering from all workouts as a fallback
          if (dateWorkouts.length === 0 && allWorkouts.length > 0) {
            console.log('No workouts found with getWorkoutsByDate, trying manual filtering');
            const filtered = allWorkouts.filter(workout => 
              isSameDay(new Date(workout.startTime), selectedDate)
            );
            console.log(`Found ${filtered.length} workouts by manual filtering`);
            setSelectedDateWorkouts(filtered);
          } else {
            setSelectedDateWorkouts(dateWorkouts);
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
  }, [selectedDate, workouts, allWorkouts, getWorkoutsByDate, useMockData]);
  
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
              <Calendar size={20} color={primaryColor} style={{ marginRight: 8 }} />
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
                    <ChevronLeft size={20} color={mutedColor} />
                  </TouchableOpacity>
                  
                  <Text className="text-foreground text-lg font-semibold">
                    {format(selectedMonth, 'MMMM yyyy')}
                  </Text>
                  
                  <TouchableOpacity
                    onPress={goToNextMonth}
                    className="p-2 rounded-full bg-muted"
                  >
                    <ChevronRight size={20} color={mutedColor} />
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
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20, // Make it a perfect circle
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isSameDay(date, selectedDate) 
                                ? (hasWorkout(date) ? primaryColor : '#f3f4f6') // Selected date
                                : (hasWorkout(date) ? primaryBgColor : 'transparent'), // Date with workout
                              borderWidth: isSameDay(date, new Date()) && !hasWorkout(date) && !isSameDay(date, selectedDate) ? 2 : 0,
                              borderColor: primaryColor,
                              // Remove shadow effects that might be causing the weird shape
                              shadowColor: 'transparent',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0,
                              shadowRadius: 0,
                              elevation: 0
                            }}
                          >
                            <Text 
                              style={{
                                color: isSameDay(date, selectedDate) && hasWorkout(date) 
                                  ? '#ffffff' // White text for selected date with workout
                                  : (hasWorkout(date) ? primaryColor : '#374151'), // Purple text for dates with workouts
                                fontWeight: hasWorkout(date) ? '600' : 'normal'
                              }}
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
