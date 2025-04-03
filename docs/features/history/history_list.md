# History List View

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [History Overview](./history_overview.md), [Calendar View](./calendar_view.md)

## Introduction

The History List View is the primary interface for browsing workout history in the POWR app. It presents a chronological feed of completed workouts grouped by month, with detailed cards showing workout information and exercise summaries.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Chronological Feed | ✅ Implemented | Displays workouts in reverse chronological order |
| Monthly Grouping | ✅ Implemented | Organizes workouts by month for better context |
| Workout Source Filtering | ✅ Implemented | Toggle between all or local-only workouts |
| Nostr Authentication UI | ✅ Implemented | Prompt for unauthenticated users |
| Workout Cards | ✅ Implemented | Detailed workout summary cards |
| Pull-to-refresh | ✅ Implemented | Updates list with latest workout data |
| Visual Styling | ✅ Implemented | Consistent visual design with the app |
| Offline Support | ✅ Implemented | Works with locally cached workout data |
| Mock Data | ✅ Implemented | Example data shown when no workouts exist |

## Implementation Details

The History List View is implemented as a screen component in `app/(tabs)/history/workoutHistory.tsx`. It integrates with the unified workout history service through the `useWorkoutHistory` hook.

### Data Structure

Workouts are organized into a hierarchical structure:

1. **Monthly Groups**: Workouts are first grouped by month (e.g., "MARCH 2025")
2. **Workout Cards**: Each workout is displayed as a card within its month group
3. **Exercise Summaries**: Each card displays a summary of exercises performed

This organization provides users with temporal context while browsing their history.

### Source Filtering

For authenticated users, the History List View provides a toggle to filter workouts by source:

```typescript
// Source filtering UI
<View className="flex-row border border-border rounded-full overflow-hidden">
  <Pressable
    onPress={() => setIncludeNostr(true)}
    style={{
      backgroundColor: includeNostr ? primaryBgColor : 'transparent',
      paddingHorizontal: 12,
      paddingVertical: 6,
    }}
  >
    <Text style={{ 
      color: includeNostr ? primaryTextColor : mutedTextColor,
      fontSize: 14,
      fontWeight: includeNostr ? '600' : '400',
    }}>
      All Workouts
    </Text>
  </Pressable>
  
  <Pressable
    onPress={() => setIncludeNostr(false)}
    style={{
      backgroundColor: !includeNostr ? primaryBgColor : 'transparent',
      paddingHorizontal: 12,
      paddingVertical: 6,
    }}
  >
    <Text style={{ 
      color: !includeNostr ? primaryTextColor : mutedTextColor,
      fontSize: 14,
      fontWeight: !includeNostr ? '600' : '400',
    }}>
      Local Only
    </Text>
  </Pressable>
</View>
```

This filtering is implemented at the service level through the `useWorkoutHistory` hook:

```typescript
// Create memoized filters to prevent recreation on every render
const filters = React.useMemo(() => {
  if (includeNostr) {
    return undefined;
  } else {
    // Explicitly type the array to match WorkoutFilters interface
    return { source: ['local' as const] };
  }
}, [includeNostr]);

// Use the unified workout history hook with filters
const { 
  workouts: allWorkouts, 
  loading, 
  refreshing: hookRefreshing,
  refresh,
  error
} = useWorkoutHistory({
  includeNostr,
  filters,
  realtime: true
});
```

### Month Grouping

Workouts are grouped by month using a helper function:

```typescript
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
```

The results are then rendered as section headers with workout cards:

```typescript
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
```

### Nostr Authentication Prompt

For unauthenticated users, the History List View displays a prompt to login with Nostr:

```typescript
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
```

## Mock Data Integration

When no workouts are available (typically for new users), the History List View provides example data to demonstrate the interface:

```typescript
// Check if we need to use mock data (empty workouts)
if (allWorkouts.length === 0 && !error) {
  console.log('No workouts found, using mock data');
  setWorkouts(mockWorkouts);
  setUseMockData(true);
} else {
  setWorkouts(allWorkouts);
  setUseMockData(false);
}

// And show a message when using mock data
{useMockData && (
  <View className="bg-primary/5 rounded-lg p-4 mb-4 border border-border">
    <Text className="text-muted-foreground text-sm">
      Showing example data. Your completed workouts will appear here.
    </Text>
  </View>
)}
```

## Technical Considerations

### Performance Optimization

The History List View includes several optimizations:

- Memoization of filter objects to prevent unnecessary re-renders
- Careful state updates to avoid cascading re-renders
- Efficient grouping algorithm for workout organization
- Virtualized lists for large workout histories

### Error Handling

Robust error handling ensures a smooth user experience:

- Empty state handling for no workouts
- Loading indicators during data fetching
- Error recovery with fallback to local data
- Clear feedback when using mock data

## Interaction with Calendar View

The History List View works in conjunction with the Calendar View through the Material Top Tab Navigator:

```typescript
const Tab = createMaterialTopTabNavigator();

export default function HistoryLayout() {
  return (
    <TabScreen>
      <Header useLogo={true} showNotifications={true} />

      <Tab.Navigator
        initialRouteName="workouts"
        screenOptions={{...}}
      >
        <Tab.Screen
          name="workouts"
          component={HistoryScreen}
          options={{ title: 'History' }}
        />
        <Tab.Screen
          name="calendar"
          component={CalendarScreen}
          options={{ title: 'Calendar' }}
        />
      </Tab.Navigator>
    </TabScreen>
  );
}
```

This integration provides users with multiple ways to view their workout history based on their preference.

## Usage Example

```typescript
// History List core implementation
const HistoryScreen = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const [includeNostr, setIncludeNostr] = useState(true);
  
  // Use the unified workout history hook
  const { 
    workouts: allWorkouts, 
    loading, 
    refresh
  } = useWorkoutHistory({
    includeNostr,
    filters: includeNostr ? undefined : { source: ['local'] },
    realtime: true
  });
  
  // Group workouts by month
  const groupedWorkouts = groupWorkoutsByMonth(workouts);
  
  return (
    <ScrollView 
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} />
      }
    >
      {/* Authentication UI */}
      {/* Source filtering */}
      {/* Grouped workout list */}
    </ScrollView>
  );
};
```

## Future Enhancements

Planned improvements for the History List View:

1. **Advanced Search**: Full-text search across workout titles, exercises, and notes
2. **Additional Filtering**: More granular filtering by exercise type, duration, and intensity
3. **Batch Operations**: Multi-select and bulk actions for workouts
4. **Expanded Exercise Details**: More detailed exercise information in workout cards
5. **Social Sharing**: Direct sharing of workouts to social media or messaging apps
6. **Stats Summary**: Monthly workout statistics summary at the top of each month group

## Related Documentation

- [History Overview](./history_overview.md) - Overview of the History tab features and architecture
- [Calendar View](./calendar_view.md) - Details on the calendar visualization
- [Workout Cards](../workout/ui_components.md) - Information on workout card components
- [Migration Guide](./migration_guide.md) - Guide for migrating to the unified history service
