import { useQuery } from '@tanstack/react-query';
import { bannerImageCache } from '@/lib/db/services/BannerImageCache';
import { useNDK } from '@/lib/hooks/useNDK';
import { Platform } from 'react-native';
import { createLogger, enableModule } from '@/lib/utils/logger';
import { QUERY_KEYS } from '@/lib/queryKeys';

// Enable logging for useBannerImage
enableModule('useBannerImage');
const logger = createLogger('useBannerImage');
const platformTag = Platform.OS === 'ios' ? '[iOS]' : '[Android]';

/**
 * Hook to fetch and manage banner images with React Query integration
 * - Caches banner images in local filesystem and memory cache
 * - Automatically handles refreshing stale images
 * - Provides loading and error states
 * - Enhanced with platform-specific path handling and debugging
 * - Optimized with improved refresh policies for both iOS and Android
 * 
 * @param pubkey The user's public key
 * @param fallbackUrl Optional fallback URL for missing banners
 * @returns Object with banner URI and status information
 */
export function useBannerImage(pubkey?: string, fallbackUrl?: string) {
  const { ndk } = useNDK();
  
  // Set NDK in banner image cache if available
  if (ndk && bannerImageCache) {
    logger.debug(`${platformTag} Setting NDK in banner image cache`);
    bannerImageCache.setNDK(ndk);
  }
  
  return useQuery({
    queryKey: QUERY_KEYS.profile.bannerImage(pubkey),
    queryFn: async () => {
      if (!pubkey) {
        logger.info(`${platformTag} No pubkey provided to useBannerImage, returning fallback`);
        return fallbackUrl;
      }
      
      logger.info(`${platformTag} Fetching banner image for pubkey: ${pubkey.substring(0, 8)}...`);
      
      try {
        // Get banner URI from cache service
        const bannerUri = await bannerImageCache.getBannerImageUri(pubkey, fallbackUrl);
        
        if (!bannerUri) {
          logger.warn(`${platformTag} No banner URI returned from cache service`);
          return fallbackUrl || null;
        }
        
        logger.debug(`${platformTag} Raw banner URI from cache: ${bannerUri}`);
        
        // Platform-specific URI handling
        if (Platform.OS === 'ios') {
          // iOS path handling - ensure file:// prefix is present
          if (bannerUri.startsWith('/') && !bannerUri.startsWith('file://')) {
            logger.debug(`${platformTag} Adding file:// prefix to iOS path: ${bannerUri}`);
            const fixedUri = `file://${bannerUri}`;
            logger.info(`${platformTag} Returning fixed iOS banner URI: ${fixedUri}`);
            return fixedUri;
          }
        } else if (Platform.OS === 'android') {
          // Android path handling - ensure path is in the correct format
          if (bannerUri.startsWith('/') && !bannerUri.startsWith('file://')) {
            logger.debug(`${platformTag} Adding file:// prefix to Android path: ${bannerUri}`);
            const fixedUri = `file://${bannerUri}`;
            logger.info(`${platformTag} Returning fixed Android banner URI: ${fixedUri}`);
            return fixedUri;
          }
          
          // Special handling for Android remote URLs
          if (bannerUri.startsWith('http') && !bannerUri.includes('?t=')) {
            // Add cache-busting parameter to force reload on Android
            const cacheParam = `?t=${Date.now()}`;
            logger.debug(`${platformTag} Adding cache-busting parameter to Android remote URL`);
            const fixedUri = `${bannerUri}${cacheParam}`;
            logger.info(`${platformTag} Returning fixed Android remote URL: ${fixedUri}`);
            return fixedUri;
          }
        }
        
        logger.info(`${platformTag} Returning unmodified banner URI: ${bannerUri}`);
        
        // Ensure we never return undefined to React Query
        return bannerUri || fallbackUrl || null;
      } catch (error) {
        logger.error(`${platformTag} Error in useBannerImage: ${error}`);
        if (error instanceof Error) {
          logger.error(`${platformTag} Error details: ${error.message}`);
          logger.debug(`${platformTag} Stack trace: ${error.stack}`);
        }
        // Return fallback or null, but never undefined
        return fallbackUrl || null;
      }
    },
    // Aggressive refresh configuration
    staleTime: 0, // No stale time - always refetch
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: 3, // Increase retries for Android
    retryDelay: 800, // Retry slightly faster on Android
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refresh when window focuses
    refetchInterval: Platform.OS === 'android' ? 20000 : 30000, // Refetch more frequently on Android
    enabled: !!pubkey, // Only run the query if we have a pubkey
    networkMode: 'always' // Try to fetch even when offline
  });
}
