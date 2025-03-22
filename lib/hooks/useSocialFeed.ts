// hooks/useSocialFeed.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { nip19 } from 'nostr-tools';
import { SocialFeedService } from '@/lib/social/socialFeedService';
import { useNDK } from '@/lib/hooks/useNDK';
import { 
  parseWorkoutRecord, 
  parseExerciseTemplate, 
  parseWorkoutTemplate,
  parseSocialPost,
  parseLongformContent,
  POWR_EVENT_KINDS,
  ParsedWorkoutRecord,
  ParsedExerciseTemplate,
  ParsedWorkoutTemplate,
  ParsedSocialPost,
  ParsedLongformContent
} from '@/types/nostr-workout';
import { POWR_PUBKEY_HEX } from './useFeedHooks';

export type FeedItem = {
  id: string;
  type: 'workout' | 'exercise' | 'template' | 'social' | 'article';
  originalEvent: NDKEvent;
  parsedContent: ParsedWorkoutRecord | ParsedExerciseTemplate | ParsedWorkoutTemplate | ParsedSocialPost | ParsedLongformContent;
  createdAt: number;
};

export function useSocialFeed(
  options: {
    feedType: 'following' | 'powr' | 'global';
    since?: number;
    until?: number;
    limit?: number;
    authors?: string[];
    kinds?: number[];
  }
) {
  const { ndk } = useNDK();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
  
  // Keep track of seen events to prevent duplicates
  const seenEvents = useRef(new Set<string>());
  const quotedEvents = useRef(new Set<string>());
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const socialServiceRef = useRef<SocialFeedService | null>(null);
  
  // Process event and add to feed
  const processEvent = useCallback((event: NDKEvent) => {
    // Skip if we've seen this event before or event has no ID
    if (!event.id || seenEvents.current.has(event.id)) return;
    
    console.log(`Processing event ${event.id}, kind ${event.kind} from ${event.pubkey}`);
    
    // Check if this event is quoted by another event we've already seen
    // Skip unless it's from the POWR account (always show POWR content)
    if (
      quotedEvents.current.has(event.id) && 
      event.pubkey !== POWR_PUBKEY_HEX
    ) {
      console.log(`Event ${event.id} filtered out: quoted=${true}, pubkey=${event.pubkey}`);
      return;
    }
    
    // Track any events this quotes to avoid showing them separately
    if (event.kind === 1) {
      // Check e-tags (direct quotes)
      event.tags
        .filter(tag => tag[0] === 'e')
        .forEach(tag => {
          if (tag[1]) quotedEvents.current.add(tag[1]);
        });
        
      // Check a-tags (addressable events)
      event.tags
        .filter(tag => tag[0] === 'a')
        .forEach(tag => {
          const parts = tag[1]?.split(':');
          if (parts && parts.length >= 3) {
            const [kind, pubkey, identifier] = parts;
            // We track the identifier so we can match it with the d-tag
            // of addressable events (kinds 30023, 33401, 33402, etc.)
            if (pubkey && identifier) {
              quotedEvents.current.add(`${pubkey}:${identifier}`);
            }
          }
        });
        
      // Also check for quoted content using NIP-27 nostr: URI mentions
      if (event.content) {
        const nostrUriMatches = event.content.match(/nostr:(note1|nevent1|naddr1)[a-z0-9]+/g);
        if (nostrUriMatches) {
          nostrUriMatches.forEach(uri => {
            try {
              const decoded = nip19.decode(uri.replace('nostr:', ''));
              if (decoded.type === 'note' || decoded.type === 'nevent') {
                quotedEvents.current.add(decoded.data as string);
              } else if (decoded.type === 'naddr') {
                // For addressable content, add to tracking using pubkey:identifier format
                const data = decoded.data as any;
                quotedEvents.current.add(`${data.pubkey}:${data.identifier}`);
              }
            } catch (e) {
              // Ignore invalid nostr URIs
            }
          });
        }
      }
    }
    
    // Mark as seen
    seenEvents.current.add(event.id);
    
    // Parse event based on kind
    let feedItem: FeedItem | null = null;
    
    try {
      const timestamp = event.created_at || Math.floor(Date.now() / 1000);
      
      switch (event.kind) {
        case POWR_EVENT_KINDS.WORKOUT_RECORD: // 1301
          feedItem = {
            id: event.id,
            type: 'workout',
            originalEvent: event,
            parsedContent: parseWorkoutRecord(event),
            createdAt: timestamp
          };
          break;
          
        case POWR_EVENT_KINDS.EXERCISE_TEMPLATE: // 33401
          feedItem = {
            id: event.id,
            type: 'exercise',
            originalEvent: event,
            parsedContent: parseExerciseTemplate(event),
            createdAt: timestamp
          };
          break;
          
        case POWR_EVENT_KINDS.WORKOUT_TEMPLATE: // 33402
          feedItem = {
            id: event.id,
            type: 'template',
            originalEvent: event,
            parsedContent: parseWorkoutTemplate(event),
            createdAt: timestamp
          };
          break;
          
        case POWR_EVENT_KINDS.SOCIAL_POST: // 1
          // Parse social post
          const parsedSocialPost = parseSocialPost(event);
          
          feedItem = {
            id: event.id,
            type: 'social',
            originalEvent: event,
            parsedContent: parsedSocialPost,
            createdAt: timestamp
          };
          
          // If it has quoted content, resolve it asynchronously
          const quotedContent = parsedSocialPost.quotedContent;
          if (quotedContent && socialServiceRef.current) {
            socialServiceRef.current.getReferencedContent(quotedContent.id, quotedContent.kind)
              .then(referencedEvent => {
                if (!referencedEvent) return;
                
                // Parse the referenced event
                let resolvedContent: any = null;
                
                switch (referencedEvent.kind) {
                  case POWR_EVENT_KINDS.WORKOUT_RECORD:
                    resolvedContent = parseWorkoutRecord(referencedEvent);
                    break;
                  case POWR_EVENT_KINDS.EXERCISE_TEMPLATE:
                    resolvedContent = parseExerciseTemplate(referencedEvent);
                    break;
                  case POWR_EVENT_KINDS.WORKOUT_TEMPLATE:
                    resolvedContent = parseWorkoutTemplate(referencedEvent);
                    break;
                  case 30023:
                  case 30024:
                    resolvedContent = parseLongformContent(referencedEvent);
                    break;
                }
                
                if (resolvedContent) {
                  // Update the feed item with the referenced content
                  setFeedItems(current => {
                    return current.map(item => {
                      if (item.id !== event.id) return item;
                      
                      // Add the resolved content to the social post
                      const updatedContent = {
                        ...(item.parsedContent as ParsedSocialPost),
                        quotedContent: {
                          ...quotedContent,
                          resolved: resolvedContent
                        }
                      };
                      
                      return {
                        ...item,
                        parsedContent: updatedContent
                      };
                    });
                  });
                }
              })
              .catch(error => {
                console.error('Error fetching referenced content:', error);
              });
          }
          break;
          
        case 30023: // Published long-form content
          feedItem = {
            id: event.id,
            type: 'article',
            originalEvent: event,
            parsedContent: parseLongformContent(event),
            createdAt: timestamp
          };
          break;
          
        case 30024: // Draft long-form content - only show from POWR account
          if (event.pubkey === POWR_PUBKEY_HEX && options.feedType === 'powr') {
            feedItem = {
              id: event.id,
              type: 'article',
              originalEvent: event,
              parsedContent: parseLongformContent(event),
              createdAt: timestamp
            };
          }
          break;
          
        default:
          // Ignore other event kinds
          return;
      }
      
      // For addressable events (those with d-tags), also check if they're quoted
      if (
        (event.kind >= 30000 || event.kind === 1301) && 
        event.pubkey !== POWR_PUBKEY_HEX
      ) {
        const dTags = event.getMatchingTags('d');
        if (dTags.length > 0) {
          const identifier = dTags[0][1];
          if (identifier && quotedEvents.current.has(`${event.pubkey}:${identifier}`)) {
            // This addressable event is quoted, so we'll skip it
            console.log(`Addressable event ${event.id} filtered out: quoted as ${event.pubkey}:${identifier}`);
            return;
          }
        }
      }
      
      // Add to feed items if we were able to parse it
      if (feedItem) {
        console.log(`Adding event ${event.id} to feed as ${feedItem.type}`);
        setFeedItems(current => {
          const newItems = [...current, feedItem as FeedItem];
          // Sort by created_at (most recent first)
          return newItems.sort((a, b) => b.createdAt - a.createdAt);
        });
        
        // Update oldest timestamp for pagination
        if (!oldestTimestamp || (timestamp && timestamp < oldestTimestamp)) {
          setOldestTimestamp(timestamp);
        }
      }
    } catch (error) {
      console.error('Error processing event:', error, event);
    }
  }, [oldestTimestamp, options.feedType]);

  // Load feed data
  const loadFeed = useCallback(async () => {
    if (!ndk) return;
    
    setLoading(true);
    
    // Initialize social service if not already done
    if (!socialServiceRef.current) {
      socialServiceRef.current = new SocialFeedService(ndk);
    }
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    try {
      console.log(`Loading ${options.feedType} feed with authors:`, options.authors);
      
      // Subscribe to feed
      const subscription = await socialServiceRef.current.subscribeFeed({
        feedType: options.feedType,
        since: options.since,
        until: options.until,
        limit: options.limit || 30,
        authors: options.authors,
        kinds: options.kinds,
        onEvent: processEvent,
        onEose: () => {
          setLoading(false);
        }
      });
      
      subscriptionRef.current = subscription;
    } catch (error) {
      console.error('Error loading feed:', error);
      setLoading(false);
    }
  }, [ndk, options.feedType, options.since, options.until, options.limit, options.authors, options.kinds, processEvent]);

  // Refresh feed (clear events and reload)
  const refresh = useCallback(async () => {
    console.log(`Refreshing ${options.feedType} feed`);
    setFeedItems([]);
    seenEvents.current.clear();
    quotedEvents.current.clear(); // Also reset quoted events
    setOldestTimestamp(null);
    setHasMore(true);
    await loadFeed();
  }, [loadFeed, options.feedType]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !oldestTimestamp || !ndk || !socialServiceRef.current) return;
    
    try {
      setLoading(true);
      
      // Keep track of the current count of seen events
      const initialCount = seenEvents.current.size;
      
      // Subscribe with oldest timestamp - 1 second
      const subscription = await socialServiceRef.current.subscribeFeed({
        feedType: options.feedType,
        since: options.since,
        until: oldestTimestamp - 1, // Load events older than our oldest event
        limit: options.limit || 30,
        authors: options.authors,
        kinds: options.kinds,
        onEvent: processEvent,
        onEose: () => {
          setLoading(false);
          
          // Check if we got any new events
          if (seenEvents.current.size === initialCount) {
            // No new events were added, so we've likely reached the end
            setHasMore(false);
          }
        }
      });
      
      // Clean up this subscription after we get the events
      setTimeout(() => {
        subscription.unsubscribe();
      }, 5000);
    } catch (error) {
      console.error('Error loading more:', error);
      setLoading(false);
    }
  }, [loading, hasMore, oldestTimestamp, ndk, options.feedType, options.since, options.limit, options.authors, options.kinds, processEvent]);

  // Load feed on mount or when dependencies change
  useEffect(() => {
    if (ndk) {
      loadFeed();
    }
    
    // Clean up subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [ndk, loadFeed]);

  return {
    feedItems,
    loading,
    refresh,
    loadMore,
    hasMore,
    socialService: socialServiceRef.current
  };
}