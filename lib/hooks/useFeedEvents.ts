// lib/hooks/useFeedEvents.ts
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk-mobile';
import { useNDK } from '@/lib/hooks/useNDK';
import { AnyFeedEntry, FeedOptions, UpdateEntryFn } from '@/types/feed';
import { POWR_EVENT_KINDS } from '@/types/nostr-workout';
import { 
  parseWorkoutRecord, 
  parseExerciseTemplate, 
  parseWorkoutTemplate,
  parseSocialPost,
  parseLongformContent
} from '@/types/nostr-workout';

// Default sort function - most recent first
const defaultSortFn = (a: AnyFeedEntry, b: AnyFeedEntry) => b.timestamp - a.timestamp;

export function useFeedEvents(
  filters: NDKFilter[] | false,
  options: FeedOptions = {}
) {
  const { ndk } = useNDK();
  const [entries, setEntries] = useState<AnyFeedEntry[]>([]);
  const [newEntries, setNewEntries] = useState<AnyFeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [eose, setEose] = useState(false);
  
  // Add state to control subscription
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);
  const isResetting = useRef(false);
  
  // Keep references to entries and options
  const entriesRef = useRef<Record<string, AnyFeedEntry>>({});
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const quotedEventsRef = useRef<Set<string>>(new Set());
  
  // Options with defaults
  const {
    subId = 'feed',
    enabled = true,
    filterFn,
    sortFn = defaultSortFn
  } = options;
  
  // Clear all new entries
  const clearNewEntries = useCallback(() => {
    setNewEntries([]);
  }, []);
  
  // Reset feed
  const resetFeed = useCallback(async () => {
    // Set a flag to prevent multiple resets in progress
    if (isResetting.current) {
      console.log('[Feed] Reset already in progress, ignoring request');
      return;
    }
    
    console.log('[Feed] Starting reset');
    isResetting.current = true;
    
    try {
      // Cancel the existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
      
      // Reset state
      entriesRef.current = {};
      seenEventsRef.current.clear();
      quotedEventsRef.current.clear();
      setEntries([]);
      setNewEntries([]);
      setEose(false);
      setLoading(true);
      
      // Important: Add a small delay before toggling subscription state
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Force a new subscription by toggling enabled
      setSubscriptionEnabled(false);
      
      // Another small delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Re-enable the subscription
      setSubscriptionEnabled(true);
      
      console.log('[Feed] Reset complete');
      return Promise.resolve();
    } catch (error) {
      console.error('[Feed] Error during reset:', error);
      throw error;
    } finally {
      isResetting.current = false;
    }
  }, []);
  
  // Update an entry
  const updateEntry: UpdateEntryFn = useCallback((id, updater) => {
    const existingEntry = entriesRef.current[id];
    if (!existingEntry) return;
    
    const updatedEntry = updater(existingEntry);
    entriesRef.current[id] = updatedEntry;
    
    // Update state for re-render
    setEntries(Object.values(entriesRef.current).sort(sortFn));
  }, [sortFn]);
  
  // Process event and create entry
  const processEvent = useCallback((event: NDKEvent) => {
    // Skip if no ID
    if (!event.id) return;
    
    const eventId = event.id;
    const timestamp = event.created_at ? event.created_at * 1000 : Date.now();
    
    // Skip if we've already seen this event
    if (seenEventsRef.current.has(eventId)) return;
    seenEventsRef.current.add(eventId);
    
    // Check for quoted events to avoid duplicates
    if (event.kind === 1) {
      // Track any direct e-tag references
      event.tags
        .filter(tag => tag[0] === 'e')
        .forEach(tag => {
          if (tag[1]) quotedEventsRef.current.add(tag[1]);
        });
        
      // Also check for quoted content in NIP-27 format
      if (event.content) {
        const nostrUriMatches = event.content.match(/nostr:(note1|nevent1|naddr1)[a-z0-9]+/g);
        if (nostrUriMatches) {
          // Add these to quotedEvents
        }
      }
    }
    
    // Create base entry
    let entry: AnyFeedEntry | null = null;
    
    try {
      switch (event.kind) {
        case POWR_EVENT_KINDS.WORKOUT_RECORD: // 1301
          entry = {
            id: `workout-${eventId}`,
            eventId,
            event,
            timestamp,
            type: 'workout',
            content: parseWorkoutRecord(event)
          };
          break;
          
        case POWR_EVENT_KINDS.EXERCISE_TEMPLATE: // 33401
          entry = {
            id: `exercise-${eventId}`,
            eventId,
            event,
            timestamp,
            type: 'exercise',
            content: parseExerciseTemplate(event)
          };
          break;
          
        case POWR_EVENT_KINDS.WORKOUT_TEMPLATE: // 33402
          entry = {
            id: `template-${eventId}`,
            eventId,
            event,
            timestamp,
            type: 'template',
            content: parseWorkoutTemplate(event)
          };
          break;
          
        case POWR_EVENT_KINDS.SOCIAL_POST: // 1
          entry = {
            id: `social-${eventId}`,
            eventId,
            event,
            timestamp,
            type: 'social',
            content: parseSocialPost(event)
          };
          break;
          
        case 30023: // Published article
        case 30024: // Draft article
          entry = {
            id: `article-${eventId}`,
            eventId,
            event,
            timestamp,
            type: 'article',
            content: parseLongformContent(event)
          };
          break;
          
        default:
          // Skip unsupported event kinds
          return;
      }
      
      // Apply filter function if provided
      if (filterFn && !filterFn(entry)) {
        return;
      }
      
      // Add entry to our records
      entriesRef.current[entry.id] = entry;
      
      // Update entries state
      const updatedEntries = Object.values(entriesRef.current).sort(sortFn);
      setEntries(updatedEntries);
      
      // Add to new entries if we've already received EOSE
      if (eose && entry) {
        // Explicitly check and assert entry is not null
        const nonNullEntry: AnyFeedEntry = entry; // This will catch if entry is incorrectly typed
        
        setNewEntries(prev => {
          const entries: AnyFeedEntry[] = [...prev];
          entries.push(nonNullEntry);
          return entries;
        });
      }
      
    } catch (error) {
      console.error('Error processing event:', error, event);
    }
  }, [eose, filterFn, sortFn]);
  
  // Function to fetch specific event types (e.g., POWR Packs)
  const fetchSpecificEvents = useCallback(async (
    specificFilters: NDKFilter[],
    options: { 
      limit?: number;
      processFn?: (event: NDKEvent) => any;
    } = {}
  ) => {
    if (!ndk || !specificFilters || specificFilters.length === 0) return [];
    
    const { limit = 50, processFn } = options;
    const results: any[] = [];
    
    try {
      setLoading(true);
      
      for (const filter of specificFilters) {
        // Ensure we have a reasonable limit
        const filterWithLimit = { ...filter, limit };
        
        // Fetch events
        const events = await ndk.fetchEvents(filterWithLimit);
        
        if (events.size > 0) {
          // Process events if a processing function is provided
          if (processFn) {
            for (const event of events) {
              try {
                const processed = processFn(event);
                if (processed) results.push(processed);
              } catch (err) {
                console.error('Error processing event:', err);
              }
            }
          } else {
            // Otherwise just add the events
            for (const event of events) {
              results.push(event);
            }
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching specific events:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [ndk]);
  
  // Subscribe to events
  useEffect(() => {
    if (!ndk || !filters || !enabled || !subscriptionEnabled) {
      setLoading(false);
      return;
    }
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }
    
    setLoading(true);
    setEose(false);
    
    // Track component mount state
    let isMounted = true;
    
    const subscription = ndk.subscribe(filters, { subId });
    subscriptionRef.current = subscription;
    
    // Event handler
    const handleEvent = (event: NDKEvent) => {
      if (isMounted) {
        processEvent(event);
      }
    };
    
    // EOSE handler
    const handleEose = () => {
      if (isMounted) {
        setLoading(false);
        setEose(true);
        setNewEntries([]);
      }
    };
    
    subscription.on('event', handleEvent);
    subscription.on('eose', handleEose);
    
    // Cleanup
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.off('event', handleEvent);
        subscription.off('eose', handleEose);
        subscription.stop();
      }
      subscriptionRef.current = null;
    };
  }, [ndk, filters, enabled, subscriptionEnabled, subId, processEvent]);
  
  // Return sorted entries and helpers
  return {
    entries,
    newEntries,
    loading,
    eose,
    updateEntry,
    clearNewEntries,
    resetFeed,
    fetchSpecificEvents
  };
}