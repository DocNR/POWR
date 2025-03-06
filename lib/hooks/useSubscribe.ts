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
  
  useEffect(() => {
    if (!ndk || !filters || !enabled) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setEose(false);
    
    try {
      // Create subscription with NDK Mobile
      const subscription = ndk.subscribe(filters, {
        closeOnEose,
        ...subscriptionOptions
      });
      
      subscriptionRef.current = subscription;
      
      subscription.on('event', (event: NDKEvent) => {
        setEvents(prev => {
          if (deduplicate && prev.some(e => e.id === event.id)) {
            return prev;
          }
          return [...prev, event];
        });
      });
      
      subscription.on('eose', () => {
        setIsLoading(false);
        setEose(true);
      });
    } catch (error) {
      console.error('[useSubscribe] Error:', error);
      setIsLoading(false);
    }
    
    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
    };
  }, [ndk, enabled, closeOnEose, JSON.stringify(filters), JSON.stringify(subscriptionOptions)]);
  
  return { 
    events, 
    isLoading, 
    eose, 
    clearEvents, 
    resubscribe,
    subscription: subscriptionRef.current 
  };
}