# NDK Mobile Cache Integration Plan

This document outlines our plan to leverage the NDK mobile SQLite cache system throughout the POWR app to improve offline functionality, reduce network usage, and enhance performance.

## Overview

The NDK mobile library provides a robust SQLite-based caching system that includes:

1. **Profile Caching**: Stores user profiles with metadata
2. **Event Caching**: Stores Nostr events with efficient indexing
3. **Unpublished Event Queue**: Manages events pending publication
4. **Web of Trust Storage**: Maintains relationship scores

We will integrate this caching system across multiple components of our app to provide a better offline experience.

## Implementation Priorities

### 1. Profile Image Caching

**Files to Modify:**
- `components/UserAvatar.tsx`
- Create new: `lib/db/services/ProfileImageCache.ts`

**Functions to Implement:**
- `getProfileImageUri(pubkey, imageUrl)`: Get a cached image URI or download if needed
- `clearOldCache(maxAgeDays)`: Remove old cached images

**Integration Points:**
- Update `UserAvatar` to use the cache service
- Add cache invalidation based on profile updates

### 2. Publication Queue Service

**Files to Modify:**
- `lib/db/services/PublicationQueueService.ts`

**Functions to Enhance:**
- `queueEvent(event)`: Use NDK's unpublished events system
- `processQueue()`: Process events from NDK cache
- `getPendingEvents(limit)`: Get events from NDK cache
- `getPendingCount()`: Get count from NDK cache

**Migration Strategy:**
1. Add NDK cache support
2. Dual-write period
3. Migrate existing queue
4. Remove custom implementation

### 3. Social Feed Caching

**Files to Modify:**
- `lib/social/socialFeedService.ts`
- `lib/hooks/useSocialFeed.ts`

**Functions to Enhance:**
- `subscribeFeed(options)`: Check cache before subscription
- `getComments(eventId)`: Use cache for comments
- `resolveQuotedContent(event)`: Use cache for quoted content

**Benefits:**
- Immediate display of previously viewed content
- Reduced network requests
- Offline browsing of previously viewed feeds

### 4. Workout History

**Files to Modify:**
- `lib/db/services/UnifiedWorkoutHistoryService.ts`

**Functions to Enhance:**
- `getNostrWorkouts()`: Use NDK cache directly
- `importNostrWorkoutToLocal(eventId)`: Leverage cache for imports
- `subscribeToNostrWorkouts(pubkey, callback)`: Use cache for initial data

**Benefits:**
- Faster workout history loading
- Offline access to workout history
- Reduced network usage

### 5. Exercise Library

**Files to Modify:**
- `lib/db/services/ExerciseService.ts`
- `lib/hooks/useExercises.ts`

**Functions to Implement:**
- `getExercisesFromNostr()`: Use cache for exercises
- `getExerciseDetails(id)`: Get details from cache

**Benefits:**
- Offline access to exercise library
- Faster exercise loading

### 6. Workout Templates

**Files to Modify:**
- `lib/db/services/TemplateService.ts`
- `lib/hooks/useTemplates.ts`

**Functions to Enhance:**
- `getTemplateFromNostr(id)`: Use cache for templates
- `getTemplatesFromNostr()`: Get templates from cache

**Benefits:**
- Offline access to templates
- Faster template loading

### 7. Contact List & Following

**Files to Modify:**
- `lib/hooks/useContactList.ts`
- `lib/hooks/useFeedState.ts`

**Functions to Enhance:**
- `getContactList()`: Use cache for contact list
- `getFollowingList()`: Use cache for following list

**Benefits:**
- Offline access to contacts
- Faster contact list loading

### 8. General Media Cache

**Files to Create:**
- `lib/db/services/MediaCacheService.ts`

**Functions to Implement:**
- `cacheMedia(url, mimeType)`: Download and cache media
- `getMediaUri(url)`: Get cached media URI
- `clearOldCache(maxAgeDays)`: Remove old cached media

**Integration Points:**
- Profile banners
- Exercise images
- Other media content

## Implementation Approach

For each component, we will:

1. **Analyze Current Implementation**: Understand how data is currently fetched and stored
2. **Design Cache Integration**: Determine how to leverage NDK cache
3. **Implement Changes**: Modify code to use cache
4. **Test Offline Functionality**: Verify behavior when offline
5. **Measure Performance**: Compare before and after metrics

## Technical Considerations

### Cache Size Management

- Implement cache size limits
- Add cache eviction policies
- Prioritize frequently accessed data

### Cache Invalidation

- Track data freshness
- Implement TTL (Time To Live) for cached data
- Update cache when new data is received

### Error Handling

- Graceful fallbacks when cache misses
- Recovery from cache corruption
- Logging for debugging

## Success Metrics

- Reduced network requests
- Faster app startup time
- Improved offline experience
- Reduced data usage
- Better battery life

## Next Steps

1. Begin with Profile Image Cache implementation
2. Move to Publication Queue Service
3. Continue with remaining components in priority order
