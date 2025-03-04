// lib/hooks/useSubscribe.ts
import { useEffect, useState, useRef } from 'react';
import { NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';
import { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk-mobile';
import { useNDK } from './useNDK';

interface UseSubscribeOptions {
  enabled?: boolean;
  closeOnEose?: boolean;
  deduplicate?: boolean;
}

/**
 * Hook to subscribe to Nostr events
 * 
 * @param filters The NDK filter or array of filters
 * @param options Optional configuration options
 * @returns Object containing events, loading state, and EOSE status
 */
export function useSubscribe(
  filters: NDKFilter | NDKFilter[] | false,
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
    deduplicate = true 
  } = options;
  
  useEffect(() => {
    // Clean up previous subscription if exists
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }
    
    // Reset state when filters change
    setEvents([]);
    setEose(false);
    
    // Check prerequisites
    if (!ndk || !filters || !enabled) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Convert single filter to array if needed
      const filterArray = Array.isArray(filters) ? filters : [filters];
      
      // Create subscription
      const subscription = ndk.subscribe(filterArray);
      subscriptionRef.current = subscription;
      
      // Handle incoming events
      subscription.on('event', (event: NDKEvent) => {
        setEvents(prev => {
          // Deduplicate events if enabled
          if (deduplicate && prev.some(e => e.id === event.id)) {
            return prev;
          }
          return [...prev, event];
        });
      });
      
      // Handle end of stored events
      subscription.on('eose', () => {
        setIsLoading(false);
        setEose(true);
        
        if (closeOnEose && subscriptionRef.current) {
          subscriptionRef.current.stop();
          subscriptionRef.current = null;
        }
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
  }, [ndk, enabled, closeOnEose, deduplicate, JSON.stringify(filters)]);
  
  return { 
    events, 
    isLoading, 
    eose,
    resubscribe: () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.stop();
        subscriptionRef.current = null;
      }
      setEvents([]);
      setEose(false);
      setIsLoading(true);
    }
  };
}