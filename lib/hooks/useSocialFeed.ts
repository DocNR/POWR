// hooks/useSocialFeed.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NDKEvent, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk-mobile';
import { nip19 } from 'nostr-tools';
import { SocialFeedService } from '@/lib/social/socialFeedService';
import { useNDK } from '@/lib/hooks/useNDK';
import { SQLiteDatabase } from 'expo-sqlite';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';
import { useDatabase } from '@/components/DatabaseProvider';
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
    feedType: 'following' | 'powr' | 'global' | 'profile';
    since?: number;
    until?: number;
    limit?: number;
    authors?: string[];
    kinds?: number[];
  }
) {
  const { ndk } = useNDK();
  const db = useDatabase();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  // Keep track of seen events to prevent duplicates
  const seenEvents = useRef(new Set<string>());
  const quotedEvents = useRef(new Set<string>());
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const socialServiceRef = useRef<SocialFeedService | null>(null);
  
  // Subscription cooldown to prevent rapid resubscriptions
  const subscriptionCooldown = useRef<NodeJS.Timeout | null>(null);
  const cooldownPeriod = 2000; // 2 seconds
  const subscriptionAttempts = useRef(0);
  const maxSubscriptionAttempts = 3;
  
  // Initialize social service
  useEffect(() => {
    if (ndk && !socialServiceRef.current) {
      try {
        console.log('[useSocialFeed] Initializing SocialFeedService');
        socialServiceRef.current = new SocialFeedService(ndk, db);
        console.log('[useSocialFeed] SocialFeedService initialized successfully');
      } catch (error) {
        console.error('[useSocialFeed] Error initializing SocialFeedService:', error);
        // Log more detailed error information
        if (error instanceof Error) {
          console.error(`[useSocialFeed] Error details: ${error.message}`);
          if (error.stack) {
            console.error(`[useSocialFeed] Stack trace: ${error.stack}`);
          }
        }
        
        // Try again after a delay
        const retryTimer = setTimeout(() => {
          console.log('[useSocialFeed] Retrying SocialFeedService initialization');
          try {
            socialServiceRef.current = new SocialFeedService(ndk, db);
            console.log('[useSocialFeed] SocialFeedService initialized successfully on retry');
          } catch (retryError) {
            console.error('[useSocialFeed] Failed to initialize SocialFeedService on retry:', retryError);
          }
        }, 3000);
        
        return () => clearTimeout(retryTimer);
      }
    }
  }, [ndk, db]);
  
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
          
        // We no longer process kind 30024 (draft articles) in any feed
          
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

  // Check connectivity status
  useEffect(() => {
    const checkConnectivity = async () => {
      const isOnline = await ConnectivityService.getInstance().checkNetworkStatus();
      setIsOffline(!isOnline);
    };
    
    checkConnectivity();
    
    // Set up interval to check connectivity
    const interval = setInterval(checkConnectivity, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Memoize feed options to prevent unnecessary resubscriptions
  const feedOptions = useMemo(() => {
    // Default time ranges based on feed type
    let defaultTimeRange: number;
    
    // Use longer time ranges for following and POWR feeds since they have less content
    switch (options.feedType) {
      case 'following':
      case 'powr':
        // 30 days for following and POWR feeds
        defaultTimeRange = 30 * 24 * 60 * 60;
        break;
      case 'profile':
        // 60 days for profile feeds
        defaultTimeRange = 60 * 24 * 60 * 60;
        break;
      case 'global':
      default:
        // 7 days for global feed
        defaultTimeRange = 7 * 24 * 60 * 60;
        break;
    }
    
    // Calculate default since timestamp
    const defaultSince = Math.floor(Date.now() / 1000) - defaultTimeRange;
    
    // Only use the provided since if it's explicitly set in options
    // Otherwise use our default
    const since = options.since || defaultSince;
    
    return {
      feedType: options.feedType,
      since,
      until: options.until,
      limit: options.limit || 30,
      authors: options.authors,
      kinds: options.kinds,
    };
  }, [options.feedType, options.authors, options.kinds, options.limit, options.since, options.until]);
  
  // Load feed data
  const loadFeed = useCallback(async () => {
    if (!ndk) return;
    
    // Prevent rapid resubscriptions
    if (subscriptionCooldown.current) {
      console.log('[useSocialFeed] Subscription on cooldown, skipping');
      return;
    }
    
    // Track subscription attempts to prevent infinite loops
    subscriptionAttempts.current += 1;
    if (subscriptionAttempts.current > maxSubscriptionAttempts) {
      console.error(`[useSocialFeed] Too many subscription attempts (${subscriptionAttempts.current}), giving up`);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Initialize social service if not already done
    if (!socialServiceRef.current) {
      try {
        console.log('[useSocialFeed] Initializing SocialFeedService in loadFeed');
        socialServiceRef.current = new SocialFeedService(ndk, db);
        console.log('[useSocialFeed] SocialFeedService initialized successfully in loadFeed');
      } catch (error) {
        console.error('[useSocialFeed] Error initializing SocialFeedService in loadFeed:', error);
        // Log more detailed error information
        if (error instanceof Error) {
          console.error(`[useSocialFeed] Error details: ${error.message}`);
          if (error.stack) {
            console.error(`[useSocialFeed] Stack trace: ${error.stack}`);
          }
        }
        
        setLoading(false);
        return; // Exit early if we can't initialize the service
      }
    }
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      console.log(`[useSocialFeed] Cleaning up existing subscription for ${feedOptions.feedType} feed`);
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    // Set a cooldown to prevent rapid resubscriptions
    // Increased from 2 seconds to 5 seconds to reduce subscription frequency
    subscriptionCooldown.current = setTimeout(() => {
      subscriptionCooldown.current = null;
      // Reset attempt counter after cooldown period
      subscriptionAttempts.current = 0;
    }, 5000); // Increased cooldown period
    
    try {
      console.log(`[useSocialFeed] Loading ${feedOptions.feedType} feed with authors:`, feedOptions.authors);
      console.log(`[useSocialFeed] Time range: since=${new Date(feedOptions.since * 1000).toISOString()}, until=${feedOptions.until ? new Date(feedOptions.until * 1000).toISOString() : 'now'}`);
      
      // For following feed, ensure we have authors
      if (feedOptions.feedType === 'following' && (!feedOptions.authors || feedOptions.authors.length === 0)) {
        console.log('[useSocialFeed] Following feed with no authors, skipping subscription');
        setLoading(false);
        return;
      }
      
      // Build and validate filters before subscribing
      if (!socialServiceRef.current) {
        console.error('[useSocialFeed] Social service not initialized');
        setLoading(false);
        return;
      }
      
      // Validate that we have valid filters before subscribing
      const filters = socialServiceRef.current.buildFilters({
        feedType: feedOptions.feedType,
        since: feedOptions.since,
        until: feedOptions.until,
        authors: feedOptions.authors,
        kinds: feedOptions.kinds
      });
      
      if (!filters || Object.keys(filters).length === 0) {
        console.log('[useSocialFeed] No valid filters to subscribe with, skipping');
        setLoading(false);
        return;
      }
      
      console.log(`[useSocialFeed] Subscribing with filters:`, JSON.stringify(filters));
      
      // Subscribe to feed
      const subscription = await socialServiceRef.current.subscribeFeed({
        feedType: feedOptions.feedType,
        since: feedOptions.since,
        until: feedOptions.until,
        limit: feedOptions.limit,
        authors: feedOptions.authors,
        kinds: feedOptions.kinds,
        onEvent: processEvent,
        onEose: () => {
          setLoading(false);
        }
      });
      
      if (subscription) {
        subscriptionRef.current = subscription;
      } else {
        console.error('[useSocialFeed] Failed to create subscription');
        setLoading(false);
      }
    } catch (error) {
      console.error('[useSocialFeed] Error loading feed:', error);
      setLoading(false);
    }
  }, [ndk, db, feedOptions, processEvent]);

  // Load cached feed data
  const loadCachedFeed = useCallback(async () => {
    if (!ndk) return;
    
    setLoading(true);
    
    // Initialize social service if not already done
    if (!socialServiceRef.current) {
      try {
        console.log('[useSocialFeed] Initializing SocialFeedService in loadCachedFeed');
        socialServiceRef.current = new SocialFeedService(ndk, db);
        console.log('[useSocialFeed] SocialFeedService initialized successfully in loadCachedFeed');
      } catch (error) {
        console.error('[useSocialFeed] Error initializing SocialFeedService in loadCachedFeed:', error);
        // Log more detailed error information
        if (error instanceof Error) {
          console.error(`[useSocialFeed] Error details: ${error.message}`);
          if (error.stack) {
            console.error(`[useSocialFeed] Stack trace: ${error.stack}`);
          }
        }
        
        setLoading(false);
        return; // Exit early if we can't initialize the service
      }
    }
    
    try {
      // Get cached events from the SocialFeedCache
      if (socialServiceRef.current) {
        try {
          const cachedEvents = await socialServiceRef.current.getCachedEvents(
            options.feedType,
            options.limit || 30,
            options.since,
            options.until
          );
          
          // Process cached events
          for (const event of cachedEvents) {
            processEvent(event);
          }
        } catch (cacheError) {
          console.error('Error retrieving cached events:', cacheError);
          // Continue even if cache retrieval fails - we'll try to fetch from network
        }
      }
    } catch (error) {
      console.error('Error loading cached feed:', error);
    } finally {
      setLoading(false);
    }
  }, [ndk, options.feedType, options.limit, options.since, options.until, processEvent]);
  
  // Refresh feed (clear events and reload)
  const refresh = useCallback(async () => {
    console.log(`Refreshing ${options.feedType} feed`);
    setFeedItems([]);
    seenEvents.current.clear();
    quotedEvents.current.clear(); // Also reset quoted events
    setOldestTimestamp(null);
    setHasMore(true);
    
    // Check if we're online
    const isOnline = await ConnectivityService.getInstance().checkNetworkStatus();
    setIsOffline(!isOnline);
    
    if (isOnline) {
      await loadFeed();
    } else {
      await loadCachedFeed();
    }
  }, [loadFeed, loadCachedFeed, options.feedType]);

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
    let isMounted = true;
    
    const initFeed = async () => {
      if (!ndk || !isMounted) return;
      
      // Check if we're online
      const isOnline = await ConnectivityService.getInstance().checkNetworkStatus();
      if (!isMounted) return;
      
      setIsOffline(!isOnline);
      
      if (isOnline) {
        loadFeed();
      } else {
        loadCachedFeed();
      }
    };
    
    initFeed();
    
    // Clean up subscription on unmount
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      
      // Clear any pending cooldown timer
      if (subscriptionCooldown.current) {
        clearTimeout(subscriptionCooldown.current);
        subscriptionCooldown.current = null;
      }
    };
  }, [ndk]); // Only depend on ndk to prevent infinite loops

  return {
    feedItems,
    loading,
    refresh,
    loadMore,
    hasMore,
    isOffline,
    socialService: socialServiceRef.current
  };
}
