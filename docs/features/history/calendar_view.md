# Calendar View

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [History Overview](./history_overview.md), [Workout Data Models](../workout/data_models.md)

## Introduction

The Calendar View in the History tab provides users with a date-based visualization of their workout history. It displays a monthly calendar grid with highlights for days that have recorded workouts, making it easy to track workout consistency and patterns over time.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Monthly Calendar | ✅ Implemented | Interactive monthly grid with navigation |
| Date Highlighting | ✅ Implemented | Visual indicators for dates with workouts |
| Date Selection | ✅ Implemented | Tap to view workouts for a specific date |
| Workout List | ✅ Implemented | Filtered workout list for selected date |
| Pull-to-refresh | ✅ Implemented | Updates calendar with latest workout data |
| Visual Styling | ✅ Implemented | Color-coded highlights based on workout status |
| Offline Support | ✅ Implemented | Works with locally cached workout data |
| Mock Data | ✅ Implemented | Example data shown when no workouts exist |

## Calendar Implementation

The Calendar View is implemented as a standalone tab within the History section, accessible through the Material Top Tab Navigator.

### Monthly Grid

The calendar displays a traditional monthly grid with:
- Week day headers (Mon-Sun)
- Date cells arranged in weeks
- Navigation controls for moving between months
- Visual indicators for:
  - Current date
  - Selected date
  - Dates with workouts

### Date Highlighting Logic

Dates in the calendar are highlighted with different visual styles:

```typescript
// Date with workout + selected
{
  backgroundColor: primaryColor, // Solid purple
  color: '#ffffff'               // White text
}

// Date with workout (not selected)
{
  backgroundColor: primaryBgColor, // Semi-transparent purple
  color: primaryColor              // Purple text
}

// Current date (no workout)
{
  borderWidth: 2,
  borderColor: primaryColor,
  backgroundColor: 'transparent'
}

// Selected date (no workout)
{
  backgroundColor: '#f3f4f6', // Light gray
  color: '#374151'            // Dark text
}

// Regular date
{
  backgroundColor: 'transparent',
  color: '#374151'
}
```

### Workout Date Detection

The calendar uses a multi-layered approach to detect dates with workouts:

1. **Primary Method**: Using the `getWorkoutDatesInMonth` service method to efficiently query the database for all workout dates in the selected month
2. **Fallback Method**: Manual filtering of loaded workouts for the selected month as a backup

This dual approach ensures high reliability when finding workout dates, even if database queries are incomplete.

## Workouts by Date

When a date is selected in the calendar, the view displays a list of workouts for that day:

1. The date is stored in component state: `setSelectedDate(date)`
2. The `getWorkoutsByDate` method is called to fetch workouts for that date
3. A fallback filter is applied if needed: `allWorkouts.filter(workout => isSameDay(new Date(workout.startTime), selectedDate))`
4. Workouts are displayed using the `WorkoutCard` component with `showDate={false}` since the date context is already provided

## Technical Considerations

### Performance Optimization

The calendar implementation includes several performance optimizations:

- Memoization of expensive calculations
- Efficient date range queries using SQL date functions
- Intelligent caching of calendar date information
- Preloading of adjacent months' data for smoother navigation

### Offline Support

Calendar View maintains functionality during offline periods by:

- Storing workout dates locally in SQLite
- Using cached data for visualization
- Providing visual indicators when in offline mode
- Refreshing data automatically when connectivity is restored

## Usage Example

```typescript
// Calendar View core implementation
const CalendarScreen = () => {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
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
  
  // Get dates that have workouts for visual highlighting
  useEffect(() => {
    const loadDatesForMonth = async () => {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      
      const dates = await workoutHistoryService.getWorkoutDatesInMonth(year, month);
      const dateStrings = dates.map(date => format(date, 'yyyy-MM-dd'));
      setWorkoutDates(new Set(dateStrings));
    };
    
    loadDatesForMonth();
  }, [selectedMonth, workoutHistoryService]);
  
  // Load workouts for the selected date
  useEffect(() => {
    const loadWorkoutsForDate = async () => {
      const dateWorkouts = await getWorkoutsByDate(selectedDate);
      setSelectedDateWorkouts(dateWorkouts);
    };
    
    loadWorkoutsForDate();
  }, [selectedDate, getWorkoutsByDate]);
  
  return (
    // Calendar UI implementation
  );
};
```

## Debugging

Common issues and troubleshooting tips for the Calendar View:

1. **Missing workout highlights**:
   - Check SQL query execution with console logging
   - Verify date formatting consistency (all dates should use the same format)
   - Ensure workouts have valid startTime values

2. **Empty workout list for date with highlight**:
   - Implement fallback filtering as described above
   - Check date comparison logic (ensure proper timezone handling)
   - Verify that workout fetching is using the correct date range (start/end of day)

3. **Visual inconsistencies**:
   - Ensure calendar day components maintain a consistent size (use aspect-square)
   - Apply proper border radius for circular date indicators (borderRadius: size / 2)
   - Remove any shadow effects that might distort shapes

## Future Enhancements

Planned improvements for the Calendar View:

1. **Heatmap visualization**: Color intensity based on workout volume or intensity
2. **Streak indicator**: Visual display of consecutive workout days
3. **Week/Year views**: Additional time period visualizations
4. **Goal integration**: Show scheduled vs. completed workouts
5. **Export functionality**: Calendar data export options
6. **Swipe navigation**: Touch gestures for navigating between months

## Related Documentation

- [History Overview](./history_overview.md) - Overview of the History tab features and architecture
- [Workout Data Models](../workout/data_models.md) - Details on workout data structures
- [Migration Guide](./migration_guide.md) - Guide for migrating to the unified history service
