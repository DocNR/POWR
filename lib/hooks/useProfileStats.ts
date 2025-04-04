import { useQuery } from '@tanstack/react-query';
import { nostrBandService, ProfileStats } from '@/lib/services/NostrBandService';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { createLogger, enableModule } from '@/lib/utils/logger';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { Platform } from 'react-native';
import React, { useRef, useEffect } from 'react';

// Enable logging
enableModule('useProfileStats');
const logger = createLogger('useProfileStats');
const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';

interface UseProfileStatsOptions {
  pubkey?: string;
  refreshInterval?: number; // in milliseconds
}

/**
 * Hook to fetch profile statistics from nostr.band API using React Query
 * Provides follower/following counts and other statistics
 * Enhanced with proper caching and refresh behavior
 */
export function useProfileStats(options: UseProfileStatsOptions = {}) {
  const { currentUser } = useNDKCurrentUser();
  const { 
    pubkey: optionsPubkey, 
    refreshInterval = 0 // default to no auto-refresh
  } = options;
  
  // Use provided pubkey or fall back to current user's pubkey
  const pubkey = optionsPubkey || currentUser?.pubkey;
  
  // Track if component is mounted to prevent memory leaks
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Platform-specific configuration
  const platformConfig = Platform.select({
    android: {
      // More conservative settings for Android to prevent hanging
      staleTime: 60 * 1000, // 1 minute - reuse cached data more aggressively
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
      retry: 2, // Fewer retries on Android
      retryDelay: 2000, // Longer delay between retries
      timeout: 6000, // 6 second timeout for Android
      refetchInterval: refreshInterval > 0 ? refreshInterval : 30000, // 30 seconds default on Android
    },
    ios: {
      // More aggressive settings for iOS
      staleTime: 0, // No stale time - always refetch when used
      gcTime: 2 * 60 * 1000, // 2 minutes
      retry: 3, // More retries on iOS
      retryDelay: 1000, // 1 second between retries
      timeout: 10000, // 10 second timeout for iOS
      refetchInterval: refreshInterval > 0 ? refreshInterval : 10000, // 10 seconds default on iOS
    },
    default: {
      // Fallback settings
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 2 * 60 * 1000, // 2 minutes
      retry: 2,
      retryDelay: 1500,
      timeout: 8000, // 8 second timeout
      refetchInterval: refreshInterval > 0 ? refreshInterval : 20000, // 20 seconds default
    }
  });
  
  const query = useQuery({
    queryKey: QUERY_KEYS.profile.stats(pubkey),
    queryFn: async ({ signal }) => {
      if (!pubkey) {
        logger.warn(`[${platform}] No pubkey provided to useProfileStats`);
        return {
          pubkey: '',
          followersCount: 0,
          followingCount: 0,
          isLoading: false,
          error: null
        } as ProfileStats;
      }
      
      logger.info(`[${platform}] Fetching profile stats for ${pubkey?.substring(0, 8)}...`);
      
      try {
        // Create timeout that works with AbortSignal
        const timeoutId = setTimeout(() => {
          if (!signal.aborted && isMounted.current) {
            logger.warn(`[${platform}] Profile stats fetch timed out after ${platformConfig.timeout}ms`);
            // Create a controller to manually abort if we hit our timeout
            const abortController = new AbortController();
            abortController.abort();
          }
        }, platformConfig.timeout);
        
        try {
          // Force bypass cache to get latest counts when explicitly fetched
          const profileStats = await nostrBandService.fetchProfileStats(pubkey, true);
          
          if (isMounted.current) {
            logger.info(`[${platform}] Retrieved profile stats: ${JSON.stringify({
              followersCount: profileStats.followersCount,
              followingCount: profileStats.followingCount
            })}`);
            
            // React Query will handle caching for us
            return {
              ...profileStats,
              isLoading: false,
              error: null
            };
          } else {
            // Component unmounted, return empty stats to avoid unnecessary processing
            return {
              pubkey,
              followersCount: 0,
              followingCount: 0,
              isLoading: false,
              error: null
            };
          }
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        logger.error(`[${platform}] Error fetching profile stats: ${error}`);
        
        // On Android, return fallback values rather than throwing
        if (platform === 'Android') {
          return {
            pubkey,
            followersCount: 0,
            followingCount: 0,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error))
          };
        }
        
        throw error;
      }
    },
    // Configuration based on platform
    staleTime: platformConfig.staleTime,
    gcTime: platformConfig.gcTime,
    retry: platformConfig.retry,
    retryDelay: platformConfig.retryDelay,
    refetchOnMount: true,
    refetchOnWindowFocus: platform === 'iOS', // Only iOS refreshes on window focus
    refetchOnReconnect: true,
    refetchInterval: platformConfig.refetchInterval,
    enabled: !!pubkey,
  });
  
  // Enable more verbose debugging
  if (pubkey && (query.isLoading || query.isPending)) {
    logger.info(`[${platform}] ProfileStats loading for ${pubkey.substring(0, 8)}...`);
  }
  
  if (query.error) {
    logger.error(`[${platform}] ProfileStats error: ${query.error}`);
  }
  
  if (query.isSuccess && query.data) {
    logger.info(`[${platform}] ProfileStats success:`, {
      followersCount: query.data.followersCount,
      followingCount: query.data.followingCount
    });
  }
  
  // Use a properly typed default value for when query.data is undefined
  const defaultStats: ProfileStats = {
    pubkey: pubkey || '',
    followersCount: 0,
    followingCount: 0,
    isLoading: false,
    error: null
  };
  
  // Access the data directly from query.data with typed default
  const data = query.data || defaultStats;
  
  // Create explicit copy of values to ensure reactive updates
  const result = {
    pubkey: pubkey || '',
    followersCount: data.followersCount,
    followingCount: data.followingCount,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refresh: async () => {
      logger.info(`[${platform}] Manually refreshing stats for ${pubkey?.substring(0, 8)}...`);
      return query.refetch();
    },
    lastRefreshed: query.dataUpdatedAt
  };
  
  // Log every time we return stats for debugging
  logger.debug(`[${platform}] Returning stats:`, {
    followersCount: result.followersCount,
    followingCount: result.followingCount,
    isLoading: result.isLoading,
    lastRefreshed: new Date(result.lastRefreshed).toISOString()
  });
  
  return result;
}
