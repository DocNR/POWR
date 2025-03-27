# Social Architecture

**Last Updated:** 2025-03-25  
**Status:** Active  
**Related To:** Social Features, Nostr Integration

## Purpose

This document describes the overall architecture of the social features in the POWR app. It consolidates information from various social implementation documents, covering feed design, caching strategy, filtering rules, and MVP implementation.

## Overview

The POWR app social features enable users to:

1. Share workout completions to Nostr
2. Follow other POWR users
3. View workout posts from followed users
4. Interact with global workout-related content
5. Maintain a profile with workout history and achievements

The social architecture is designed with the following principles:

- Privacy-first approach
- Offline-first with reliable sync
- Performance optimized for mobile
- Simplified MVP implementation
- Clear extension path for future features

## Component Architecture

### High-Level Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Layer      │     │  Service Layer  │     │   Data Layer    │
│                 │     │                 │     │                 │
│ SocialPost      │     │ SocialFeed      │     │ NDK             │
│ FeedScreens     │◄───►│ Services        │◄───►│ EventCache      │
│ ProfileViews    │     │ PublishQueue    │     │ ContactCache    │
│ Interactions    │     │ ProfileService  │     │ ProfileCache    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### UI Components

- `SocialPost`: Displays individual posts with user info, content, and interactions
- `FeedScreens`: Three main feed views (Following, POWR, Global)
- `ProfileViews`: User profile display with posts and stats
- `EmptyFeed`: Placeholder for empty feed states
- `SocialOfflineState`: Indication and recovery for offline state

### Service Layer

- `SocialFeedService`: Feed management and aggregation
- `PublicationQueueService`: Queue for publishing events offline
- `ProfileService`: User profile management
- `ConnectivityService`: Network state monitoring
- `AuthenticationService`: Login state management
- `ContactCacheService`: Management of contact/following list

### Data Layer

- `NDK`: Nostr Development Kit for protocol interaction
- `EventCache`: Caching for Nostr events
- `ContactCache`: Caching for contact lists
- `ProfileCache`: Caching for user profiles

## Feed Implementation

### Feed Types

1. **Following Feed**: Posts from users the current user follows
2. **POWR Feed**: Official POWR content and featured community posts
3. **Global Feed**: All workout-related content from the wider Nostr network

### Feed Filtering Rules

Feed content is filtered based on the following rules:

1. **Content Types**:
   - Workout records (kind 1301)
   - Workout templates (kind 33401)
   - Exercise definitions (kind 33402)
   - Social posts referencing workouts (kind 1)
   - Profile information (kind 0)
   - Long-form content related to fitness (kind 30023)
   - Highlight/achievement posts (kind 9734)

2. **Following Feed**:
   - Only from users in the user's contact list
   - Must be workout-related (has workout reference or hashtag)
   - Sorted by creation date descending

3. **POWR Feed**:
   - Content from official POWR account
   - Content from featured users
   - Trending workout posts based on interactions
   - Educational content related to fitness

4. **Global Feed**:
   - All public workout-related posts
   - Must have appropriate hashtags or workout references
   - Filtered for relevance and quality
   - Basic spam filtering applied

### Feed Pagination

Feeds implement cursor-based pagination with:
- Initial load of 20 items
- "Load more" triggers fetching next 20 items
- Event timestamps used as cursors

## Caching Strategy

### Event Caching

Events are cached using a multi-tier approach:

1. **Memory Cache**:
   - Most recent events (last 24 hours)
   - Limited to 1000 events per feed type
   - LRU eviction policy

2. **SQLite Persistent Cache**:
   - Events stored in database for offline access
   - Indexed by event ID and pubkey
   - Automatic cleanup of older events (>30 days)
   - Exception for user's own events (kept indefinitely)

### Profile Caching

User profiles are cached with:
- In-memory LRU cache for active browsing
- SQLite storage for persistent data
- TTL-based invalidation (refresh after 24 hours)
- Force refresh on explicit user action

### Contact Caching

Contact lists (users followed by the current user) are cached:
- In SQLite database via `ContactCacheService`
- Updated on initial login and periodically
- Contains pubkeys, relay hints, and petnames
- Used for Following feed filtering and contact display

### Invalidation Strategy

Cache invalidation occurs:
- On explicit pull-to-refresh
- When new events reference cached events
- After network reconnection
- When TTL expires

## Authentication Flow

```
┌──────────┐     ┌───────────┐     ┌────────────┐     ┌───────────┐
│          │     │           │     │            │     │           │
│  Login   │────►│ Generate/ │────►│ Initialize │────►│ Fetch     │
│  Prompt  │     │ Load Keys │     │ NDK/Relays │     │ Profile   │
│          │     │           │     │            │     │           │
└──────────┘     └───────────┘     └────────────┘     └───────────┘
                                                             │
                                                             ▼
                                                      ┌───────────┐
                                                      │           │
                                                      │ Import    │
                                                      │ Contacts  │
                                                      │           │
                                                      └───────────┘
```

The authentication process:
1. User initiates login with npub or generates new keys
2. Keys securely stored in device secure storage
3. NDK initialized with signer and relays
4. Profile data fetched and cached
5. Contact list (kind 3 events) fetched and stored in ContactCache
   - Contacts processed and stored in SQLite via ContactCacheService
   - Includes pubkeys, relay hints, and petnames
   - Used for Following feed population
   - Periodically refreshed (every 6 hours of active use)

## Publishing Flow

```
┌──────────┐     ┌───────────┐     ┌────────────┐
│          │     │           │     │            │
│ Create   │────►│ Queue for │────►│ Publish to │
│ Event    │     │ Publish   │     │ Relays     │
│          │     │           │     │            │
└──────────┘     └───────────┘     └────────────┘
                       │                  ▲
                       │                  │
                       ▼                  │
              ┌───────────────┐           │
              │ Store in      │           │
              │ Local Queue   │───────────┘
              │ if Offline    │
              └───────────────┘
```

The publishing process handles:
1. Event creation with proper kind and tags
2. Offline queue management
3. Retry logic for failed publishes
4. Success/failure notifications
5. Local update before confirmation

## MVP Implementation

For the MVP release, we're implementing a simplified social experience:

### MVP Social Features

1. **Basic Publishing**:
   - Workout sharing from completion flow
   - Simple note composition
   - Proper NIP-89 application attribution

2. **Simplified Feed**:
   - Official POWR feed content
   - "Coming Soon" placeholder for Following/Global
   - Basic post rendering without complex interactions

3. **Essential Profile**:
   - Basic profile display
   - Workout history integration
   - Minimal social activity display

### MVP Technical Focus

1. **Authentication Stability**:
   - Reliable login/logout flow
   - Proper state management
   - Clear lifecycle hooks

2. **Subscription Management**:
   - Proper subscription cleanup
   - Resource management
   - Simplified subscription patterns

3. **Offline Support**:
   - Queue-based publishing
   - Reliable local-first operation
   - Simple sync indicators

## Targeted Social Rebuild

After the MVP release, we plan to implement a targeted rebuild of the social features:

### Phase 1: Core Architecture Improvements

1. Implement proper authentication state machine
2. Rebuild subscription management service
3. Create robust event cache service
4. Implement clean data/UI layer separation

### Phase 2: Enhanced Social Features

1. Robust Following feed with proper contact management
2. Interaction capabilities (likes, reposts)
3. Enhanced profile with proper metadata
4. Threading and replies for workouts

### Phase 3: Advanced Features

1. Search and discovery 
2. Trends and analytics
3. Enhanced content filtering
4. Rich media embedding

## Related Documentation

- [MVP and Targeted Rebuild](../../project/mvp_and_rebuild.md) - MVP strategy details
- [NDK Comprehensive Guide](../../technical/ndk/comprehensive_guide.md) - NDK implementation
- [Exercise NIP Specification](../../technical/nostr/exercise_nip.md) - Nostr protocol for exercise data
- [Workout Completion Flow](../workout/completion_flow.md) - Integration with workout features
