// lib/social/SocialFeedService.ts
import NDK, { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk-mobile';
import { POWR_EVENT_KINDS } from '@/types/nostr-workout';
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';
import { Workout } from '@/types/workout';

export class SocialFeedService {
  private ndk: NDK;

  constructor(ndk: NDK) {
    this.ndk = ndk;
  }

  /**
   * Subscribe to a feed of workout-related events
   * @param options Subscription options
   * @returns Subscription object with unsubscribe method
   */
	subscribeFeed(options: {
		feedType: 'following' | 'powr' | 'global';
		since?: number;
		until?: number;
		limit?: number;
		authors?: string[];
		kinds?: number[];
		onEvent: (event: NDKEvent) => void;
		onEose?: () => void;
	}): Promise<{ unsubscribe: () => void }> {
		const { feedType, since, until, limit, authors, kinds, onEvent, onEose } = options;
		
		// Default to events in the last 24 hours if no since provided
		const defaultSince = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
		
		// Create filters based on feedType
		const filters: NDKFilter[] = [];
		
		// Workout content filter
		if (!kinds || kinds.some(k => [1301, 33401, 33402].includes(k))) {
			const workoutFilter: NDKFilter = {
				kinds: [1301, 33401, 33402].filter(k => !kinds || kinds.includes(k)) as any[],
				since: since || defaultSince,
				limit: limit || 20,
			};
			
			if (until) {
				workoutFilter.until = until;
			}
			
			if (feedType === 'following' || feedType === 'powr') {
				if (Array.isArray(authors) && authors.length > 0) {
					workoutFilter.authors = authors;
				}
			}
			
			filters.push(workoutFilter);
		}
		
		// Social post filter
		if (!kinds || kinds.includes(1)) {
			const socialPostFilter: NDKFilter = {
				kinds: [1] as any[],
				since: since || defaultSince,
				limit: limit || 20,
			};
			
			if (until) {
				socialPostFilter.until = until;
			}
			
			if (feedType === 'following' || feedType === 'powr') {
				if (Array.isArray(authors) && authors.length > 0) {
					socialPostFilter.authors = authors;
				}
			} else if (feedType === 'global') {
				// For global feed, add some relevant tags for filtering
				socialPostFilter['#t'] = ['workout', 'fitness', 'powr'];
			}
			
			filters.push(socialPostFilter);
		}
		
		// Article filter
		if (!kinds || kinds.includes(30023)) {
			const articleFilter: NDKFilter = {
				kinds: [30023] as any[],
				since: since || defaultSince,
				limit: limit || 20,
			};
			
			if (until) {
				articleFilter.until = until;
			}
			
			if (feedType === 'following' || feedType === 'powr') {
				if (Array.isArray(authors) && authors.length > 0) {
					articleFilter.authors = authors;
				}
			}
			
			filters.push(articleFilter);
		}
		
		// Special case for POWR feed - also include draft articles
		if (feedType === 'powr' && (!kinds || kinds.includes(30024))) {
			const draftFilter: NDKFilter = {
				kinds: [30024] as any[],
				since: since || defaultSince,
				limit: limit || 20,
			};
			
			if (until) {
				draftFilter.until = until;
			}
			
			if (Array.isArray(authors) && authors.length > 0) {
				draftFilter.authors = authors;
			}
			
			filters.push(draftFilter);
		}
		
		// Create subscriptions
		const subscriptions: NDKSubscription[] = [];
		
		// Create a subscription for each filter
		for (const filter of filters) {
			console.log(`Subscribing with filter:`, filter);
			const subscription = this.ndk.subscribe(filter);
			
			subscription.on('event', (event: NDKEvent) => {
				onEvent(event);
			});
			
			subscription.on('eose', () => {
				if (onEose) onEose();
			});
			
			subscriptions.push(subscription);
		}
		
		// Return a Promise with the unsubscribe object
		return Promise.resolve({
			unsubscribe: () => {
				subscriptions.forEach(sub => {
					sub.stop();
				});
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
        const events = await this.ndk.fetchEvents(filter);
        return events.size > 0 ? Array.from(events)[0] : null;
      }
    }
    
    // Standard event reference (direct ID)
    const filter: NDKFilter = {
      ids: [eventId],
      kinds: [kind],
    };
    
    const events = await this.ndk.fetchEvents(filter);
    return events.size > 0 ? Array.from(events)[0] : null;
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
    await event.publish();
    
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