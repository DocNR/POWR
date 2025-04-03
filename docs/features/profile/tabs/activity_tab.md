# Activity Tab

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [Profile Tab Overview](../profile_overview.md), [Progress Tab](./progress_tab.md)

## Introduction

The Activity tab provides users with a summary of their workout activities, including statistics, recent workouts, and personal records. It serves as a quick overview dashboard for tracking workout progress and achievements.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Workout Stats Cards | ✅ Implemented | Shows completed workouts, templates, programs, and PRs |
| Personal Records | ✅ Implemented | Lists recent personal records with dates |
| Recent Workouts | ✅ Implemented | Shows most recent completed workouts |
| Quick Action Buttons | ✅ Implemented | Navigation to start workout and view progress |
| Authentication Detection | ✅ Implemented | Login prompt for unauthenticated users |
| Integration with Analytics | ✅ Implemented | Uses AnalyticsService for workout statistics |

## Implementation Details

The Activity tab is implemented in `app/(tabs)/profile/activity.tsx`. It integrates with the AnalyticsService for personal records and the WorkoutService for workout history.

### Stats Cards Implementation

The Activity tab displays four key statistics in card format:

```jsx
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
```

### Personal Records Implementation

The Activity tab displays the user's personal records:

```jsx
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
```

### Recent Workouts Implementation

The tab also shows the user's most recent completed workouts:

```jsx
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
```

### Analytics Integration

The Activity tab integrates with the AnalyticsService to display personal records:

```jsx
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
```

## Technical Considerations

### Authentication Handling

Like other profile tabs, the Activity tab handles authentication with a consistent pattern:

```jsx
// Show different UI when not authenticated
if (!isAuthenticated) {
  return <NostrProfileLogin message="Login with your Nostr private key to view your activity and stats." />;
}
```

### Data Loading

The component manages loading states and provides appropriate UI feedback:

```jsx
if (loading || workoutsLoading || templatesLoading) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator />
    </View>
  );
}
```

### Hook Dependencies

The component carefully manages effect hook dependencies to prevent unnecessary re-renders:

```jsx
useEffect(() => {
  async function loadRecords() {
    // ...implementation
  }
  
  loadRecords();
}, [isAuthenticated, analytics]); // Only rerun when these dependencies change
```

## User Experience Flow

1. **Authentication Check**:
   - If user is not authenticated, display NostrProfileLogin component
   - If authenticated, proceed to load activity data

2. **Data Loading**:
   - Fetch completed workouts count from WorkoutService
   - Load templates count from TemplateService
   - Fetch personal records from AnalyticsService
   - Show loading indicator during data fetch

3. **Data Display**:
   - Show stats cards with summary numbers
   - Display recent personal records with details
   - Show recent completed workouts with WorkoutCard component
   - Provide quick action buttons for common tasks

4. **Navigation Options**:
   - "View All" links to relevant detailed screens (Progress, History)
   - Quick action buttons for starting a workout or viewing progress

## Future Enhancements

1. **Programs Integration**: Complete implementation of programs count when feature is available
2. **Additional Stats**: Add more workout statistics like total volume, duration
3. **Enhanced Personal Records**: Add visual indicators for progress trends
4. **Streak Tracking**: Add workout streak and consistency metrics
5. **Workout Insights**: Add AI-generated insights based on workout patterns

## Related Documentation

- [Profile Overview](../profile_overview.md) - General overview of the Profile tab
- [Progress Tab](./progress_tab.md) - Documentation for the detailed progress tracking tab
- [Analytics Service](../../../technical/analytics/index.md) - Details on workout analytics implementation
- [WorkoutCard Component](../../../components/workout_card.md) - Documentation for the WorkoutCard component used in this tab
