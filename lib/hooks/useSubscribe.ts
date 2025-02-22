// lib/hooks/useSubscribe.ts
import { useEffect, useState } from 'react';
import { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk';
import { useNDK } from './useNDK';

interface UseSubscribeOptions {
  enabled?: boolean;
  closeOnEose?: boolean;
}

export function useSubscribe(
  filters: NDKFilter[] | false,
  options: UseSubscribeOptions = {}
) {
  const { ndk } = useNDK();
  const [events, setEvents] = useState<NDKEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eose, setEose] = useState(false);
  
  // Default options
  const { enabled = true, closeOnEose = false } = options;
  
  useEffect(() => {
    if (!ndk || !filters || !enabled) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setEose(false);
    
    let subscription: NDKSubscription;
    
    try {
      subscription = ndk.subscribe(filters);
      
      subscription.on('event', (event: NDKEvent) => {
        setEvents(prev => {
          // Avoid duplicates
          if (prev.some(e => e.id === event.id)) {
            return prev;
          }
          return [...prev, event];
        });
      });
      
      subscription.on('eose', () => {
        setIsLoading(false);
        setEose(true);
        
        if (closeOnEose) {
          subscription.stop();
        }
      });
    } catch (error) {
      console.error('[useSubscribe] Error:', error);
      setIsLoading(false);
    }
    
    return () => {
      if (subscription) {
        subscription.stop();
      }
    };
  }, [ndk, enabled, closeOnEose, JSON.stringify(filters)]);
  
  return { events, isLoading, eose };
}