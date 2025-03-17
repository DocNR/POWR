// lib/hooks/useSubscribe.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { NDKEvent, NDKFilter, NDKSubscription, NDKSubscriptionOptions } from '@nostr-dev-kit/ndk-mobile';
import { useNDK } from './useNDK';

interface UseSubscribeOptions extends Partial<NDKSubscriptionOptions> {
  enabled?: boolean;
  deduplicate?: boolean;
}

export function useSubscribe(
  filters: NDKFilter[] | false,
  options: UseSubscribeOptions = {}
) {
  const { ndk } = useNDK();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eose, setEose] = useState(false);
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  
  // Default options
  const { 
    enabled = true, 
    closeOnEose = false,
    deduplicate = true,
    ...subscriptionOptions
  } = options;
  
  // Function to clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);
  
  // Function to manually resubscribe
  const resubscribe = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }
    setEvents([]);
    setEose(false);
    setIsLoading(true);
  }, []);
  
  // Direct fetch function for manual fetching
  const manualFetch = useCallback(async () => {
    if (!ndk || !filters) return;
    
    try {
      console.log('[useSubscribe] Manual fetch triggered');
      setIsLoading(true);
      
      const fetchedEvents = await ndk.fetchEvents(filters);
      const eventsArray = Array.from(fetchedEvents);
      
      setEvents(prev => {
        if (deduplicate) {
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = eventsArray.filter(e => !existingIds.has(e.id));
          return [...prev, ...newEvents];
        }
        return [...prev, ...eventsArray];
      });
      
      setIsLoading(false);
      setEose(true);
    } catch (err) {
      console.error('[useSubscribe] Manual fetch error:', err);
      setIsLoading(false);
    }
  }, [ndk, filters, deduplicate]);
  
  // Only run the subscription effect when dependencies change
  const filtersKey = filters ? JSON.stringify(filters) : 'none';
  const optionsKey = JSON.stringify(subscriptionOptions);
  
  useEffect(() => {
    if (!ndk || !filters || !enabled) {
      setIsLoading(false);
      return;
    }
    
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }
    
    setIsLoading(true);
    setEose(false);
    
    try {
      console.log('[useSubscribe] Creating new subscription');
      
      // Create subscription with NDK
      const subscription = ndk.subscribe(filters, {
        closeOnEose,
        ...subscriptionOptions
      });
      
      subscriptionRef.current = subscription;
      
      // Event handler - use a function reference to avoid recreating
      const handleEvent = (event: NDKEvent) => {
        setEvents(prev => {
          if (deduplicate && prev.some(e => e.id === event.id)) {
            return prev;
          }
          return [...prev, event];
        });
      };
      
      // EOSE handler
      const handleEose = () => {
        setIsLoading(false);
        setEose(true);
      };
      
      subscription.on('event', handleEvent);
      subscription.on('eose', handleEose);
      
      // Clean up on unmount or when dependencies change
      return () => {
        if (subscription) {
          subscription.off('event', handleEvent);
          subscription.off('eose', handleEose);
          subscription.stop();
        }
        subscriptionRef.current = null;
      };
    } catch (error) {
      console.error('[useSubscribe] Subscription error:', error);
      setIsLoading(false);
    }
  }, [ndk, enabled, filtersKey, optionsKey, closeOnEose, deduplicate]);
  
  return { 
    events, 
    isLoading, 
    eose, 
    clearEvents, 
    resubscribe,
    fetchEvents: manualFetch // Function to trigger manual fetch
  };
}