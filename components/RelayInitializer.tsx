// components/RelayInitializer.tsx
import React, { useEffect, useContext } from 'react';
import { View } from 'react-native';
import { useRelayStore } from '@/lib/stores/relayStore';
import { useNDKStore } from '@/lib/stores/ndk';
import { NDKContext } from '@/lib/auth/ReactQueryAuthProvider';
import { useConnectivity } from '@/lib/db/services/ConnectivityService';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';
import { profileImageCache } from '@/lib/db/services/ProfileImageCache';
import { bannerImageCache } from '@/lib/db/services/BannerImageCache';
import { getSocialFeedCache } from '@/lib/db/services/SocialFeedCache';
import { getContactCacheService } from '@/lib/db/services/ContactCacheService';
import { useDatabase } from '@/components/DatabaseProvider';

/**
 * A component to initialize and load relay data when the app starts
 * This should be placed high in the component tree, ideally in _layout.tsx
 */
interface RelayInitializerProps {
  reactQueryMode?: boolean; // When true, uses React Query NDK context
}

export default function RelayInitializer({ reactQueryMode = false }: RelayInitializerProps) {
  const { loadRelays } = useRelayStore();
  const { isOnline } = useConnectivity();
  
  // Get NDK from the appropriate source based on mode
  const legacyNDK = useNDKStore(state => state.ndk);
  const reactQueryNDKContext = useContext(NDKContext);
  
  // Use the correct NDK instance based on mode
  const ndk = reactQueryMode ? reactQueryNDKContext.ndk : legacyNDK;

  const db = useDatabase();

  // Initialize all caches with NDK instance
  useEffect(() => {
    if (ndk) {
      console.log('[RelayInitializer] Setting NDK instance in image caches');
      profileImageCache.setNDK(ndk);
      bannerImageCache.setNDK(ndk);
      
      // Cache initialization is handled within setNDK
      console.log('[RelayInitializer] Image caches initialized');
      
      // Initialize caches with NDK instance
      if (db) {
        // Initialize ContactCacheService
        try {
          getContactCacheService(db);
          console.log('[RelayInitializer] ContactCacheService initialized');
        } catch (error) {
          console.error('[RelayInitializer] Error initializing ContactCacheService:', error);
        }
        // Maximum number of retry attempts
        const MAX_RETRIES = 3;
        
        const initSocialFeedCache = (attempt = 1) => {
          try {
            console.log(`[RelayInitializer] Attempting to initialize SocialFeedCache (attempt ${attempt}/${MAX_RETRIES})`);
            const socialFeedCache = getSocialFeedCache(db);
            socialFeedCache.setNDK(ndk);
            console.log('[RelayInitializer] SocialFeedCache initialized with NDK successfully');
            return true;
          } catch (error) {
            console.error('[RelayInitializer] Error initializing SocialFeedCache:', error);
            
            // Log more detailed error information
            if (error instanceof Error) {
              console.error(`[RelayInitializer] Error details: ${error.message}`);
              if (error.stack) {
                console.error(`[RelayInitializer] Stack trace: ${error.stack}`);
              }
            }
            
            return false;
          }
        };
        
        // Try to initialize immediately
        const success = initSocialFeedCache();
        
        // If failed, set up progressive retries
        if (!success) {
          let retryAttempt = 1;
          const retryTimers: NodeJS.Timeout[] = [];
          
          // Set up multiple retries with increasing delays
          const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
          
          for (let i = 0; i < Math.min(MAX_RETRIES - 1, retryDelays.length); i++) {
            const currentAttempt = retryAttempt + 1;
            const delay = retryDelays[i];
            
            console.log(`[RelayInitializer] Will retry SocialFeedCache initialization in ${delay/1000} seconds (attempt ${currentAttempt}/${MAX_RETRIES})`);
            
            const timer = setTimeout(() => {
              console.log(`[RelayInitializer] Retrying SocialFeedCache initialization (attempt ${currentAttempt}/${MAX_RETRIES})`);
              if (initSocialFeedCache(currentAttempt)) {
                // Clear any remaining timers if successful
                retryTimers.forEach(t => clearTimeout(t));
              }
            }, delay);
            
            retryTimers.push(timer);
            retryAttempt++;
          }
          
          // Return cleanup function to clear all timers
          return () => retryTimers.forEach(timer => clearTimeout(timer));
        }
      }
    }
  }, [ndk, db]);

  // Load relays when NDK is initialized and network is available
  useEffect(() => {
    if (ndk && isOnline) {
      console.log('[RelayInitializer] NDK available and online, loading relays...');
      loadRelays().catch(error => 
        console.error('[RelayInitializer] Error loading relays:', error)
      );
    } else if (ndk) {
      console.log('[RelayInitializer] NDK available but offline, skipping relay loading');
    }
  }, [ndk, isOnline]);
  
  // Register for connectivity restoration events
  useEffect(() => {
    if (!ndk) return;
    
    // Add sync listener to retry when connectivity is restored
    const removeListener = ConnectivityService.getInstance().addSyncListener(() => {
      if (ndk) {
        console.log('[RelayInitializer] Network connectivity restored, attempting to load relays');
        loadRelays().catch(error => 
          console.error('[RelayInitializer] Error loading relays on reconnect:', error)
        );
      }
    });
    
    return removeListener;
  }, [ndk, loadRelays]);

  // This component doesn't render anything
  return null;
}
