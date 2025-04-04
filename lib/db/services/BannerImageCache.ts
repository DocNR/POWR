import * as FileSystem from 'expo-file-system';
import NDK, { NDKUser, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk-mobile';
import { createLogger, enableModule } from '@/lib/utils/logger';
import { Platform } from 'react-native';

// Enable logging for BannerImageCache
enableModule('BannerImageCache');
const logger = createLogger('BannerImageCache');
const platformTag = Platform.OS === 'ios' ? '[iOS]' : '[Android]';

// Constants for cache management
const MAX_CACHE_SIZE = 150 * 1024 * 1024; // 150MB limit for banner images (larger than profile images)
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheAccessRecord {
  pubkey: string;
  path: string;
  size: number;
  lastAccessed: number;
}

/**
 * Service for caching profile banner images
 * This service downloads and caches banner images locally,
 * providing offline access and reducing network usage
 * 
 * Enhanced with:
 * - LRU-based eviction for space management
 * - Size-based limits (150MB max)
 * - Usage tracking for intelligent cleanup
 */
export class BannerImageCache {
  private cacheDirectory: string;
  private ndk: NDK | null = null;
  private accessLog: Map<string, number> = new Map(); // Track last access times
  private cacheSize: number = 0; // Track total cache size
  private initialized: boolean = false;
  
  constructor() {
    this.cacheDirectory = `${FileSystem.cacheDirectory}banner-images/`;
    this.ensureCacheDirectoryExists();
  }
  
  /**
   * Set the NDK instance for profile fetching
   * @param ndk NDK instance
   */
  setNDK(ndk: NDK) {
    this.ndk = ndk;
    
    // Initialize cache metadata when NDK is set
    if (!this.initialized) {
      this.initializeCacheMetadata();
    }
  }
  
  /**
   * Ensure the cache directory exists
   * @private
   */
  private async ensureCacheDirectoryExists() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
        console.log(`Created banner image cache directory: ${this.cacheDirectory}`);
      }
    } catch (error) {
      console.error('Error creating banner cache directory:', error);
    }
  }
  
  /**
   * Initialize cache metadata by scanning the cache directory
   * @private
   */
  private async initializeCacheMetadata() {
    try {
      // Get list of all cached files
      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      this.cacheSize = 0;
      
      // Process each file to build the access log and calculate total size
      for (const file of files) {
        if (!file.endsWith('_banner.jpg')) continue;
        
        const filePath = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.size) {
          const pubkey = file.replace('_banner.jpg', '');
          
          // Add to access log with current time (conservative approach)
          this.accessLog.set(pubkey, Date.now());
          
          // Add to total cache size
          this.cacheSize += fileInfo.size;
        }
      }
      
      console.log(`Banner image cache initialized: ${files.length} files, ${(this.cacheSize / (1024 * 1024)).toFixed(2)} MB`);
      
      // If cache is over the limit already, clean it up
      if (this.cacheSize > MAX_CACHE_SIZE) {
        this.enforceSizeLimit();
      }
      
      // Mark as initialized
      this.initialized = true;
      
      // Also clear old cache based on time
      this.clearOldCache();
    } catch (error) {
      console.error('Error initializing banner cache metadata:', error);
    }
  }
  
  /**
   * Get a cached banner image URI or download if needed
   * @param pubkey User's public key
   * @param fallbackUrl Fallback URL to use if no cached image is found
   * @returns Promise with the cached image URI or fallback URL
   */
  async getBannerImageUri(pubkey?: string, fallbackUrl?: string): Promise<string | undefined> {
    try {
      if (!pubkey) {
        logger.warn(`${platformTag} getBannerImageUri called without pubkey`);
        return fallbackUrl;
      }
      
      logger.info(`${platformTag} Getting banner for pubkey: ${pubkey.substring(0, 8)}...`);
      
      // Check if image exists in cache
      const cachedPath = `${this.cacheDirectory}${pubkey}_banner.jpg`;
      logger.debug(`${platformTag} Checking cache at path: ${cachedPath}`);
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      
      if (fileInfo.exists && fileInfo.size > 0) {
        // Update access time regardless of whether we'll use it or redownload
        this.accessLog.set(pubkey, Date.now());
        logger.info(`${platformTag} Found cached banner image (size: ${fileInfo.size} bytes)`);
        
        // Check if cache is fresh (less than 24 hours old)
        const stats = await FileSystem.getInfoAsync(cachedPath, { md5: false });
        logger.debug(`${platformTag} Cache file stats: ${JSON.stringify(stats)}`);
        
        // Type assertion for modificationTime which might not be in the type definition
        const modTime = (stats as any).modificationTime || 0;
        const cacheAge = Date.now() - modTime * 1000;
        
        logger.debug(`${platformTag} Cache age: ${(cacheAge / (1000 * 60 * 60)).toFixed(1)} hours, threshold: ${(CACHE_FRESHNESS_MS / (1000 * 60 * 60))} hours`);
        
        if (cacheAge < CACHE_FRESHNESS_MS) {
          logger.info(`${platformTag} Using cached banner image for ${pubkey.substring(0, 8)}...`);
          // iOS might need a full file:// prefix for the path
          const fullPath = Platform.OS === 'ios' 
            ? (cachedPath.startsWith('file://') ? cachedPath : `file://${cachedPath}`)
            : cachedPath;
          
          logger.debug(`${platformTag} Returning cache path: ${fullPath}`);
          return fullPath;
        } else {
          logger.info(`${platformTag} Cached image is stale (${(cacheAge / (1000 * 60 * 60)).toFixed(1)} hours old), will redownload`);
        }
      } else {
        logger.info(`${platformTag} No cached banner image found or file is empty`);
      }
      
      // Before downloading, make sure we have enough space
      await this.enforceSizeLimit();
      
      // If not in cache or stale, try to get from NDK
      if (this.ndk) {
        logger.info(`${platformTag} Attempting to fetch profile data from NDK`);
        const user = new NDKUser({ pubkey });
        user.ndk = this.ndk;
        
        // Get profile from NDK cache first
        try {
          logger.debug(`${platformTag} Fetching profile with CACHE_FIRST strategy`);
          await user.fetchProfile({ 
            cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST 
          });
          
          // Log profile data for debugging
          logger.debug(`${platformTag} Profile data received: ${JSON.stringify({
            hasBanner: !!user.profile?.banner,
            hasBackground: !!(user.profile as any)?.background,
            hasFallback: !!fallbackUrl
          })}`);
          
          let imageUrl = user.profile?.banner ||
                       (user.profile as any)?.background ||
                        fallbackUrl;
          
          if (imageUrl) {
            logger.info(`${platformTag} Found image URL: ${imageUrl}`);
            try {
              // Download and cache the image
              logger.info(`${platformTag} Downloading banner image for ${pubkey.substring(0, 8)}... from ${imageUrl}`);
              const downloadResult = await FileSystem.downloadAsync(imageUrl, cachedPath);
              logger.debug(`${platformTag} Download result: ${JSON.stringify({
                status: downloadResult.status,
                headers: downloadResult.headers,
              })}`);
              
              // Verify the downloaded file exists and has content
              if (downloadResult.status === 200) {
                const fileInfo = await FileSystem.getInfoAsync(cachedPath);
                logger.debug(`${platformTag} Downloaded file info: ${JSON.stringify(fileInfo)}`);
                
                if (fileInfo.exists && fileInfo.size > 0) {
                  logger.info(`${platformTag} Successfully cached banner image (${(fileInfo.size / 1024).toFixed(1)} KB)`);
                  
                  // Update cache metadata
                  this.accessLog.set(pubkey, Date.now());
                  this.cacheSize += fileInfo.size;
                  
                  // iOS might need a full file:// prefix for the path
                  const fullPath = Platform.OS === 'ios' 
                    ? (cachedPath.startsWith('file://') ? cachedPath : `file://${cachedPath}`)
                    : cachedPath;
                  
                  logger.debug(`${platformTag} Returning downloaded image path: ${fullPath}`);
                  return fullPath;
                } else {
                  logger.warn(`${platformTag} Downloaded banner file is empty or missing: ${cachedPath}`);
                  // Delete the empty file
                  await FileSystem.deleteAsync(cachedPath, { idempotent: true });
                  return fallbackUrl;
                }
              } else {
                logger.warn(`${platformTag} Failed to download banner, status: ${downloadResult.status}`);
                return fallbackUrl;
              }
            } catch (downloadError) {
              logger.error(`${platformTag} Error downloading banner: ${downloadError}`);
              if (downloadError instanceof Error) {
                logger.error(`${platformTag} Error details: ${downloadError.message}`);
                logger.debug(`${platformTag} Stack trace: ${downloadError.stack}`);
              }
              
              // Clean up any partial downloads
              try {
                const fileInfo = await FileSystem.getInfoAsync(cachedPath);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(cachedPath, { idempotent: true });
                  logger.debug(`${platformTag} Cleaned up partial download`);
                }
              } catch (cleanupError) {
                logger.error(`${platformTag} Error cleaning up failed download: ${cleanupError}`);
              }
              return fallbackUrl;
            }
          } else {
            logger.info(`${platformTag} No banner image URL found in profile`);
          }
        } catch (error) {
          console.log('Could not fetch profile from cache:', error);
        }
        
        // If not in cache and no fallback, try network
        if (!fallbackUrl) {
          logger.info(`${platformTag} No fallback URL provided, trying network fetch as last resort`);
          try {
            logger.debug(`${platformTag} Fetching profile with CACHE_FIRST strategy (retry attempt)`);
            await user.fetchProfile({
              cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
            });
            const imageUrl = user.profile?.banner || (user.profile as any)?.background;
            
            if (imageUrl) {
              logger.info(`${platformTag} Found image URL in second attempt: ${imageUrl}`);
              // Download and cache the image
              const downloadResult = await FileSystem.downloadAsync(imageUrl, cachedPath);
              logger.debug(`${platformTag} Second download result: ${JSON.stringify({
                status: downloadResult.status,
                headers: downloadResult.headers,
              })}`);
              
              // Update cache metadata if successful
              if (downloadResult.status === 200) {
                const fileInfo = await FileSystem.getInfoAsync(cachedPath);
                if (fileInfo.exists && fileInfo.size > 0) {
                  logger.info(`${platformTag} Successfully cached banner in second attempt (${(fileInfo.size / 1024).toFixed(1)} KB)`);
                  this.accessLog.set(pubkey, Date.now());
                  this.cacheSize += fileInfo.size;
                  
                  // iOS might need a full file:// prefix for the path
                  const fullPath = Platform.OS === 'ios' 
                    ? (cachedPath.startsWith('file://') ? cachedPath : `file://${cachedPath}`)
                    : cachedPath;
                  
                  logger.debug(`${platformTag} Returning downloaded image path from second attempt: ${fullPath}`);
                  return fullPath;
                } else {
                  logger.warn(`${platformTag} Second downloaded banner file is empty or missing`);
                }
              } else {
                logger.warn(`${platformTag} Second download attempt failed, status: ${downloadResult.status}`);
              }
            } else {
              logger.info(`${platformTag} No banner URL found in second profile fetch attempt`);
            }
          } catch (error) {
            logger.error(`${platformTag} Error fetching profile from network: ${error}`);
            if (error instanceof Error) {
              logger.error(`${platformTag} Error details: ${error.message}`);
            }
          }
        } else {
          logger.info(`${platformTag} Using fallback URL as last resort: ${fallbackUrl}`);
        }
      }
      
      // Return fallback URL if provided and nothing in cache
      return fallbackUrl;
    } catch (error) {
      console.error('Error getting banner image:', error);
      return fallbackUrl;
    }
  }
  
  /**
   * Enforce the cache size limit by removing least recently used items
   * @private
   */
  private async enforceSizeLimit() {
    try {
      // If we're under the limit, no need to clean up
      if (this.cacheSize <= MAX_CACHE_SIZE * 0.9) { // 90% threshold to avoid cleaning up too often
        return;
      }
      
      // Convert the access log to an array for sorting
      const accessRecords: CacheAccessRecord[] = [];
      
      // Get all cache files with their metadata
      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      for (const file of files) {
        if (!file.endsWith('_banner.jpg')) continue;
        
        const pubkey = file.replace('_banner.jpg', '');
        const path = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(path);
        
        if (fileInfo.exists && fileInfo.size) {
          accessRecords.push({
            pubkey,
            path,
            size: fileInfo.size,
            lastAccessed: this.accessLog.get(pubkey) || 0
          });
        }
      }
      
      // Sort by last accessed time (oldest first)
      accessRecords.sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Delete oldest files until we're under the size limit
      let removedCount = 0;
      let freedSpace = 0;
      
      for (const record of accessRecords) {
        // Stop if we've freed enough space (aim for 75% of max to leave headroom)
        if (this.cacheSize - freedSpace <= MAX_CACHE_SIZE * 0.75) {
          break;
        }
        
        try {
          await FileSystem.deleteAsync(record.path, { idempotent: true });
          
          // Update cache metadata
          this.accessLog.delete(record.pubkey);
          freedSpace += record.size;
          removedCount++;
          
          console.log(`Removed old banner image: ${record.pubkey} (${(record.size / 1024).toFixed(1)} KB)`);
        } catch (error) {
          console.error(`Error removing cache file ${record.path}:`, error);
        }
      }
      
      // Update total cache size
      this.cacheSize -= freedSpace;
      
      if (removedCount > 0) {
        console.log(`Cleaned up banner image cache: removed ${removedCount} files, freed ${(freedSpace / (1024 * 1024)).toFixed(2)} MB`);
      }
    } catch (error) {
      console.error('Error enforcing cache size limit:', error);
    }
  }
  
  /**
   * Clear old cached images
   * @param maxAgeDays Maximum age in days (default: 7)
   * @returns Promise that resolves when clearing is complete
   */
  async clearOldCache(maxAgeDays: number = 7): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let clearedCount = 0;
      let clearedSize = 0;
      
      for (const file of files) {
        const filePath = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          // Type assertion for modificationTime
          const modTime = (fileInfo as any).modificationTime || 0;
          const fileAge = now - modTime * 1000;
          if (fileAge > maxAgeMs) {
            // Get file size for statistics before deleting
            const size = fileInfo.size || 0;
            
            await FileSystem.deleteAsync(filePath);
            
            // Update cache metadata
            const pubkey = file.replace('_banner.jpg', '');
            this.accessLog.delete(pubkey);
            this.cacheSize -= size;
            
            clearedCount++;
            clearedSize += size;
          }
        }
      }
      
      console.log(`Cleared ${clearedCount} old banner images from cache (${(clearedSize / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (error) {
      console.error('Error clearing old banner cache:', error);
    }
  }
  
  /**
   * Clear the entire cache
   * @returns Promise that resolves when clearing is complete
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDirectory, { idempotent: true });
      await this.ensureCacheDirectoryExists();
      
      // Reset metadata
      this.accessLog.clear();
      this.cacheSize = 0;
      this.initialized = false;
      
      console.log('Banner image cache cleared');
    } catch (error) {
      console.error('Error clearing banner cache:', error);
    }
  }
  
  /**
   * Get current cache statistics
   * @returns Object with cache statistics
   */
  async getCacheStats() {
    return {
      size: this.cacheSize,
      itemCount: this.accessLog.size,
      directory: this.cacheDirectory
    };
  }
}

// Create singleton instance
export const bannerImageCache = new BannerImageCache();
