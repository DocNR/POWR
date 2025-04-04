import { useQuery } from '@tanstack/react-query';
import { nostrBandService, ProfileStats } from '@/lib/services/NostrBandService';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { createLogger, enableModule } from '@/lib/utils/logger';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { Platform } from 'react-native';

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
  
  const query = useQuery({
    queryKey: QUERY_KEYS.profile.stats(pubkey),
    queryFn: async () => {
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
        // Add timestamp to bust cache on every request
        const apiUrl = `https://api.nostr.band/v0/stats/profile/${pubkey}?_t=${Date.now()}`;
        logger.info(`[${platform}] Fetching from URL: ${apiUrl}`);
        
        // Force bypass cache to get latest counts when explicitly fetched
        const profileStats = await nostrBandService.fetchProfileStats(pubkey, true);
        
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
      } catch (error) {
        logger.error(`[${platform}] Error fetching profile stats: ${error}`);
        throw error;
      }
    },
    // Configuration - force aggressive refresh behavior
    staleTime: 0, // No stale time - always refetch when used
    gcTime: 2 * 60 * 1000, // 2 minutes (reduced from 5 minutes)
    retry: 3, // Increase retries
    retryDelay: 1000, // 1 second between retries
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: true, 
    refetchOnReconnect: true,
    refetchInterval: refreshInterval > 0 ? refreshInterval : 10000, // Default to 10 second refresh
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
