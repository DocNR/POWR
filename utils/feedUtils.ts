// lib/utils/feedUtils.ts
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { AnyFeedEntry } from '@/types/feed';

/**
 * Process events into feed entries in batches
 */
export function processBatchedEvents(
  events: NDKEvent[],
  processor: (event: NDKEvent) => AnyFeedEntry | null,
  batchSize = 10
): AnyFeedEntry[] {
  const results: AnyFeedEntry[] = [];
  
  // Process in batches to avoid blocking the main thread
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    for (const event of batch) {
      try {
        const entry = processor(event);
        if (entry) results.push(entry);
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }
  }
  
  return results;
}

/**
 * Check if an event is a fitness-related post
 */
export function isFitnessRelatedPost(event: NDKEvent): boolean {
    // Check event tags
    const hasFitnessTags = event.tags.some(tag => 
      tag[0] === 't' && 
      ['workout', 'fitness', 'exercise', 'powr', 'gym'].includes(tag[1])
    );
    
    // If it has fitness tags, it's relevant
    if (hasFitnessTags) return true;
    
    // For kind 1 posts, check content for fitness keywords
    if (event.kind === 1 && event.content) {
      const fitnessKeywords = [
        'workout', 'exercise', 'gym', 'fitness', 
        'training', 'strength', 'cardio', 'running', 
        'lifting', 'powr'
      ];
      
      const content = event.content.toLowerCase();
      return fitnessKeywords.some(keyword => content.includes(keyword));
    }
    
    // For specific workout kinds, always return true
    // Fix: Check if event.kind exists before using includes
    if (event.kind !== undefined && [1301, 33401, 33402].includes(event.kind)) {
      return true;
    }
    
    return false;
  }

/**
 * Convert entries to a format compatible with legacy components
 */
export function convertToLegacyFeedItem(entry: AnyFeedEntry) {
    // Use nullish coalescing to handle undefined timestamps
    return {
      id: entry.eventId,
      type: entry.type,
      originalEvent: entry.event!,
      parsedContent: entry.content!,
      createdAt: ((entry.timestamp ?? Date.now()) / 1000)
    };
  }