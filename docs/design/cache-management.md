# NDK Mobile Cache Integration Plan

## Overview

This document outlines the comprehensive strategy for leveraging the NDK mobile SQLite cache system throughout the POWR app to improve offline functionality, reduce network usage, and enhance performance.

## Goals

1. **Improve Offline Experience**: Allow users to access critical app features even when offline
2. **Reduce Network Usage**: Minimize data consumption by caching frequently accessed data
3. **Enhance Performance**: Speed up the app by reducing network requests
4. **Maintain Data Freshness**: Implement strategies to keep cached data up-to-date

## Implementation Components

### 1. Profile Image Caching

**Status: Implemented**

The `ProfileImageCache` service downloads and caches profile images locally, providing offline access and reducing network usage.

```typescript
// Key features of ProfileImageCache
- Local storage of profile images in the app's cache directory
- Automatic fetching and caching of images when needed
- Age-based cache invalidation (24 hours by default)
- Integration with UserAvatar component for seamless usage
```

**Integration Points:**
- `UserAvatar` component uses the cache for all profile images
- `EnhancedSocialPost` component uses `UserAvatar` for profile images in the feed
- NDK initialization sets the NDK instance in the ProfileImageCache service

### 2. Publication Queue Service

**Status: Implemented**

The `PublicationQueueService` allows events to be created and queued when offline, then published when connectivity is restored.

```typescript
// Key features of PublicationQueueService
- Persistent storage of unpublished events
- Automatic retry mechanism when connectivity is restored
- Priority-based publishing
- Status tracking for queued events
```

**Integration Points:**
- Social posting
- Workout publishing
- Template sharing

### 3. Social Feed Caching

**Status: Implemented**

The `SocialFeedCache` service caches social feed events locally, allowing users to browse their feed even when offline.

```typescript
// Key features of SocialFeedCache
- SQLite-based storage of feed events
- Feed-specific caching (following, POWR, global)
- Time-based pagination support
- Automatic cleanup of old cached events
```

**Integration Points:**
- `useSocialFeed` hook uses the cache when offline
- `SocialFeedService` manages the cache and provides a unified API
- Feed components display cached content with offline indicators

### 4. Workout History

**Status: Implemented**

The `UnifiedWorkoutHistoryService` provides access to workout history both locally and from Nostr, with offline support.

```typescript
// Key features of workout history caching
- Local storage of all workout records
- Synchronization with Nostr when online
- Conflict resolution for workouts created offline
- Comprehensive workout data including exercises, sets, and metadata
```

**Integration Points:**
- History tab displays cached workout history
- Workout completion flow saves to local cache first
- Background synchronization with Nostr

### 5. Exercise Library

**Status: Implemented**

The `ExerciseService` maintains a local cache of exercises, allowing offline access to the exercise library.

```typescript
// Key features of exercise library caching
- Complete local copy of exercise database
- Periodic updates from Nostr when online
- Custom exercise creation and storage
- Categorization and search functionality
```

**Integration Points:**
- Exercise selection during workout creation
- Exercise details view
- Exercise search and filtering

### 6. Workout Templates

**Status: Implemented**

The `TemplateService` provides offline access to workout templates through local caching.

```typescript
// Key features of template caching
- Local storage of user's templates
- Synchronization with Nostr templates
- Favorite templates prioritized for offline access
- Template versioning and updates
```

**Integration Points:**
- Template selection during workout creation
- Template management in the library
- Template sharing and discovery

### 7. Contact List & Following

**Status: Implemented**

The system caches the user's contact list and following relationships for offline access.

```typescript
// Key features of contact list caching
- Local storage of followed users
- Periodic updates when online
- Integration with NDK's contact list functionality
- Support for NIP-02 contact lists
```

**Integration Points:**
- Following feed generation
- User profile display
- Social interactions

### 8. General Media Cache

**Status: Implemented**

A general-purpose media cache for other types of media used in the app.

```typescript
// Key features of general media cache
- Support for various media types (images, videos, etc.)
- Size-limited cache with LRU eviction
- Content-addressable storage
- Automatic cleanup of unused media
```

**Integration Points:**
- Article images in the feed
- Exercise demonstration images
- App assets and resources

## Technical Implementation

### NDK Integration

The NDK mobile adapter provides built-in SQLite caching capabilities that we leverage throughout the app:

```typescript
// Initialize NDK with SQLite cache adapter
const cacheAdapter = new NDKCacheAdapterSqlite('powr', 1000);
await cacheAdapter.initialize();

const ndk = new NDK({
  cacheAdapter,
  explicitRelayUrls: DEFAULT_RELAYS,
  enableOutboxModel: true,
  autoConnectUserRelays: true,
  clientName: 'powr',
});
```

### Connectivity Management

The `ConnectivityService` monitors network status and triggers appropriate cache behaviors:

```typescript
// Key features of ConnectivityService
- Real-time network status monitoring
- Callback registration for connectivity changes
- Automatic retry of failed operations when connectivity is restored
- Bandwidth-aware operation modes
```

### Cache Invalidation Strategies

Different types of data have different invalidation strategies:

1. **Time-based**: Profile images, feed events
2. **Version-based**: Exercise library, templates
3. **Manual**: User-triggered refresh
4. **Never**: Historical workout data

## User Experience Considerations

### Offline Indicators

The app provides clear visual indicators when operating in offline mode:

- Global offline indicator in the header
- Feed-specific offline state components
- Disabled actions that require connectivity
- Queued action indicators

### Transparent Sync

Synchronization happens transparently in the background:

- Automatic publishing of queued events when connectivity is restored
- Progressive loading of fresh content when coming online
- Prioritized sync for critical data

### Data Freshness

The app balances offline availability with data freshness:

- Age indicators for cached content
- Pull-to-refresh to force update when online
- Background refresh of frequently accessed data

## Testing Strategy

Comprehensive testing ensures the cache system works reliably:

1. **Unit Tests**: Individual cache services
2. **Integration Tests**: Interaction between cache and UI components
3. **Offline Simulation**: Testing app behavior in offline mode
4. **Performance Testing**: Measuring cache impact on app performance
5. **Edge Cases**: Testing cache behavior with limited storage, connectivity issues, etc.

## Future Enhancements

Potential future improvements to the caching system:

1. **Selective Sync**: User-configurable sync preferences
2. **Compression**: Reducing cache size through compression
3. **Encryption**: Enhancing security of cached data
4. **Analytics**: Usage patterns to optimize caching strategy
5. **Cross-device Sync**: Synchronizing cache across user devices

## Conclusion

The NDK Mobile Cache Integration provides a robust foundation for offline functionality in the POWR app, significantly improving the user experience in limited connectivity scenarios while reducing network usage and enhancing performance.
