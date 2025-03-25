// lib/hooks/useContactList.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { NDKEvent, NDKUser, NDKKind, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk-mobile';
import { useNDK } from '@/lib/hooks/useNDK';
import { POWR_PUBKEY_HEX } from '@/lib/hooks/useFeedHooks';
import { useDatabase } from '@/components/DatabaseProvider';
import { getContactCacheService } from '@/lib/db/services/ContactCacheService';

export function useContactList(pubkey: string | undefined) {
  const { ndk } = useNDK();
  const db = useDatabase();
  const [contacts, setContacts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Use a ref to track if we've loaded from cache
  const loadedFromCacheRef = useRef(false);
  
  // Load contacts from cache first
  useEffect(() => {
    if (!pubkey || !db || loadedFromCacheRef.current) return;
    
    const loadCachedContacts = async () => {
      try {
        const contactCache = getContactCacheService(db);
        const cachedContacts = await contactCache.getCachedContacts(pubkey);
        
        if (cachedContacts.length > 0) {
          console.log(`[useContactList] Loaded ${cachedContacts.length} contacts from cache`);
          
          // Add self and POWR account to contacts
          const contactSet = new Set(cachedContacts);
          contactSet.add(pubkey);
          if (POWR_PUBKEY_HEX) {
            contactSet.add(POWR_PUBKEY_HEX);
          }
          
          // Set contacts state with cached contacts
          setContacts(Array.from(contactSet));
          setIsInitialLoad(false);
          loadedFromCacheRef.current = true;
        }
      } catch (error) {
        console.error('[useContactList] Error loading cached contacts:', error);
        // Don't set error state here - we'll still try to fetch from network
      }
    };
    
    loadCachedContacts();
  }, [pubkey, db]);
  
  // Fetch contact list from NDK
  const fetchContactList = useCallback(async () => {
    if (!ndk || !pubkey) return;
    
    setIsLoading(true);
    if (!loadedFromCacheRef.current) {
      // Only reset error if this is not a background refresh after cache load
      setError(null);
    }
    
    try {
      // Try multiple approaches to ensure reliability
      
      // Approach 1: Use NDK user's direct followSet method
      const user = new NDKUser({ pubkey });
      user.ndk = ndk;
      let contactSet: Set<string> = new Set();
      
      try {
        contactSet = await user.followSet({ 
          cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST,
          closeOnEose: true
        });
        console.log(`Found ${contactSet.size} contacts via followSet()`);
      } catch (err) {
        console.log('Could not fetch follows using followSet():', err);
      }
      
      // Approach 2: Directly fetch kind 3 event if method 1 failed
      if (contactSet.size === 0) {
        const contactEvents = await ndk.fetchEvents({
          kinds: [3],
          authors: [pubkey],
          limit: 1
        });
        
        if (contactEvents.size > 0) {
          const contactEvent = Array.from(contactEvents)[0];
          
          const extractedContacts = contactEvent.tags
            .filter(tag => tag[0] === 'p')
            .map(tag => tag[1]);
            
          if (extractedContacts.length > 0) {
            console.log(`Found ${extractedContacts.length} contacts via direct kind:3 fetch`);
            contactSet = new Set([...contactSet, ...extractedContacts]);
          }
        }
      }
      
      // Approach 3: Try to search for contacts from user's public cached events
      if (contactSet.size === 0) {
        try {
          const userEvents = await ndk.fetchEvents({
            authors: [pubkey],
            kinds: [3],
            limit: 5
          });
          
          for (const event of userEvents) {
            const extractedContacts = event.tags
              .filter(tag => tag[0] === 'p')
              .map(tag => tag[1]);
              
            if (extractedContacts.length > 0) {
              console.log(`Found ${extractedContacts.length} contacts from cached events`);
              contactSet = new Set([...contactSet, ...extractedContacts]);
              break;
            }
          }
        } catch (err) {
          console.error('Error fetching user events for contacts:', err);
        }
      }
      
      // Include self to ensure self-created content is visible
      contactSet.add(pubkey);
      
      // Add POWR pubkey if available
      if (POWR_PUBKEY_HEX) {
        contactSet.add(POWR_PUBKEY_HEX);
      }
      
      // Convert to array and update state
      const contactArray = Array.from(contactSet);
      setContacts(contactArray);
      setIsInitialLoad(false);
      
      // Cache contacts if we have a database connection
      if (db && contactArray.length > 0) {
        try {
          const contactCache = getContactCacheService(db);
          await contactCache.cacheContacts(pubkey, contactArray);
          console.log(`[useContactList] Cached ${contactArray.length} contacts for ${pubkey}`);
        } catch (cacheError) {
          console.error('[useContactList] Error caching contacts:', cacheError);
          // Non-fatal, we can continue even if caching fails
        }
      }
    } catch (err) {
      console.error('Error fetching contact list:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch contacts'));
    } finally {
      setIsLoading(false);
    }
  }, [ndk, pubkey, db]);
  
  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (ndk && pubkey) {
      fetchContactList();
    }
  }, [ndk, pubkey, fetchContactList]);
  
  return {
    contacts,
    isLoading,
    error,
    refetch: fetchContactList,
    hasContacts: contacts.length > 0,
    isInitialLoad
  };
}
