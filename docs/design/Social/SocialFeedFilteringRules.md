# Social Feed Filtering Rules

This document outlines the filtering rules for the different social feed tabs in the POWR app.

## Overview

The POWR app has three main social feed tabs:
1. **POWR** - Official content from the POWR team
2. **Following** - Content from users the current user follows
3. **Community** (formerly Global) - Content from the broader Nostr community

Each feed has specific filtering rules to ensure users see relevant fitness-related content.

## Content Types

The app handles several types of Nostr events:
- **Social Posts** (kind 1) - Regular text posts
- **Articles** (kind 30023) - Long-form content
- **Article Drafts** (kind 30024) - Unpublished long-form content
- **Workout Records** (kind 1301) - Completed workouts
- **Exercise Templates** (kind 33401) - Exercise definitions
- **Workout Templates** (kind 33402) - Workout plans

## Filtering Rules

### POWR Feed
- Shows content **only** from the official POWR account (`npub1p0wer69rpkraqs02l5v8rutagfh6g9wxn2dgytkv44ysz7avt8nsusvpjk`)
- Includes:
  - Social posts (kind 1)
  - Published articles (kind 30023)
  - Workout records (kind 1301)
  - Exercise templates (kind 33401)
  - Workout templates (kind 33402)
- **Excludes** article drafts (kind 30024)

### Following Feed
- Shows content from users the current user follows
- For social posts (kind 1) and articles (kind 30023), only shows content with fitness-related tags:
  - #workout
  - #fitness
  - #powr
  - #31days
  - #crossfit
  - #wod
  - #gym
  - #strength
  - #cardio
  - #training
  - #exercise
- Always shows workout-specific content (kinds 1301, 33401, 33402) from followed users
- **Excludes** article drafts (kind 30024)

### Community Feed
- Shows content from all users
- For social posts (kind 1) and articles (kind 30023), only shows content with fitness-related tags (same as Following Feed)
- Always shows workout-specific content (kinds 1301, 33401, 33402)
- **Excludes** article drafts (kind 30024)

### User Activity Feed
- Shows only the current user's own content
- For social posts (kind 1) and articles (kind 30023), only shows content with fitness-related tags (same as Following Feed)
- Always shows the user's workout-specific content (kinds 1301, 33401, 33402)
- **Excludes** article drafts (kind 30024)

## Implementation Details

The filtering is implemented in several key files:
- `lib/social/socialFeedService.ts` - Core service that handles feed subscriptions
- `lib/hooks/useFeedHooks.ts` - React hooks for the different feed types
- `components/social/EnhancedSocialPost.tsx` - Component that renders feed items

### Tag-Based Filtering

For social posts and articles, we filter based on the presence of fitness-related tags. This ensures that users only see content relevant to fitness and workouts.

### Content Type Filtering

Workout-specific content (kinds 1301, 33401, 33402) is always included in the feeds, as these are inherently fitness-related.

### Draft Exclusion

Article drafts (kind 30024) are excluded from all feeds to ensure users only see published content.

## Modifying Feed Filtering

If you need to modify the event types or tags used for filtering, you'll need to update the following files:

### 1. To modify event kinds (content types):

#### a. `lib/social/socialFeedService.ts`:
- The `subscribeFeed` method contains the core filtering logic
- Modify the `workoutFilter` object to change workout-specific content kinds (1301, 33401, 33402)
- Modify the `socialPostFilter` object to change social post kinds (1)
- Modify the `articleFilter` object to change article kinds (30023)
- The special case for draft articles (30024) has been removed, but you can add it back if needed

```typescript
// Example: To add a new workout-related kind (e.g., 1302)
const workoutFilter: NDKFilter = {
  kinds: [1301, 33401, 33402, 1302] as any[],
  // ...
};
```

#### b. `lib/hooks/useFeedHooks.ts`:
- Update the filter arrays in each hook function:
  - `useFollowingFeed`
  - `usePOWRFeed`
  - `useGlobalFeed`
  - `useUserActivityFeed`

```typescript
// Example: Adding a new kind to the POWR feed
const powrFilters = useMemo<NDKFilter[]>(() => {
  if (!POWR_PUBKEY_HEX) return [];
  
  return [
    {
      kinds: [1, 30023, 1302] as any[], // Added new kind 1302
      authors: [POWR_PUBKEY_HEX],
      limit: 25
    },
    // ...
  ];
}, []);
```

### 2. To modify fitness-related tags:

#### a. `lib/social/socialFeedService.ts`:
- Find the tag arrays in the `socialPostFilter` and `articleFilter` objects:

```typescript
socialPostFilter['#t'] = [
  'workout', 'fitness', 'powr', '31days', 
  'crossfit', 'wod', 'gym', 'strength', 
  'cardio', 'training', 'exercise'
  // Add new tags here
];
```

#### b. `lib/hooks/useFeedHooks.ts`:
- Update the tag arrays in each hook function:
  - `useFollowingFeed`
  - `useGlobalFeed`
  - `useUserActivityFeed`

```typescript
'#t': [
  'workout', 'fitness', 'powr', '31days', 
  'crossfit', 'wod', 'gym', 'strength', 
  'cardio', 'training', 'exercise',
  'newTag1', 'newTag2' // Add new tags here
]
```

### 3. To modify content rendering:

#### a. `components/social/EnhancedSocialPost.tsx`:
- The `renderContent` method determines how different content types are displayed
- Modify this method if you add new event kinds or need to change how existing kinds are rendered

```typescript
// Example: Adding support for a new kind
case 'newContentType':
  return <NewContentTypeComponent data={item.parsedContent as NewContentType} />;
```

### 4. To modify event parsing:

#### a. `lib/hooks/useSocialFeed.ts`:
- The `processEvent` function parses events based on their kind
- Update this function if you add new event kinds or change how existing kinds are processed

```typescript
// Example: Adding support for a new kind
case NEW_KIND:
  feedItem = {
    id: event.id,
    type: 'newType',
    originalEvent: event,
    parsedContent: parseNewContent(event),
    createdAt: timestamp
  };
  break;
```

### 5. Event type definitions:

#### a. `types/nostr-workout.ts`:
- Contains the `POWR_EVENT_KINDS` enum with all supported event kinds
- Update this enum if you add new event kinds

```typescript
// Example: Adding a new kind
export enum POWR_EVENT_KINDS {
  // Existing kinds...
  NEW_KIND = 1302,
}
```

## Testing Changes

After modifying the filtering rules, test the changes in all feed tabs:
1. POWR feed
2. Following feed
3. Community feed
4. User Activity feed (in the Profile tab)

Verify that:
- Only the expected content types appear in each feed
- Content with the specified tags is properly filtered
- New event kinds are correctly rendered

## Future Improvements

Potential future improvements to the filtering system:
- Add user-configurable filters for specific fitness interests
- Implement AI-based content relevance scoring
- Add support for more content types as the Nostr ecosystem evolves
