// lib/social/SocialFeedService.ts
import NDK, { NDKEvent, NDKFilter, NDKSubscription, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk-mobile';
import { POWR_EVENT_KINDS } from '@/types/nostr-workout';
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';
import { Workout } from '@/types/workout';
import { SQLiteDatabase } from 'expo-sqlite';
import { getSocialFeedCache } from '@/lib/db/services/SocialFeedCache';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';
import { POWR_PUBKEY_HEX } from '@/lib/hooks/useFeedHooks';

export class SocialFeedService {
  private ndk: NDK;
  private socialFeedCache: ReturnType<typeof getSocialFeedCache> | null = null;
  private db: SQLiteDatabase | null = null;

  constructor(ndk: NDK, db?: SQLiteDatabase) {
    this.ndk = ndk;
    
    if (db) {
      this.db = db;
      try {
        this.socialFeedCache = getSocialFeedCache(db);
        this.socialFeedCache.setNDK(ndk);
      } catch (error) {
        console.error('[SocialFeedService] Error initializing SocialFeedCache:', error);
        // Continue without cache - we'll still be able to fetch from network
        this.socialFeedCache = null;
      }
    }
  }
  
  /**
   * Get cached events for a feed
   * @param feedType Type of feed (following, powr, global)
   * @param limit Maximum number of events to return
   * @param since Timestamp to fetch events since (inclusive)
   * @param until Timestamp to fetch events until (inclusive)
   * @returns Array of cached events
   */
  async getCachedEvents(
    feedType: string,
    limit: number = 20,
    since?: number,
    until?: number
  ): Promise<NDKEvent[]> {
    if (!this.socialFeedCache) {
      return [];
    }
    
    try {
      return await this.socialFeedCache.getCachedEvents(feedType, limit, since, until);
    } catch (error) {
      console.error('[SocialFeedService] Error retrieving cached events:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Build filters for a feed subscription with improved error handling
   * @param options Filter options
   * @returns NDK filter object or array of filters
   */
  buildFilters(options: {
    feedType: 'following' | 'powr' | 'global' | 'profile';
    since?: number;
    until?: number;
    limit?: number;
    authors?: string[];
    kinds?: number[];
  }): NDKFilter | NDKFilter[] {
    try {
      const { feedType, since, until, limit, authors, kinds } = options;
      
      // Default to events in the last 24 hours if no since provided
      const defaultSince = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
      
      // Fitness-related tags for filtering
      const tagFilter = [
        'workout', 'fitness', 'powr', '31days', 
        'crossfit', 'wod', 'gym', 'strength', 
        'cardio', 'training', 'exercise'
      ];
      
      // Determine which kinds to include
      const workoutKinds: number[] = [];
      const socialKinds: number[] = [];
      
      // Add workout-specific kinds (1301, 33401, 33402)
      if (!kinds || kinds.some(k => [1301, 33401, 33402].includes(k))) {
        [1301, 33401, 33402]
          .filter(k => !kinds || kinds.includes(k))
          .forEach(k => workoutKinds.push(k));
      }
      
      // Add social post kind (1) and article kind (30023)
      if (!kinds || kinds.includes(1)) {
        socialKinds.push(1);
      }
      
      if (!kinds || kinds.includes(30023)) {
        socialKinds.push(30023);
      }
      
      // Base filter properties
      const baseFilter: Record<string, any> = {
        since: since || defaultSince,
        limit: limit || 30,
      };
      
      if (until) {
        baseFilter.until = until;
      }
      
      // Special handling for different feed types
      if (feedType === 'profile') {
        // Profile feed: Show all of a user's posts
        if (!Array.isArray(authors) || authors.length === 0) {
          console.error('[SocialFeedService] Profile feed requires authors');
          return { ...baseFilter, kinds: [] }; // Return empty filter if no authors
        }
        
        // For profile feed, we create two filters:
        // 1. All workout-related kinds from the user
        // 2. Social posts and articles from the user (with or without tags)
        return [
          // Workout-related kinds (no tag filtering)
          {
            ...baseFilter,
            kinds: workoutKinds,
            authors: authors,
          },
          // Social posts and articles (no tag filtering for profile)
          {
            ...baseFilter,
            kinds: socialKinds,
            authors: authors,
          }
        ];
      } else if (feedType === 'powr') {
        // POWR feed: Show all content from POWR account(s)
        if (!Array.isArray(authors) || authors.length === 0) {
          console.error('[SocialFeedService] POWR feed requires authors');
          
          // For POWR feed, if no authors provided, use the POWR_PUBKEY_HEX as fallback
          if (POWR_PUBKEY_HEX) {
            console.log('[SocialFeedService] Using POWR account as fallback for POWR feed');
            const fallbackAuthors = [POWR_PUBKEY_HEX];
            return {
              ...baseFilter,
              kinds: [...workoutKinds, ...socialKinds],
              authors: fallbackAuthors,
            };
          } else {
            return { ...baseFilter, kinds: [] }; // Return empty filter if no authors and no fallback
          }
        }
        
        // For POWR feed, we don't apply tag filtering
        return {
          ...baseFilter,
          kinds: [...workoutKinds, ...socialKinds],
          authors: authors,
        };
      } else if (feedType === 'following') {
        // Following feed: Show content from followed users
        if (!Array.isArray(authors) || authors.length === 0) {
          // Initial load often has no contacts yet - this is normal
          console.log('[SocialFeedService] No contacts available for following feed yet, using fallback');
          
          // For following feed, if no authors provided, use the POWR_PUBKEY_HEX as fallback
          // This ensures at least some content is shown
          if (POWR_PUBKEY_HEX) {
            console.log('[SocialFeedService] Using POWR account as fallback for initial Following feed load');
            const fallbackAuthors = [POWR_PUBKEY_HEX];
            
            return [
              // Workout-related kinds (no tag filtering)
              {
                ...baseFilter,
                kinds: workoutKinds,
                authors: fallbackAuthors,
              },
              // Social posts and articles (with tag filtering)
              {
                ...baseFilter,
                kinds: socialKinds,
                authors: fallbackAuthors,
                '#t': tagFilter,
              }
            ];
          } else {
            return { ...baseFilter, kinds: [] }; // Return empty filter if no authors and no fallback
          }
        }
        
        // For following feed, we create two filters:
        // 1. All workout-related kinds from followed users
        // 2. Social posts and articles from followed users with fitness tags
        
        // Log the authors to help with debugging
        console.log(`[SocialFeedService] Following feed with ${authors.length} authors:`, 
          authors.length > 5 ? authors.slice(0, 5).join(', ') + '...' : authors.join(', '));
        
        // Always include POWR account in following feed
        let followingAuthors = [...authors];
        if (POWR_PUBKEY_HEX && !followingAuthors.includes(POWR_PUBKEY_HEX)) {
          followingAuthors.push(POWR_PUBKEY_HEX);
          console.log('[SocialFeedService] Added POWR account to following feed authors');
        }
        
        return [
          // Workout-related kinds (no tag filtering)
          {
            ...baseFilter,
            kinds: workoutKinds,
            authors: followingAuthors,
          },
          // Social posts and articles (with tag filtering)
          {
            ...baseFilter,
            kinds: socialKinds,
            authors: followingAuthors,
            '#t': tagFilter,
          }
        ];
      } else {
        // Global feed: Show content from anyone
        // For global feed, we create two filters:
        // 1. All workout-related kinds from anyone
        // 2. Social posts and articles from anyone with fitness tags
        return [
          // Workout-related kinds (no tag filtering)
          {
            ...baseFilter,
            kinds: workoutKinds,
          },
          // Social posts and articles (with tag filtering)
          {
            ...baseFilter,
            kinds: socialKinds,
            '#t': tagFilter,
          }
        ];
      }
    } catch (error) {
      console.error('[SocialFeedService] Error building filters:', error);
      // Return a safe default filter that won't crash but also won't return much
      return {
        kinds: [1], // Just social posts
        limit: 10,
        since: Math.floor(Date.now() / 1000) - 24 * 60 * 60 // Last 24 hours
      };
    }
  }

  /**
   * Subscribe to a feed of workout-related events
   * @param options Subscription options
   * @returns Subscription object with unsubscribe method
   */
  subscribeFeed(options: {
    feedType: 'following' | 'powr' | 'global' | 'profile';
    since?: number;
    until?: number;
    limit?: number;
    authors?: string[];
    kinds?: number[];
    onEvent: (event: NDKEvent) => void;
    onEose?: () => void;
  }): Promise<{ unsubscribe: () => void }> {
    const { feedType, onEvent, onEose } = options;
    
    // Build the filter using our buildFilters method
    const consolidatedFilter = this.buildFilters(options);
    
    // Log the consolidated filter
    console.log(`[SocialFeedService] Subscribing to ${feedType} feed with filter:`, consolidatedFilter);
		
		// Create a single subscription with the consolidated filter
		const subscription = this.ndk.subscribe(consolidatedFilter, {
			closeOnEose: false // Keep subscription open for real-time updates
		});
		
		// Set up event handler
		subscription.on('event', (event: NDKEvent) => {
			// Cache the event if we have a cache
			if (this.socialFeedCache) {
				try {
					this.socialFeedCache.cacheEvent(event, feedType)
						.catch(err => console.error('[SocialFeedService] Error caching event:', err));
				} catch (error) {
					console.error('[SocialFeedService] Exception while caching event:', error);
					// Continue even if caching fails - we'll still pass the event to the callback
				}
			}
			
			// Pass the event to the callback
			onEvent(event);
		});
		
		// Set up EOSE handler
		subscription.on('eose', () => {
			console.log(`[SocialFeedService] Received EOSE for ${feedType} feed`);
			if (onEose) onEose();
		});
		
		// Return a Promise with the unsubscribe object
		return Promise.resolve({
			unsubscribe: () => {
				console.log(`[SocialFeedService] Unsubscribing from ${feedType} feed`);
				subscription.stop();
			}
		});
	}
  
  /**
   * Get comments for an event
   * @param eventId Event ID to get comments for
   * @returns Array of comment events
   */
  async getComments(eventId: string): Promise<NDKEvent[]> {
    const filter: NDKFilter = {
      kinds: [POWR_EVENT_KINDS.COMMENT],
      "#e": [eventId],
    };
    
    const events = await this.ndk.fetchEvents(filter);
    return Array.from(events);
  }
  
  /**
   * Post a comment on an event
   * @param parentEvent Parent event to comment on
   * @param content Comment text
   * @param replyTo Optional comment to reply to
   * @returns The created comment event
   */
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
    
    // Sign and publish
    await comment.sign();
    await comment.publish();
    
    return comment;
  }
  
  /**
   * React to an event (like, etc.)
   * @param event Event to react to
   * @param reaction Reaction content ('+' for like)
   * @returns The created reaction event
   */
  async reactToEvent(event: NDKEvent, reaction: string = '+'): Promise<NDKEvent> {
    const reactionEvent = new NDKEvent(this.ndk);
    reactionEvent.kind = POWR_EVENT_KINDS.REACTION;
    reactionEvent.content = reaction;
    
    // Add event and author references
    reactionEvent.tags.push(['e', event.id]);
    reactionEvent.tags.push(['p', event.pubkey]);
    
    // Sign and publish
    await reactionEvent.sign();
    await reactionEvent.publish();
    
    return reactionEvent;
  }
  
  /**
   * Get the referenced content for a social post
   * @param eventId ID of the referenced event
   * @param kind Kind of the referenced event
   * @returns The referenced event or null
   */
  async getReferencedContent(eventId: string, kind: number): Promise<NDKEvent | null> {
    // First check if we have it in the cache
    if (this.socialFeedCache) {
      try {
        const cachedEvent = await this.socialFeedCache.getCachedEvent(eventId);
        if (cachedEvent) {
          return cachedEvent;
        }
      } catch (error) {
        console.error('[SocialFeedService] Error retrieving cached event:', error);
        // Continue to network fetch if cache fails
      }
    }
    
    // If not in cache or no cache available, try to fetch from network
    // Handle addressable content (a-tag references)
    if (eventId.includes(':')) {
      const parts = eventId.split(':');
      if (parts.length >= 3) {
        // Format is kind:pubkey:identifier
        const filter: NDKFilter = {
          kinds: [parseInt(parts[0])],
          authors: [parts[1]],
          "#d": [parts[2]],
        };
        
        const events = await this.ndk.fetchEvents(filter, {
          cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
        });
        
        if (events.size > 0) {
          const event = Array.from(events)[0];
          
          // Cache the event if we have a cache
          if (this.socialFeedCache) {
            try {
              await this.socialFeedCache.cacheEvent(event, 'referenced');
            } catch (error) {
              console.error('[SocialFeedService] Error caching referenced event:', error);
              // Continue even if caching fails - we can still return the event
            }
          }
          
          return event;
        }
        return null;
      }
    }
    
    // Standard event reference (direct ID)
    const filter: NDKFilter = {
      ids: [eventId] as string[],
      kinds: [kind] as number[],
    };
    
    const events = await this.ndk.fetchEvents(filter, {
      cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
    });
    
    if (events.size > 0) {
      const event = Array.from(events)[0];
      
      // Cache the event if we have a cache
      if (this.socialFeedCache) {
        try {
          await this.socialFeedCache.cacheEvent(event, 'referenced');
        } catch (error) {
          console.error('[SocialFeedService] Error caching referenced event:', error);
          // Continue even if caching fails - we can still return the event
        }
      }
      
      return event;
    }
    
    return null;
  }
  
  /**
   * Resolve quoted content in a social post
   * @param event Social post event
   * @returns Referenced event or null
   */
  async resolveQuotedContent(event: NDKEvent): Promise<NDKEvent | null> {
    if (event.kind !== POWR_EVENT_KINDS.SOCIAL_POST) return null;
    
    // Find the quoted event ID
    const quoteTag = event.tags.find(tag => tag[0] === 'q');
    if (!quoteTag) return null;
    
    // Find the kind tag
    const kindTag = event.tags.find(tag => 
      tag[0] === 'k' && 
      ['1301', '33401', '33402', '30023'].includes(tag[1])
    );
    
    if (!kindTag) return null;
    
    const quotedEventId = quoteTag[1];
    const quotedEventKind = parseInt(kindTag[1]);
    
    return this.getReferencedContent(quotedEventId, quotedEventKind);
  }
  
  /**
   * Publish a workout record to Nostr
   * @param workout Workout data
   * @param options Publishing options
   * @returns The published event
   */
  async publishWorkoutRecord(
    workout: Workout,
    options: {
      shareAsSocialPost?: boolean;
      socialText?: string;
      limited?: boolean;
    } = {}
  ): Promise<NDKEvent> {
    // Get appropriate event data from NostrWorkoutService
    const eventData = options.limited
      ? NostrWorkoutService.createLimitedWorkoutEvent(workout)
      : NostrWorkoutService.createCompleteWorkoutEvent(workout);
    
    // Create and publish the event
    const event = new NDKEvent(this.ndk);
    event.kind = eventData.kind;
    event.content = eventData.content;
    event.tags = eventData.tags || [];
    event.created_at = eventData.created_at;
    
    await event.sign();
    
    // Check if we're online before publishing
    const isOnline = await ConnectivityService.getInstance().checkNetworkStatus();
    
    if (isOnline) {
      await event.publish();
    } else {
      console.log('[SocialFeedService] Offline, event will be published when online');
    }
    
    // Cache the event if we have a cache
    if (this.socialFeedCache) {
      try {
        await this.socialFeedCache.cacheEvent(event, 'workout');
      } catch (error) {
        console.error('[SocialFeedService] Error caching workout event:', error);
        // Continue even if caching fails - the event was still published
      }
    }
    
    // Create social share if requested
    if (options.shareAsSocialPost && options.socialText) {
      const socialEventData = NostrWorkoutService.createSocialShareEvent(
        event.id,
        options.socialText
      );
      
      await this.publishEvent(socialEventData);
    }
    
    return event;
  }
  
  /**
   * Helper to publish a generic event
   * @param eventData Event data to publish
   * @returns Published event
   */
  async publishEvent(eventData: any): Promise<NDKEvent> {
    const event = new NDKEvent(this.ndk);
    event.kind = eventData.kind;
    event.content = eventData.content;
    event.tags = eventData.tags || [];
    event.created_at = eventData.created_at;
    
    await event.sign();
    await event.publish();
    return event;
  }
  
  /**
   * Get POWR team pubkeys - to be replaced with actual pubkeys
   * @returns Array of POWR team pubkeys
   */
  private getPOWRTeamPubkeys(): string[] {
    // Replace with actual POWR team pubkeys
    return [
      // TODO: Add actual POWR team pubkeys
      '55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21',
    ];
  }
}
