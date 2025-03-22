# POWR Social Feed Implementation Plan

## Overview

This document outlines the implementation strategy for integrating Nostr-powered social feed functionality into the POWR fitness app while maintaining the existing UI structure and design patterns. The social feed will display workout records, exercise templates, workout templates, and related social posts from the Nostr network.

## Event Types and Data Model

```typescript
// types/nostr.ts
export const POWR_EVENT_KINDS = {
  EXERCISE_TEMPLATE: 33401,  // Exercise definitions
  WORKOUT_TEMPLATE: 33402,   // Workout plans
  WORKOUT_RECORD: 1301,      // Completed workouts
  SOCIAL_POST: 1,            // Regular notes referencing workout content
  COMMENT: 1111,             // Replies to content
};
```

## Core Infrastructure

### NDK Setup

```typescript
// lib/ndk/setup.ts
import { NDKProvider } from '@nostr-dev-kit/ndk-mobile';
import { SQLiteAdapter } from '@nostr-dev-kit/ndk-mobile/cache-adapter';

export const setupNDK = () => {
  const ndk = new NDKProvider({
    explicitRelayUrls: [
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://nos.lol',
    ],
    enableOutboxModel: true,
  });

  const cacheAdapter = new SQLiteAdapter();
  ndk.cacheAdapter = cacheAdapter;

  return ndk;
};
```

## Services Layer

### Social Feed Service

```typescript
// lib/social/feed-service.ts
import { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk-mobile';
import { POWR_EVENT_KINDS } from '../../types/nostr';

export class SocialFeedService {
  constructor(private ndk: NDKProvider) {}

  async subscribeFeed(options: {
    feedType: 'following' | 'powr' | 'global',
    since?: number,
    limit?: number,
    authors?: string[],
    onEvent: (event: NDKEvent) => void,
  }) {
    // Base workout content filter
    const workoutFilter: NDKFilter = {
      kinds: [
        POWR_EVENT_KINDS.WORKOUT_RECORD,
        POWR_EVENT_KINDS.EXERCISE_TEMPLATE,
        POWR_EVENT_KINDS.WORKOUT_TEMPLATE,
      ],
      since: options.since || Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      limit: options.limit || 20,
    };

    // Base social post filter for posts referencing workout content
    const socialPostFilter: NDKFilter = {
      kinds: [POWR_EVENT_KINDS.SOCIAL_POST],
      '#k': [
        POWR_EVENT_KINDS.WORKOUT_RECORD.toString(),
        POWR_EVENT_KINDS.EXERCISE_TEMPLATE.toString(),
        POWR_EVENT_KINDS.WORKOUT_TEMPLATE.toString(),
      ],
      since: options.since || Math.floor(Date.now() / 1000) - 24 * 60 * 60,
      limit: options.limit || 20,
    };
    
    // Apply tab-specific filtering
    if (options.feedType === 'following' && options.authors?.length) {
      // Only include posts from followed authors
      workoutFilter.authors = options.authors;
      socialPostFilter.authors = options.authors;
    } else if (options.feedType === 'powr') {
      // Include official POWR team content and featured content
      // This could use specific pubkeys or tags to identify official content
      const powrTeamPubkeys = getPOWRTeamPubkeys(); // Implement this helper
      const officialTag = ['t', 'powr-official'];
      
      // Add these to filter (advanced filtering would use "#t" for tag search)
      if (powrTeamPubkeys.length > 0) {
        workoutFilter.authors = powrTeamPubkeys;
        socialPostFilter.authors = powrTeamPubkeys;
      }
    }
    // 'global' uses the default filters with no additional constraints

    // Create subscriptions
    const workoutSub = this.ndk.subscribe(workoutFilter);
    const socialSub = this.ndk.subscribe(socialPostFilter);

    // Handle events from both subscriptions
    workoutSub.on('event', (event: NDKEvent) => {
      options.onEvent(event);
    });

    socialSub.on('event', (event: NDKEvent) => {
      options.onEvent(event);
    });

    return {
      unsubscribe: () => {
        workoutSub.unsubscribe();
        socialSub.unsubscribe();
      }
    };
  }

  // Get comments for an event
  async getComments(eventId: string): Promise<NDKEvent[]> {
    const filter: NDKFilter = {
      kinds: [POWR_EVENT_KINDS.COMMENT],
      '#e': [eventId],
    };
    return Array.from(await this.ndk.fetchEvents(filter));
  }

  // Post a comment on an event
  async postComment(
    parentEvent: NDKEvent, 
    content: string, 
    replyTo?: NDKEvent
  ): Promise<NDKEvent> {
    const comment = new NDKEvent(this.ndk);
    comment.kind = POWR_EVENT_KINDS.COMMENT;
    comment.content = content;
    
    // Add tag for the root event
    comment.tags.push(['e', parentEvent.id, '', 'root']);
    
    // If this is a reply to another comment, add that reference
    if (replyTo) {
      comment.tags.push(['e', replyTo.id, '', 'reply']);
    }
    
    // Add author reference
    comment.tags.push(['p', parentEvent.pubkey]);
    
    await comment.sign();
    await comment.publish();
    return comment;
  }

  // Get referenced content for kind:1 posts
  async getReferencedContent(event: NDKEvent): Promise<NDKEvent | null> {
    if (event.kind !== POWR_EVENT_KINDS.SOCIAL_POST) return null;

    // Find the referenced event ID
    const eventRef = event.tags.find(tag => tag[0] === 'e');
    if (!eventRef) return null;

    // Find the kind tag that indicates what type of content is referenced
    const kTag = event.tags.find(tag => 
      tag[0] === 'k' && 
      [
        POWR_EVENT_KINDS.WORKOUT_RECORD.toString(),
        POWR_EVENT_KINDS.EXERCISE_TEMPLATE.toString(),
        POWR_EVENT_KINDS.WORKOUT_TEMPLATE.toString()
      ].includes(tag[1])
    );

    if (!kTag) return null;

    const filter: NDKFilter = {
      ids: [eventRef[1]],
      kinds: [parseInt(kTag[1])],
    };

    const events = await this.ndk.fetchEvents(filter);
    return events.size > 0 ? Array.from(events)[0] : null;
  }
}
```

### Content Publisher Service

```typescript
// lib/social/publisher-service.ts
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { POWR_EVENT_KINDS } from '../../types/nostr';

export class ContentPublisher {
  constructor(private ndk: NDKProvider) {}

  // Publish a workout record to Nostr
  async publishWorkoutRecord(
    workout: any, // Your app's workout type
    options: {
      shareAsSocialPost?: boolean;
      socialText?: string;
    } = {}
  ): Promise<NDKEvent> {
    // Convert workout to Nostr event format
    const event = new NDKEvent(this.ndk);
    event.kind = POWR_EVENT_KINDS.WORKOUT_RECORD;
    event.content = options.socialText || '';
    
    // Add required tags
    event.tags.push(['d', generateUUID()]); // Unique identifier
    event.tags.push(['title', workout.title]);
    event.tags.push(['type', workout.type]);
    
    // Add start/end time tags
    event.tags.push(['start', Math.floor(workout.startTime / 1000).toString()]);
    if (workout.endTime) {
      event.tags.push(['end', Math.floor(workout.endTime / 1000).toString()]);
    }
    
    // Add exercise tags
    workout.exercises.forEach(exercise => {
      const exerciseTag = ['exercise', exercise.title];
      
      // Add exercise details if available
      if (exercise.sets && exercise.sets.length > 0) {
        exercise.sets.forEach(set => {
          if (set.weight) exerciseTag.push(`${set.weight}kg`);
          if (set.reps) exerciseTag.push(`${set.reps} reps`);
        });
      }
      
      event.tags.push(exerciseTag);
    });
    
    // Add completion status
    event.tags.push(['completed', workout.isCompleted ? 'true' : 'false']);
    
    // Sign and publish
    await event.sign();
    await event.publish();

    // Optionally create a social post referencing this workout
    if (options.shareAsSocialPost) {
      await this.createSocialShare(event, options.socialText);
    }

    return event;
  }

  // Create a social post referencing a workout or template
  private async createSocialShare(
    event: NDKEvent,
    text?: string
  ): Promise<NDKEvent> {
    const post = new NDKEvent(this.ndk);
    post.kind = POWR_EVENT_KINDS.SOCIAL_POST;
    post.tags = [
      ['e', event.id],
      ['k', event.kind.toString()],
    ];
    post.content = text || 'Check out my workout!';
    
    await post.sign();
    await post.publish();
    
    return post;
  }

  // Like/react to a post
  async reactToEvent(
    event: NDKEvent,
    reaction: string = '+'
  ): Promise<NDKEvent> {
    const reactionEvent = new NDKEvent(this.ndk);
    reactionEvent.kind = 7; // Reaction
    reactionEvent.content = reaction;
    reactionEvent.tags = [
      ['e', event.id],
      ['p', event.pubkey]
    ];
    
    await reactionEvent.sign();
    await reactionEvent.publish();
    
    return reactionEvent;
  }
}

// Helper function to generate UUIDs for d-tags
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

## Custom Hooks

### Base Social Feed Hook

```typescript
// hooks/useSocialFeed.ts
import { useState, useEffect, useRef } from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { SocialFeedService } from '../lib/social/feed-service';

export function useSocialFeed(
  ndk: any,
  options: {
    feedType: 'following' | 'powr' | 'global',
    since?: number,
    limit?: number,
    authors?: string[],
  }
) {
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
  
  // Keep track of seen events to prevent duplicates
  const seenEvents = useRef(new Set<string>());
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Add event to state, avoiding duplicates
  const addEvent = (event: NDKEvent) => {
    if (seenEvents.current.has(event.id)) return;
    
    seenEvents.current.add(event.id);
    setEvents(prev => {
      const newEvents = [...prev, event];
      // Sort by created_at (most recent first)
      return newEvents.sort((a, b) => b.created_at - a.created_at);
    });
    
    // Update oldest timestamp for pagination
    if (!oldestTimestamp || event.created_at < oldestTimestamp) {
      setOldestTimestamp(event.created_at);
    }
  };

  // Load initial feed data
  const loadFeed = async () => {
    if (!ndk) return;
    
    setLoading(true);
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    try {
      const socialService = new SocialFeedService(ndk);
      
      // Create subscription
      const subscription = await socialService.subscribeFeed({
        feedType: options.feedType,
        since: options.since,
        limit: options.limit || 30,
        authors: options.authors,
        onEvent: addEvent,
      });
      
      subscriptionRef.current = subscription;
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh feed (clear events and reload)
  const refresh = async () => {
    setEvents([]);
    seenEvents.current.clear();
    setOldestTimestamp(null);
    setHasMore(true);
    await loadFeed();
  };

  // Load more (pagination)
  const loadMore = async () => {
    if (loading || !hasMore || !oldestTimestamp) return;
    
    try {
      setLoading(true);
      
      const socialService = new SocialFeedService(ndk);
      const moreEvents = await socialService.subscribeFeed({
        feedType: options.feedType,
        // Use oldest timestamp minus 1 second as the "until" parameter
        since: oldestTimestamp - 1,
        limit: options.limit || 30,
        authors: options.authors,
        onEvent: addEvent,
      });
      
      // If we got fewer events than requested, there are probably no more
      if (moreEvents.length < (options.limit || 30)) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount and when ndk or options change
  useEffect(() => {
    loadFeed();
    
    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [ndk, options.feedType, JSON.stringify(options.authors)]);

  return {
    events,
    loading,
    refresh,
    loadMore,
    hasMore,
  };
}
```

### Tab-Specific Hooks

```typescript
// hooks/useFollowingFeed.ts
import { useSocialFeed } from './useSocialFeed';
import { useNDK } from './useNDK';
import { useFollowList } from './useFollowList';

export function useFollowingFeed() {
  const ndk = useNDK();
  const { followedUsers } = useFollowList();
  
  return useSocialFeed(ndk, {
    feedType: 'following',
    authors: followedUsers,
  });
}

// hooks/usePOWRFeed.ts
import { useSocialFeed } from './useSocialFeed';
import { useNDK } from './useNDK';

export function usePOWRFeed() {
  const ndk = useNDK();
  
  return useSocialFeed(ndk, {
    feedType: 'powr',
  });
}

// hooks/useGlobalFeed.ts
import { useSocialFeed } from './useSocialFeed';
import { useNDK } from './useNDK';

export function useGlobalFeed() {
  const ndk = useNDK();
  
  return useSocialFeed(ndk, {
    feedType: 'global',
  });
}
```

## Data Transformation Utilities

```typescript
// utils/eventTransformers.ts
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { POWR_EVENT_KINDS } from '../types/nostr';
import { useProfileStore } from '../stores/profileStore';

// Transform a Nostr event to the format expected by SocialPost component
export function eventToPost(event: NDKEvent) {
  // Get profile information for the event author
  const authorProfile = useProfileStore.getState().getProfile(event.pubkey);
  
  // Base post object
  const basePost = {
    id: event.id,
    author: {
      name: authorProfile?.name || 'Unknown',
      handle: authorProfile?.name?.toLowerCase().replace(/\s/g, '') || 'unknown',
      avatar: authorProfile?.picture || '',
      pubkey: event.pubkey,
      verified: isPOWRTeamMember(event.pubkey)
    },
    content: event.content,
    createdAt: new Date(event.created_at * 1000),
    metrics: {
      likes: 0, // These will be filled in later
      comments: 0,
      reposts: 0
    }
  };
  
  // Adapt based on event kind
  switch(event.kind) {
    case POWR_EVENT_KINDS.WORKOUT_RECORD:
      return {
        ...basePost,
        workout: extractWorkoutData(event)
      };
      
    case POWR_EVENT_KINDS.EXERCISE_TEMPLATE:
      return {
        ...basePost,
        exerciseTemplate: extractExerciseTemplateData(event)
      };
      
    case POWR_EVENT_KINDS.WORKOUT_TEMPLATE:
      return {
        ...basePost,
        workoutTemplate: extractWorkoutTemplateData(event)
      };
      
    case POWR_EVENT_KINDS.SOCIAL_POST:
      // For social posts, we need to check if they reference workout content
      return {
        ...basePost,
        // This will be filled in asynchronously
        referencedContent: null
      };
      
    default:
      return basePost;
  }
}

// Extract workout data from a workout record event
function extractWorkoutData(event: NDKEvent) {
  const title = getEventTag(event, 'title') || 'Untitled Workout';
  const type = getEventTag(event, 'type') || 'strength';
  
  // Get exercise tags
  const exerciseTags = event.tags.filter(tag => tag[0] === 'exercise');
  const exercises = exerciseTags.map(tag => {
    return {
      title: tag[1] || 'Unknown Exercise',
      // Extract other exercise data from tags if available
      sets: tag[2] ? parseInt(tag[2]) : null,
      reps: tag[3] ? parseInt(tag[3]) : null,
    };
  });
  
  // Calculate duration if start/end times are available
  const startTag = getEventTag(event, 'start');
  const endTag = getEventTag(event, 'end');
  let duration = null;
  
  if (startTag && endTag) {
    const startTime = parseInt(startTag);
    const endTime = parseInt(endTag);
    if (!isNaN(startTime) && !isNaN(endTime)) {
      duration = Math.floor((endTime - startTime) / 60); // Duration in minutes
    }
  }
  
  return {
    title,
    type,
    exercises,
    duration
  };
}

// Extract exercise template data from an event
function extractExerciseTemplateData(event: NDKEvent) {
  const title = getEventTag(event, 'title') || 'Untitled Exercise';
  const equipment = getEventTag(event, 'equipment');
  const difficulty = getEventTag(event, 'difficulty');
  
  // Get format information
  const formatTag = event.tags.find(tag => tag[0] === 'format');
  const formatUnitsTag = event.tags.find(tag => tag[0] === 'format_units');
  
  // Get tags (like muscle groups)
  const tags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
    
  return {
    title,
    equipment,
    difficulty,
    format: formatTag ? formatTag.slice(1) : [],
    formatUnits: formatUnitsTag ? formatUnitsTag.slice(1) : [],
    tags
  };
}

// Extract workout template data from an event
function extractWorkoutTemplateData(event: NDKEvent) {
  const title = getEventTag(event, 'title') || 'Untitled Template';
  const type = getEventTag(event, 'type') || 'strength';
  
  // Get exercise references
  const exerciseTags = event.tags.filter(tag => tag[0] === 'exercise');
  const exercises = exerciseTags.map(tag => {
    return {
      reference: tag[1] || '',
      // Extract parameter data if available
      params: tag.slice(2)
    };
  });
  
  // Get other metadata
  const rounds = getEventTag(event, 'rounds');
  const duration = getEventTag(event, 'duration');
  const interval = getEventTag(event, 'interval');
  
  // Get tags (like workout category)
  const tags = event.tags
    .filter(tag => tag[0] === 't')
    .map(tag => tag[1]);
    
  return {
    title,
    type,
    exercises,
    rounds: rounds ? parseInt(rounds) : null,
    duration: duration ? parseInt(duration) : null,
    interval: interval ? parseInt(interval) : null,
    tags
  };
}

// Helper to get a tag value
function getEventTag(event: NDKEvent, tagName: string): string | null {
  const tag = event.tags.find(t => t[0] === tagName);
  return tag ? tag[1] : null;
}

// Check if the pubkey belongs to the POWR team
function isPOWRTeamMember(pubkey: string): boolean {
  const powrTeamPubkeys = [
    // Add POWR team public keys here
  ];
  return powrTeamPubkeys.includes(pubkey);
}
```

## Updated Screen Components

### Following Tab

```typescript
// app/(tabs)/social/following.tsx
import React, { useMemo } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import SocialPost from '@/components/social/SocialPost';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import NostrLoginPrompt from '@/components/social/NostrLoginPrompt';
import EmptyFeed from '@/components/social/EmptyFeed';
import { useFollowingFeed } from '@/hooks/useFollowingFeed';
import { eventToPost } from '@/utils/eventTransformers';

export default function FollowingScreen() {
  const { isAuthenticated } = useNDKCurrentUser();
  const { events, loading, refresh, loadMore } = useFollowingFeed();
  
  // Transform Nostr events to the format expected by SocialPost
  const posts = useMemo(() => 
    events.map(eventToPost).filter(Boolean), 
    [events]
  );

  if (!isAuthenticated) {
    return <NostrLoginPrompt message="Log in to see posts from people you follow" />;
  }

  if (posts.length === 0 && !loading) {
    return <EmptyFeed message="You're not following anyone yet. Discover people to follow in the POWR or Global feeds." />;
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SocialPost post={item} />}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      contentContainerStyle={{ flexGrow: 1 }}
      ListEmptyComponent={
        loading ? (
          <View className="flex-1 items-center justify-center p-8">
            <Text>Loading posts...</Text>
          </View>
        ) : null
      }
    />
  );
}
```

### POWR Tab

```typescript
// app/(tabs)/social/powr.tsx
import React, { useMemo } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import SocialPost from '@/components/social/SocialPost';
import { Zap } from 'lucide-react-native';
import POWRPackSection from '@/components/social/POWRPackSection';
import { usePOWRFeed } from '@/hooks/usePOWRFeed';
import { eventToPost } from '@/utils/eventTransformers';

export default function PowerScreen() {
  const { events, loading, refresh, loadMore } = usePOWRFeed();
  
  // Transform Nostr events to the format expected by SocialPost
  const posts = useMemo(() => 
    events.map(eventToPost).filter(Boolean), 
    [events]
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SocialPost post={item} />}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <>
          {/* POWR Welcome Section - Maintain existing UI */}
          <View className="p-4 border-b border-border bg-primary/5">
            <View className="flex-row items-center mb-2">
              <Zap size={20} className="mr-2 text-primary" fill="currentColor" />
              <Text className="text-lg font-bold">POWR Community</Text>
            </View>
            <Text className="text-muted-foreground">
              Official updates, featured content, and community highlights from the POWR team.
            </Text>
          </View>

          {/* POWR Packs Section - Maintain existing component */}
          <POWRPackSection />
        </>
      }
      ListEmptyComponent={
        loading ? (
          <View className="flex-1 items-center justify-center p-8">
            <Text>Loading POWR content...</Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-8">
            <Text>No POWR content found</Text>
          </View>
        )
      }
    />
  );
}
```

### Global Tab

```typescript
// app/(tabs)/social/global.tsx
import React, { useMemo } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import SocialPost from '@/components/social/SocialPost';
import { useGlobalFeed } from '@/hooks/useGlobalFeed';
import { eventToPost } from '@/utils/eventTransformers';

export default function GlobalScreen() {
  const { events, loading, refresh, loadMore } = useGlobalFeed();
  
  // Transform Nostr events to the format expected by SocialPost
  const posts = useMemo(() => 
    events.map(eventToPost).filter(Boolean), 
    [events]
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SocialPost post={item} />}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        loading ? (
          <View className="flex-1 items-center justify-center p-8">
            <Text>Loading global content...</Text>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-8">
            <Text>No global content found</Text>
          </View>
        )
      }
    />
  );
}
```

## Enhanced SocialPost Component

The existing SocialPost component needs updates to handle Nostr-based content:

```typescript
// components/social/SocialPost.tsx
import React, { useState, useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Repeat, Share } from 'lucide-react-native';
import { useNDK } from '@/lib/hooks/useNDK';
import { SocialFeedService } from '@/lib/social/feed-service';
import { ContentPublisher } from '@/lib/social/publisher-service';
import { CommentSection } from './CommentSection';
import WorkoutContent from './content/WorkoutContent';
import TemplateContent from './content/TemplateContent';
import ExerciseContent from './content/ExerciseContent';

export default function SocialPost({ post }) {
  const ndk = useNDK();
  const [showComments, setShowComments] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(post.metrics?.likes || 0);
  const [comments, setComments] = useState(post.metrics?.comments || 0);
  const [referencedContent, setReferencedContent] = useState(post.referencedContent);
  
  // Fetch referenced content if needed (for kind:1 posts that reference workout content)
  useEffect(() => {
    if (post.eventId && post.eventKind === 1 && !referencedContent && ndk) {
      const fetchReferencedContent = async () => {
        try {
          const socialService = new SocialFeedService(ndk);
          const content = await socialService.getReferencedContent(post.eventId);
          if (content) {
            setReferencedContent(content);
          }
        } catch (error) {
          console.error('Error fetching referenced content:', error);
        }
      };
      
      fetchReferencedContent();
    }
  }, [post.eventId, post.eventKind, referencedContent, ndk]);
  
  // Handle like button press
  const handleLike = async () => {
    if (!ndk) return;
    
    try {
      const contentPublisher = new ContentPublisher(ndk);
      await contentPublisher.reactToEvent(post.eventId, '+');
      
      // Update UI state
      setIsLiked(true);
      setLikes(prev => prev + 1);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };
  
  // Handle comment button press
  const handleComment = () => {
    setShowComments(!showComments);
  };
  
  // Format timestamp
  const formatTimestamp = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    
    return date.toLocaleDateString();
  };

  return (
    <View className="p-4 border-b border-border">
      {/* Author info */}
      <View className="flex-row items-center mb-3">
        <Avatar
          className="h-10 w-10 mr-3"
          source={{ uri: post.author.avatar }}
        />
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-semibold">{post.author.name}</Text>
            {post.author.verified && (
              <View className="ml-1 bg-primary rounded-full h-4 w-4 items-center justify-center">
                <Text className="text-white text-xs">✓</Text>
              </View>
            )}
          </View>
          <Text className="text-muted-foreground text-xs">
            {formatTimestamp(post.createdAt)}
          </Text>
        </View>
      </View>

      {/* Post content */}
      {post.content && (
        <Text className="mb-3">{post.content}</Text>
      )}

      {/* Workout/Exercise/Template content */}
      {post.workout && (
        <WorkoutContent
          workout={post.workout}
          className="mb-3 bg-muted/30 p-3 rounded-lg"
        />
      )}
      
      {post.workoutTemplate && (
        <TemplateContent
          template={post.workoutTemplate}
          className="mb-3 bg-muted/30 p-3 rounded-lg"
        />
      )}
      
      {post.exerciseTemplate && (
        <ExerciseContent
          exercise={post.exerciseTemplate}
          className="mb-3 bg-muted/30 p-3 rounded-lg"
        />
      )}
      
      {/* Referenced content (for kind:1 posts) */}
      {referencedContent && (
        <View className="mb-3 bg-muted/30 p-3 rounded-lg">
          {/* Render based on content type */}
          {referencedContent.type === 'workout' && (
            <WorkoutContent workout={referencedContent.data} />
          )}
          {referencedContent.type === 'template' && (
            <TemplateContent template={referencedContent.data} />
          )}
          {referencedContent.type === 'exercise' && (
            <ExerciseContent exercise={referencedContent.data} />
          )}
        </View>
      )}

      {/* Interaction buttons */}
      <View className="flex-row items-center justify-between mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-row items-center"
          onPress={handleLike}
        >
          <Heart
            size={18}
            className={isLiked ? "text-destructive" : "text-muted-foreground"}
            fill={isLiked ? "currentColor" : "none"}
          />
          <Text className="ml-1">{likes}</Text>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex-row items-center"
          onPress={handleComment}
        >
          <MessageCircle
            size={18}
            className="text-muted-foreground"
          />
          <Text className="ml-1">{comments}</Text>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex-row items-center"
        >
          <Repeat
            size={18}
            className="text-muted-foreground"
          />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="flex-row items-center"
        >
          <Share
            size={18}
            className="text-muted-foreground"
          />
        </Button>
      </View>

      {/* Comments section */}
      {showComments && (
        <CommentSection
          eventId={post.eventId}
          onNewComment={() => setComments(prev => prev + 1)}
        />
      )}
    </View>
  );
}
```

## Comments System

```typescript
// components/social/CommentSection.tsx
import React, { useState, useEffect } from 'react';
import { View, FlatList } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { useNDK } from '@/lib/hooks/useNDK';
import { SocialFeedService } from '@/lib/social/feed-service';
import CommentItem from './CommentItem';

export default function CommentSection({ eventId, onNewComment }) {
  const ndk = useNDK();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      if (!ndk || !eventId) return;
      
      setLoading(true);
      try {
        const socialService = new SocialFeedService(ndk);
        const fetchedComments = await socialService.getComments(eventId);
        
        // Convert to format needed by the UI
        const formattedComments = buildCommentTree(fetchedComments);
        setComments(formattedComments);
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadComments();
  }, [eventId, ndk]);

  // Submit a new comment
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !ndk || !eventId || submitting) return;
    
    setSubmitting(true);
    try {
      const socialService = new SocialFeedService(ndk);
      const comment = await socialService.postComment(eventId, commentText.trim());
      
      // Add new comment to the list
      setComments(prev => [...prev, {
        id: comment.id,
        content: commentText.trim(),
        createdAt: new Date(),
        author: { /* get current user info */ },
        replies: []
      }]);
      
      // Clear input
      setCommentText('');
      
      // Notify parent
      onNewComment?.();
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Build threaded comment structure
  const buildCommentTree = (comments) => {
    const commentMap = new Map();
    const rootComments = [];
    
    // Create all comment nodes
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        id: comment.id,
        content: comment.content,
        createdAt: new Date(comment.created_at * 1000),
        author: {
          name: 'User', // This should be filled in from profiles
          avatar: '',
          pubkey: comment.pubkey
        },
        replies: []
      });
    });
    
    // Build tree structure
    comments.forEach(comment => {
      const replyToTag = comment.tags.find(tag => 
        tag[0] === 'e' && tag[3] === 'reply'
      );
      
      if (replyToTag) {
        const parentId = replyToTag[1];
        const parent = commentMap.get(parentId);
        const node = commentMap.get(comment.id);
        
        if (parent && node) {
          parent.replies.push(node);
        } else {
          rootComments.push(commentMap.get(comment.id));
        }
      } else {
        rootComments.push(commentMap.get(comment.id));
      }
    });
    
    return rootComments;
  };

  if (loading) {
    return (
      <View className="mt-3 p-3">
        <Text>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View className="mt-3">
      {/* Comment list */}
      <View className="mb-3">
        {comments.length === 0 ? (
          <Text className="text-muted-foreground p-3">No comments yet. Be the first!</Text>
        ) : (
          comments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              eventId={eventId}
              onNewReply={onNewComment}
            />
          ))
        )}
      </View>
      
      {/* Comment input */}
      <View className="flex-row border-t border-border pt-3">
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
          className="flex-1 mr-2"
        />
        <Button
          disabled={!commentText.trim() || submitting}
          onPress={handleSubmitComment}
        >
          {submitting ? 'Posting...' : 'Post'}
        </Button>
      </View>
    </View>
  );
}

// components/social/CommentItem.tsx
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNDK } from '@/lib/hooks/useNDK';
import { SocialFeedService } from '@/lib/social/feed-service';
import { TextInput } from '@/components/ui/text-input';

export default function CommentItem({ comment, eventId, depth = 0, onNewReply }) {
  const ndk = useNDK();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Format timestamp
  const formatTimestamp = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    
    return date.toLocaleDateString();
  };

  // Submit a reply
  const handleSubmitReply = async () => {
    if (!replyText.trim() || !ndk || !eventId || submitting) return;
    
    setSubmitting(true);
    try {
      const socialService = new SocialFeedService(ndk);
      await socialService.postComment(eventId, replyText.trim(), comment.id);
      
      // Clear input and hide reply field
      setReplyText('');
      setShowReplyInput(false);
      
      // Notify parent
      onNewReply?.();
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View 
      className="py-2"
      style={{ marginLeft: depth * 16 }}
    >
      {/* Comment header */}
      <View className="flex-row items-center mb-1">
        <Avatar
          className="h-6 w-6 mr-2"
          source={{ uri: comment.author.avatar }}
        />
        <Text className="font-medium mr-2">{comment.author.name}</Text>
        <Text className="text-xs text-muted-foreground">
          {formatTimestamp(comment.createdAt)}
        </Text>
      </View>
      
      {/* Comment content */}
      <Text className="mb-1">{comment.content}</Text>
      
      {/* Reply button */}
      <Pressable
        onPress={() => setShowReplyInput(!showReplyInput)}
        className="mb-2"
      >
        <Text className="text-xs text-primary">Reply</Text>
      </Pressable>
      
      {/* Reply input */}
      {showReplyInput && (
        <View className="flex-row mb-3">
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder="Write a reply..."
            className="flex-1 mr-2"
          />
          <Button
            size="sm"
            disabled={!replyText.trim() || submitting}
            onPress={handleSubmitReply}
          >
            {submitting ? '...' : 'Reply'}
          </Button>
        </View>
      )}
      
      {/* Replies */}
      {comment.replies?.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          eventId={eventId}
          depth={depth + 1}
          onNewReply={onNewReply}
        />
      ))}
    </View>
  );
}
```

## Content Sharing Integration

```typescript
// components/social/ShareWorkout.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { useNDK } from '@/lib/hooks/useNDK';
import { ContentPublisher } from '@/lib/social/publisher-service';
import WorkoutContent from './content/WorkoutContent';

export default function ShareWorkout({ workout, onShare }) {
  const ndk = useNDK();
  const [socialText, setSocialText] = useState('');
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!ndk || sharing) return;
    
    setSharing(true);
    try {
      const publisher = new ContentPublisher(ndk);
      await publisher.publishWorkoutRecord(workout, {
        shareAsSocialPost: true,
        socialText,
      });
      
      // Notify parent
      onShare?.();
    } catch (error) {
      console.error('Error sharing workout:', error);
    } finally {
      setSharing(false);
    }
  };

  return (
    <View className="bg-card rounded-lg p-4">
      <Text className="text-lg font-semibold mb-2">Share Your Workout</Text>
      
      {/* Preview */}
      <View className="mb-4 bg-muted/20 p-3 rounded-lg">
        <WorkoutContent workout={workout} />
      </View>
      
      {/* Text input */}
      <TextInput
        value={socialText}
        onChangeText={setSocialText}
        placeholder="Add a message with your workout..."
        multiline
        className="mb-4 min-h-[100px]"
      />
      
      {/* Share button */}
      <Button
        disabled={sharing}
        onPress={handleShare}
        className="w-full"
      >
        {sharing ? 'Sharing...' : 'Share to Nostr'}
      </Button>
    </View>
  );
}
```

## Implementation Timeline

1. **Week 1: Infrastructure Setup**
   - Configure NDK Mobile with SQLite adapter
   - Implement core services (SocialFeedService, ContentPublisher)
   - Set up data model and event type definitions

2. **Week 2: Data Fetching & Transformation**
   - Implement useSocialFeed hook
   - Create tab-specific hooks (useFollowingFeed, usePOWRFeed, useGlobalFeed)
   - Build data transformation utilities
   - Test social feed fetching with mock UI

3. **Week 3: UI Components**
   - Update SocialPost component to handle Nostr events
   - Implement Comment system components
   - Build content renderers for different event types
   - Integrate with existing UI components

4. **Week 4: Social Interactions & Polish**
   - Implement like/comment functionality
   - Build workout sharing component
   - Add profile integration
   - Optimize performance
   - Implement error handling and loading states

## Key Considerations

1. **Authentication Integration**
   - The social feed should work seamlessly with existing authentication
   - Show appropriate prompts for unauthenticated users
   - Handle authentication state changes gracefully

2. **Performance Optimization**
   - Use FlatList instead of ScrollView for better performance
   - Implement proper pagination with infinite scroll
   - Optimize data fetching to reduce unnecessary requests

3. **Offline Support**
   - Leverage SQLite adapter for caching events
   - Implement offline detection and appropriate UI feedback
   - Queue interactions (likes, comments) when offline for later submission

4. **Error Handling**
   - Gracefully handle network errors
   - Provide clear feedback on publishing failures
   - Implement retry mechanisms for failed operations

5. **UI Consistency**
   - Maintain existing styling patterns
   - Preserve custom components like POWRPackSection
   - Follow established interaction patterns

This implementation plan maintains the look and feel of your existing social feed UI while integrating Nostr as the backend data source. The implementation focuses on adapting the data from Nostr events to fit your existing UI components, rather than replacing them with new ones.