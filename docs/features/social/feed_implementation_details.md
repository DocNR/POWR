# Social Feed Implementation Details

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** Social Features, NDK Integration, Feed Implementation

## Purpose

This document provides detailed technical implementation specifications for the social feed in the POWR app, including data flow architecture, event structures, component implementations, and integration points with the existing codebase.

## Technical Considerations

### Data Flow

The data flow for the social feed will leverage your existing NDK integration:

1. **Subscription Management**
   - Use your existing `useSubscribe` hook with appropriate filters for different feed types
   - Implement efficient subscription handling to minimize relay connections
   - Use NDK's subscription grouping for better relay performance

2. **Event Processing**
   - Parse Nostr events into app-specific data structures using the parser functions
   - Integrate with your existing workout data models
   - Handle event validation and error cases

3. **UI Rendering**
   - Use React Native's `FlatList` for efficient rendering of feed items
   - Implement proper list virtualization for performance
   - Use memoization to prevent unnecessary re-renders

### NDK Outbox Model

Your `initNDK.ts` already configures the outbox model. This is important for optimizing event delivery:

1. **Relay Management**
   - The outbox model helps route events to the most appropriate relays
   - Configure relay preferences based on event types and content
   - Optimize relay selection for event delivery

2. **Event Publishing**
   - Use the outbox model to ensure events reach appropriate relays
   - Configure fallback relays for critical events
   - Monitor delivery status using NDK's built-in mechanisms

### Offline Support

For true offline support:

1. **Local Event Storage**
   - Implement a pending events table in your SQLite database
   - Store unsent events when offline
   - Provide retry logic for failed publications

2. **UI Indicators**
   - Show visual indicators for pending publications
   - Implement status tracking for shared content
   - Allow users to manually retry failed shares

### Performance Optimizations

1. **Feed Rendering**
   - Use windowed lists for performance
   - Implement paged loading for long feeds
   - Cache rendered components to minimize re-renders

2. **Profile Caching**
   - Cache user profiles to reduce relay requests
   - Implement TTL-based caching for profile data
   - Prefetch profiles for visible feed items

3. **Media Handling**
   - Implement lazy loading for images
   - Use proper caching for media content
   - Consider progressive loading for large media

## Event Type Structures

### Workout Record (kind: 1301)
```json
{
  "kind": 1301,
  "content": "<workout notes>",
  "tags": [
    ["d", "<UUID>"],
    ["title", "<workout name>"],
    ["type", "<workout type>"],
    ["rounds_completed", "<number of rounds completed>"],
    ["start", "<Unix timestamp in seconds>"],
    ["end", "<Unix timestamp in seconds>"],
    ["exercise", "<kind>:<pubkey>:<d-tag>", "<relay-url>", "<weight>", "<reps>", "<rpe>", "<set_type>"],
    ["exercise", "<kind>:<pubkey>:<d-tag>", "<relay-url>", "<weight>", "<reps>", "<rpe>", "<set_type>"],
    ["template", "<kind>:<pubkey>:<d-tag>", "<relay-url>"],
    ["pr", "<kind>:<pubkey>:<d-tag>,<metric>,<value>"],
    ["completed", "<true/false>"],
    ["t", "<hashtag>"],
    ["t", "<hashtag>"]
  ]
}
```

### Exercise Template (kind: 33401)
```json
{
  "kind": 33401,
  "content": "<detailed form instructions and notes>",
  "tags": [
    ["d", "<UUID>"],
    ["title", "<exercise name>"],
    ["format", "<parameter>", "<parameter>", "<parameter>", "<parameter>"],
    ["format_units", "<unit>", "<unit>", "<unit>", "<unit>"],
    ["equipment", "<equipment type>"],
    ["difficulty", "<skill level>"],
    ["imeta", 
      "url <url to demonstration media>",
      "m <media type>",
      "dim <dimensions>",
      "alt <alt text>"
    ],
    ["t", "<hashtag>"],
    ["t", "<hashtag>"]
  ]
}
```

### Workout Template (kind: 33402)
```json
{
  "kind": 33402,
  "content": "<workout notes and instructions>",
  "tags": [
    ["d", "<UUID>"],
    ["title", "<workout name>"],
    ["type", "<workout type>"],
    ["rounds", "<number of rounds>"],
    ["duration", "<duration in seconds>"],
    ["interval", "<interval in seconds>"],
    ["rest_between_rounds", "<rest time in seconds>"],
    ["exercise", "<kind>:<pubkey>:<d-tag>", "<relay-url>", "<param1>", "<param2>", "<param3>", "<param4>"],
    ["exercise", "<kind>:<pubkey>:<d-tag>", "<relay-url>", "<param1>", "<param2>", "<param3>", "<param4>"],
    ["t", "<hashtag>"],
    ["t", "<hashtag>"]
  ]
}
```

## Integration with Existing Types

To ensure compatibility with your existing codebase, we'll need to extend your current types:

```typescript
// Add to types/nostr.ts
export interface NostrWorkoutRecord extends NostrEvent {
  kind: NostrEventKind.WORKOUT;
  tags: string[][];
}

export interface NostrExerciseTemplate extends NostrEvent {
  kind: NostrEventKind.EXERCISE;
  tags: string[][];
}

export interface NostrWorkoutTemplate extends NostrEvent {
  kind: NostrEventKind.TEMPLATE;
  tags: string[][];
}

// Interface for parsed workout record
export interface ParsedWorkoutRecord {
  id: string;
  title: string;
  type: string;
  startTime: number;
  endTime: number;
  completed: boolean;
  exercises: ParsedExercise[];
  templateReference?: string;
  notes: string;
}

// Interface for parsed exercise
export interface ParsedExercise {
  id: string;
  name: string;
  weight?: number;
  reps?: number;
  rpe?: number;
  setType: string;
}
```

## Code Examples

### Enhanced NDK Integration

```typescript
// Enhancement to useSubscribe.ts to support workout-specific events
export function useWorkoutFeed(
  feedType: 'following' | 'powr' | 'global'
) {
  const { ndk } = useNDK();
  const { currentUser } = useNDKCurrentUser();
  const [feedItems, setFeedItems] = useState<NDKEvent[]>([]);
  
  // Define filters based on your existing pattern but with workout event kinds
  const getFilters = useCallback(() => {
    const baseFilters = [{
      kinds: [1, 1301, 33401, 33402], // Notes, Workouts, Exercise Templates, Workout Templates
      limit: 20
    }];
    
    // Customize based on feed type
    switch (feedType) {
      case 'following':
        // Use your existing pattern for following users
        return baseFilters.map(filter => ({
          ...filter,
          // Add authors filter based on who the user follows
          '#p': currentUser?.follows || []
        }));
      case 'powr':
        return baseFilters.map(filter => ({
          ...filter,
          authors: ['npub1p0wer69rpkraqs02l5v8rutagfh6g9wxn2dgytkv44ysz7avt8nsusvpjk']
        }));
      default:
        return baseFilters;
    }
  }, [feedType, currentUser]);
  
  // Use your existing useSubscribe hook
  const { events, isLoading, eose, resubscribe } = useSubscribe(
    getFilters(), 
    { enabled: !!ndk }
  );
  
  // Process events into feed items
  useEffect(() => {
    if (events.length) {
      // Convert NDK events to feed items with proper parsing
      const processedItems = events.map(event => {
        switch (event.kind) {
          case 1301: // Workout records
            return processWorkoutEvent(event);
          case 33401: // Exercise templates
            return processExerciseTemplateEvent(event);
          case 33402: // Workout templates
            return processWorkoutTemplateEvent(event);
          default: // Standard posts
            return processStandardPost(event);
        }
      });
      
      setFeedItems(processedItems);
    }
  }, [events]);
  
  return {
    feedItems,
    isLoading,
    refreshFeed: resubscribe
  };
}
```

### Event Type Parsers

```typescript
// Add to utils/nostr-utils.ts
export function processWorkoutEvent(event: NDKEvent): WorkoutFeedItem {
  const title = findTagValue(event.tags, 'title') || 'Workout';
  const type = findTagValue(event.tags, 'type') || 'strength';
  const startTime = parseInt(findTagValue(event.tags, 'start') || '0');
  const endTime = parseInt(findTagValue(event.tags, 'end') || '0');
  
  // Extract exercises from tags
  const exercises = event.tags
    .filter(tag => tag[0] === 'exercise')
    .map(tag => parseExerciseTag(tag));
  
  // Map to your existing feed item structure
  return {
    id: event.id,
    type: 'workout',
    author: event.pubkey,
    createdAt: event.created_at,
    content: event.content,
    title,
    workoutType: type,
    duration: endTime - startTime,
    exercises,
    // Map other properties as needed
  };
}

export function parseExerciseTag(tag: string[]): ExerciseData {
  // Format: ['exercise', '<kind>:<pubkey>:<d-tag>', '<relay-url>', '<weight>', '<reps>', '<rpe>', '<set_type>']
  if (tag.length < 7) {
    // Handle incomplete tags
    return {
      id: tag[1] || '',
      name: 'Unknown Exercise',
      weight: null,
      reps: null,
      rpe: null,
      setType: 'normal'
    };
  }
  
  // Extract exercise ID parts (kind:pubkey:d-tag)
  const idParts = tag[1].split(':');
  const exerciseId = idParts.length > 2 ? idParts[2] : tag[1];
  
  return {
    id: exerciseId,
    name: exerciseId, // Placeholder - should be resolved from your exercise database
    weight: tag[3] ? parseFloat(tag[3]) : null,
    reps: tag[4] ? parseInt(tag[4]) : null,
    rpe: tag[5] ? parseFloat(tag[5]) : null,
    setType: tag[6] || 'normal'
  };
}

export function processExerciseTemplateEvent(event: NDKEvent): ExerciseFeedItem {
  const title = findTagValue(event.tags, 'title') || 'Exercise';
  const equipment = findTagValue(event.tags, 'equipment');
  const difficulty = findTagValue(event.tags, 'difficulty');
  
  // Parse format data
  const formatTag = event.tags.find(tag => tag[0] === 'format');
  const formatUnitsTag = event.tags.find(tag => tag[0] === 'format_units');
  
  // Get tags for categorization
  const categories = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
  
  // Extract media if present
  const mediaTag = event.tags.find(tag => tag[0] === 'imeta');
  let media = null;
  
  if (mediaTag && mediaTag.length > 1) {
    const urlPart = mediaTag[1].split(' ');
    if (urlPart.length > 1) {
      media = {
        url: urlPart[1],
        mimeType: mediaTag[2]?.split(' ')[1] || '',
        altText: mediaTag[4]?.substring(4) || ''
      };
    }
  }
  
  return {
    id: event.id,
    type: 'exerciseTemplate',
    author: event.pubkey,
    createdAt: event.created_at,
    content: event.content,
    title,
    equipment,
    difficulty,
    categories,
    media,
    // Map other properties as needed
  };
}
```

### Enhanced Social Post Component

```tsx
// Enhancement to components/social/SocialPost.tsx
interface WorkoutPostProps {
  event: NDKEvent;
  parsed: WorkoutFeedItem;
}

function WorkoutPost({ event, parsed }: WorkoutPostProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <UserAvatar pubkey={event.pubkey} />
        <View>
          <Text className="font-semibold">{parsed.displayName || 'Athlete'}</Text>
          <Text className="text-xs text-muted-foreground">
            completed a {parsed.workoutType} workout • {timeAgo(parsed.createdAt)}
          </Text>
        </View>
      </CardHeader>
      
      <CardContent className="py-2">
        <Text className="font-medium text-lg mb-1">{parsed.title}</Text>
        
        {parsed.exercises.length > 0 && (
          <View className="mt-2">
            <Text className="font-medium mb-1">Exercises:</Text>
            {parsed.exercises.slice(0, 3).map((exercise, index) => (
              <Text key={index} className="text-sm">
                • {exercise.name} {exercise.weight ? `${exercise.weight}kg` : ''} 
                {exercise.reps ? ` × ${exercise.reps}` : ''}
              </Text>
            ))}
            {parsed.exercises.length > 3 && (
              <Text className="text-sm text-muted-foreground">
                +{parsed.exercises.length - 3} more exercises
              </Text>
            )}
          </View>
        )}
        
        {parsed.content && (
          <Text className="mt-2">{parsed.content}</Text>
        )}
      </CardContent>
      
      <CardFooter className="pt-1">
        <InteractionButtons event={event} />
      </CardFooter>
    </Card>
  );
}

// Enhanced SocialPost component
export default function SocialPost({ event }: { event: NDKEvent }) {
  // Parse event based on kind
  const parsed = useMemo(() => {
    switch (event.kind) {
      case 1301:
        return processWorkoutEvent(event);
      case 33401:
        return processExerciseTemplateEvent(event);
      case 33402:
        return processWorkoutTemplateEvent(event);
      default:
        return processStandardPost(event);
    }
  }, [event]);
  
  // Render different components based on event kind
  switch (event.kind) {
    case 1301:
      return <WorkoutPost event={event} parsed={parsed} />;
    case 33401:
      return <ExerciseTemplatePost event={event} parsed={parsed} />;
    case 33402:
      return <WorkoutTemplatePost event={event} parsed={parsed} />;
    default:
      return <StandardPost event={event} parsed={parsed} />;
  }
}
```

### Workout Sharing Integration

```tsx
// Enhancement to components/workout/WorkoutCompletionFlow.tsx
// Add to your existing implementation
const handleShareWorkout = async () => {
  if (!ndk || !currentUser || !workout) return;
  
  // Create a workout record event
  const workoutEvent = new NDKEvent(ndk);
  workoutEvent.kind = 1301; // Workout Record
  workoutEvent.content = notes || '';
  
  // Add tags based on completed workout
  const tags = [
    ['d', workout.id], // Use your UUID
    ['title', workout.title],
    ['type', workout.type],
    ['start', workout.startTime.toString()],
    ['end', workout.endTime.toString()],
    ['completed', 'true']
  ];
  
  // Add exercise tags
  workout.exercises.forEach(exercise => {
    // Format: exercise, reference, relay, weight, reps, rpe, set_type
    tags.push([
      'exercise',
      `33401:${exercise.id}`,
      '',
      exercise.weight?.toString() || '',
      exercise.reps?.toString() || '',
      exercise.rpe?.toString() || '',
      'normal'
    ]);
  });
  
  // Add template reference if used
  if (workout.templateId) {
    tags.push(['template', `33402:${workout.templateId}`, '']);
  }
  
  // Add hashtags
  tags.push(['t', 'workout']);
  tags.push(['t', 'powrapp']);
  
  workoutEvent.tags = tags;
  
  try {
    await workoutEvent.publish();
    // Show success message
    showToast('Workout shared successfully!');
  } catch (error) {
    console.error('Error sharing workout:', error);
    showToast('Failed to share workout');
  }
};
```

## Security Considerations

1. **Data Privacy**
   - Allow users to control which workouts are shared
   - Provide clear privacy indicators
   - Support event deletion (NIP-09)

2. **Content Moderation**
   - Implement user blocking
   - Add reporting mechanisms
   - Support muting functionality

3. **User Safety**
   - Protect sensitive health data
   - Allow selective sharing
   - Provide education on privacy implications

## Implementation Roadmap

### Phase 1: Enhanced NDK Integration (2-3 weeks)
- Complete NDK integration with proper caching
- Implement event parsers for workout-specific event kinds
- Enhance existing subscription mechanisms

### Phase 2: Core Social Feed Components (3-4 weeks)
- Enhance SocialPost component for different event types
- Implement detailed WorkoutPost, TemplatePost, and ExercisePost components
- Add interaction components (likes, comments, reposts)

### Phase 3: Workout Sharing Functionality (2-3 weeks)
- Integrate with existing workout completion flow
- Implement bidirectional sync between local and Nostr data
- Add ability to share templates and exercises

### Phase 4: Detail Screens & Advanced Features (3-4 weeks)
- Create detail screens for different content types
- Implement comments and replies functionality
- Add profile enhancements to show user's content

### Phase 5: Polish & Optimization (2 weeks)
- Optimize performance for large feeds
- Enhance offline support
- Add media handling for workout photos
- Implement pull-to-refresh and infinite scrolling

## Related Documentation

- [Social Architecture](./architecture.md) - Overall social features architecture
- [Feed Filtering](./feed_filtering.md) - Rules for filtering content in social feeds
- [Cache Implementation](./cache_implementation.md) - Details on the social feed caching system
- [Implementation Plan](./implementation_plan.md) - High-level implementation plan
- [NDK Comprehensive Guide](../../technical/ndk/comprehensive_guide.md) - Reference for NDK implementation
- [Nostr Exercise NIP](../../technical/nostr/exercise_nip.md) - Technical specification for workout event format
