import { useQuery } from '@tanstack/react-query';
import { profileImageCache } from '@/lib/db/services/ProfileImageCache';
import { useNDK } from '@/lib/hooks/useNDK';
import { Platform } from 'react-native';
import { createLogger, enableModule } from '@/lib/utils/logger';
import { QUERY_KEYS } from '@/lib/queryKeys';

// Enable logging for useProfileImage
enableModule('useProfileImage');
const logger = createLogger('useProfileImage');
const platformTag = Platform.OS === 'ios' ? '[iOS]' : '[Android]';

/**
 * Hook to fetch and manage profile images with React Query integration
 * - Caches profile images in local filesystem and memory cache
 * - Automatically handles refreshing stale images
 * - Provides loading and error states
 * - Enhanced with platform-specific logging and debugging
 * - Optimized with improved refresh policies
 * 
 * @param pubkey The user's public key
 * @param fallbackUrl Optional fallback URL for missing profile images
 * @returns Object with profile image URI and status information
 */
export function useProfileImage(pubkey?: string, fallbackUrl?: string) {
  const { ndk } = useNDK();
  
  // Set NDK in profile image cache if available
  if (ndk && profileImageCache) {
    logger.debug(`${platformTag} Setting NDK in profile image cache`);
    profileImageCache.setNDK(ndk);
  }
  
  return useQuery({
    queryKey: QUERY_KEYS.profile.profileImage(pubkey),
    queryFn: async () => {
      if (!pubkey) {
        logger.info(`${platformTag} No pubkey provided to useProfileImage, returning fallback`);
        return fallbackUrl;
      }
      
      logger.info(`${platformTag} Fetching profile image for pubkey: ${pubkey.substring(0, 8)}...`);
      
      try {
        const imageUri = await profileImageCache.getProfileImageUri(pubkey, fallbackUrl);
        
        if (!imageUri) {
          logger.warn(`${platformTag} No image URI returned from cache service`);
          return fallbackUrl || null;
        }
        
        logger.info(`${platformTag} Returning profile image URI: ${imageUri}`);
        
        // Ensure we never return undefined to React Query
        return imageUri || fallbackUrl || null;
      } catch (error) {
        logger.error(`${platformTag} Error in useProfileImage: ${error}`);
        if (error instanceof Error) {
          logger.error(`${platformTag} Error details: ${error.message}`);
          logger.debug(`${platformTag} Stack trace: ${error.stack}`);
        }
        // Return fallback or null, but never undefined
        return fallbackUrl || null;
      }
    },
    // Aggressive refresh configuration matching useBannerImage
    staleTime: 0, // No stale time - always refetch
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: 2, // Increase retries to 2
    retryDelay: 1000, // Retry after 1 second
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refresh when window focuses
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!pubkey, // Only run the query if we have a pubkey
    networkMode: 'always' // Try to fetch even when offline
  });
}
