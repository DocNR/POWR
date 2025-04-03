# Progress Tab

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [Profile Tab Overview](../profile_overview.md), [Activity Tab](./activity_tab.md)

## Introduction

The Progress tab provides users with detailed analytics and visualizations of their workout progress over time. It offers period-based filtering, comprehensive workout statistics, and graphical representations of performance data. This tab serves as the central hub for tracking fitness improvements and identifying trends.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Period Filtering | ✅ Implemented | Filter analytics by week, month, year, or all time |
| Workout Summary | ✅ Implemented | Display key metrics like workout count, duration, and volume |
| Workout Frequency Chart | ✅ Implemented | Visualization of workout frequency by day of week |
| Exercise Distribution Chart | ✅ Implemented | Breakdown of exercise types and categories |
| Personal Records List | ✅ Implemented | Comprehensive list of personal records with comparisons |
| Nostr Integration Toggle | ✅ Implemented | Option to include or exclude Nostr workout data |
| Authentication Detection | ✅ Implemented | Login prompt for unauthenticated users |

## Implementation Details

The Progress tab is implemented in `app/(tabs)/profile/progress.tsx`. It integrates with the AnalyticsService to compute and display workout statistics and visualizations.

### Period Selector Implementation

The tab includes a period selector to filter data by time range:

```jsx
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
```

### Nostr Integration Toggle

The Progress tab allows users to include or exclude Nostr workout data in their analytics:

```jsx
{isAuthenticated && (
  <TouchableOpacity 
    onPress={() => setIncludeNostr(!includeNostr)}
    className="flex-row items-center"
  >
    <CloudIcon 
      size={16} 
      className={includeNostr ? "text-primary" : "text-muted-foreground"} 
    />
    <Text 
      className={`ml-1 text-sm ${includeNostr ? "text-primary" : "text-muted-foreground"}`}
    >
      Nostr
    </Text>
    <Switch 
      value={includeNostr} 
      onValueChange={setIncludeNostr}
      trackColor={{ false: '#767577', true: 'hsl(var(--purple))' }}
      thumbColor={'#f4f3f4'}
      className="ml-1"
    />
  </TouchableOpacity>
)}
```

### Workout Frequency Chart Implementation

The tab visualizes workout frequency by day of the week:

```jsx
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
```

### Exercise Distribution Chart Implementation

The tab also displays a breakdown of exercise types:

```jsx
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
```

### Analytics Integration

The Progress tab integrates with the AnalyticsService to fetch workout statistics:

```jsx
// Load workout statistics when period or includeNostr changes
useEffect(() => {
  async function loadStats() {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      
      // Pass includeNostr flag to analytics service
      analyticsService.setIncludeNostr(includeNostr);
      
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
}, [isAuthenticated, period, includeNostr, analytics]);
```

## Technical Considerations

### Authentication Handling

Like other profile tabs, the Progress tab handles authentication with a consistent pattern:

```jsx
if (!isAuthenticated) {
  return <NostrProfileLogin message="Login with your Nostr private key to view your progress." />;
}
```

### Data Loading

The component manages loading states and provides appropriate UI feedback:

```jsx
if (loading) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator />
    </View>
  );
}
```

### Nostr Integration Indicator

The tab visually indicates when Nostr data is included in the analytics:

```jsx
{/* Nostr integration note */}
{isAuthenticated && includeNostr && (
  <Card className="mb-4 border-primary">
    <CardContent className="p-4 flex-row items-center">
      <CloudIcon size={16} className="text-primary mr-2" />
      <Text className="text-muted-foreground flex-1">
        Analytics include workouts from Nostr. Toggle the switch above to view only local workouts.
      </Text>
    </CardContent>
  </Card>
)}
```

### Helper Functions

The tab includes helper functions such as formatDuration for consistent data presentation:

```jsx
// Format duration in hours and minutes
function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
```

## User Experience Flow

1. **Authentication Check**:
   - If user is not authenticated, display NostrProfileLogin component
   - If authenticated, proceed to load progress data

2. **Period Selection**:
   - User selects desired time period for analysis (week, month, year, all)
   - Analytics are recalculated and displayed based on selection

3. **Nostr Toggle**:
   - User can toggle inclusion of Nostr workout data in analytics
   - UI updates to indicate when Nostr data is included

4. **Data Display**:
   - Show workout summary statistics
   - Display visualizations for workout frequency and exercise distribution
   - List personal records with previous values for comparison

## Future Enhancements

1. **Enhanced Visualizations**: More sophisticated chart types for deeper analysis
2. **Goal Setting**: Allow users to set and track fitness goals
3. **Progress Trends**: Show improvement trends over time for key metrics
4. **Body Measurements**: Add tracking for weight, body measurements, and photos
5. **Export Functionality**: Allow users to export analytics data
6. **Custom Time Periods**: Enable custom date range selection

## Related Documentation

- [Profile Overview](../profile_overview.md) - General overview of the Profile tab
- [Activity Tab](./activity_tab.md) - Documentation for the activity summary tab
- [Analytics Service](../../../technical/analytics/index.md) - Details on workout analytics implementation
- [Progress Tracking](../progress_tracking.md) - Documentation for progress tracking methodology
