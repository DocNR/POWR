import * as FileSystem from 'expo-file-system';
import NDK, { NDKUser, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk-mobile';
import * as Crypto from 'expo-crypto';

// Constants for cache management
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit for profile images
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_FRESHNESS_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheAccessRecord {
  pubkey: string;
  path: string;
  size: number;
  lastAccessed: number;
}

/**
 * Service for caching profile images
 * This service downloads and caches profile images locally,
 * providing offline access and reducing network usage
 * 
 * Enhanced with:
 * - LRU-based eviction for space management
 * - Size-based limits (50MB max)
 * - Usage tracking for intelligent cleanup
 */
export class ProfileImageCache {
  private cacheDirectory: string;
  private ndk: NDK | null = null;
  private accessLog: Map<string, number> = new Map(); // Track last access times
  private cacheSize: number = 0; // Track total cache size
  private initialized: boolean = false;
  
  constructor() {
    this.cacheDirectory = `${FileSystem.cacheDirectory}profile-images/`;
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
        console.log(`Created profile image cache directory: ${this.cacheDirectory}`);
      }
    } catch (error) {
      console.error('Error creating cache directory:', error);
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
        if (!file.endsWith('.jpg')) continue;
        
        const filePath = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists && fileInfo.size) {
          const pubkey = file.replace('.jpg', '');
          
          // Add to access log with current time (conservative approach)
          this.accessLog.set(pubkey, Date.now());
          
          // Add to total cache size
          this.cacheSize += fileInfo.size;
        }
      }
      
      console.log(`Profile image cache initialized: ${files.length} files, ${(this.cacheSize / (1024 * 1024)).toFixed(2)} MB`);
      
      // If cache is over the limit already, clean it up
      if (this.cacheSize > MAX_CACHE_SIZE) {
        this.enforceSizeLimit();
      }
      
      // Mark as initialized
      this.initialized = true;
      
      // Also clear old cache based on time
      this.clearOldCache();
    } catch (error) {
      console.error('Error initializing cache metadata:', error);
    }
  }
  
  /**
   * Extract pubkey from a profile image URI
   * @param uri Profile image URI
   * @returns Pubkey if found, undefined otherwise
   */
  extractPubkeyFromUri(uri?: string): string | undefined {
    if (!uri) return undefined;
    
    // Try to extract pubkey from nostr: URI
    if (uri.startsWith('nostr:')) {
      const match = uri.match(/nostr:pubkey:([a-f0-9]{64})/i);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Try to extract from URL parameters
    try {
      const url = new URL(uri);
      const pubkey = url.searchParams.get('pubkey');
      if (pubkey && pubkey.length === 64) {
        return pubkey;
      }
    } catch (error) {
      // Not a valid URL, continue
    }
    
    return undefined;
  }
  
  /**
   * Get a cached profile image URI or download if needed
   * @param pubkey User's public key
   * @param fallbackUrl Fallback URL to use if no cached image is found
   * @returns Promise with the cached image URI or fallback URL
   */
  async getProfileImageUri(pubkey?: string, fallbackUrl?: string): Promise<string | undefined> {
    try {
      if (!pubkey) {
        return fallbackUrl;
      }
      
      // Check if image exists in cache
      const cachedPath = `${this.cacheDirectory}${pubkey}.jpg`;
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      
      if (fileInfo.exists && fileInfo.size > 0) {
        // Update access time regardless of whether we'll use it or redownload
        this.accessLog.set(pubkey, Date.now());
        
        // Check if cache is fresh (less than 24 hours old)
        const stats = await FileSystem.getInfoAsync(cachedPath, { md5: false });
        // Type assertion for modificationTime which might not be in the type definition
        const modTime = (stats as any).modificationTime || 0;
        const cacheAge = Date.now() - modTime * 1000;
        
        if (cacheAge < CACHE_FRESHNESS_MS) {
          console.log(`Using cached profile image for ${pubkey}`);
          return cachedPath;
        }
      }
      
      // Before downloading, make sure we have enough space
      await this.enforceSizeLimit();
      
      // If not in cache or stale, try to get from NDK
      if (this.ndk) {
        const user = new NDKUser({ pubkey });
        user.ndk = this.ndk;
        
        // Get profile from NDK cache first
        try {
          await user.fetchProfile({ 
            cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST 
          });
          let imageUrl = user.profile?.image || user.profile?.picture || fallbackUrl;
          
          if (imageUrl) {
            try {
              // Download and cache the image
              console.log(`Downloading profile image for ${pubkey} from ${imageUrl}`);
              const downloadResult = await FileSystem.downloadAsync(imageUrl, cachedPath);
              
              // Verify the downloaded file exists and has content
              if (downloadResult.status === 200) {
                const fileInfo = await FileSystem.getInfoAsync(cachedPath);
                if (fileInfo.exists && fileInfo.size > 0) {
                  console.log(`Successfully cached profile image for ${pubkey} (${(fileInfo.size / 1024).toFixed(1)} KB)`);
                  
                  // Update cache metadata
                  this.accessLog.set(pubkey, Date.now());
                  this.cacheSize += fileInfo.size;
                  return cachedPath;
                } else {
                  console.warn(`Downloaded image file is empty or missing: ${cachedPath}`);
                  // Delete the empty file
                  await FileSystem.deleteAsync(cachedPath, { idempotent: true });
                  return fallbackUrl;
                }
              } else {
                console.warn(`Failed to download image from ${imageUrl}, status: ${downloadResult.status}`);
                return fallbackUrl;
              }
            } catch (downloadError) {
              console.warn(`Error downloading image from ${imageUrl}:`, downloadError);
              // Clean up any partial downloads
              try {
                const fileInfo = await FileSystem.getInfoAsync(cachedPath);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(cachedPath, { idempotent: true });
                }
              } catch (cleanupError) {
                console.error('Error cleaning up failed download:', cleanupError);
              }
              return fallbackUrl;
            }
          }
        } catch (error) {
          console.log('Could not fetch profile from cache:', error);
        }
        
        // If not in cache and no fallback, try network
        if (!fallbackUrl) {
          try {
            await user.fetchProfile({
              cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST
            });
            const imageUrl = user.profile?.image || user.profile?.picture;
            
            if (imageUrl) {
              // Download and cache the image
              console.log(`Downloading profile image for ${pubkey} from ${imageUrl}`);
              const downloadResult = await FileSystem.downloadAsync(imageUrl, cachedPath);
              
              // Update cache metadata if successful
              if (downloadResult.status === 200) {
                const fileInfo = await FileSystem.getInfoAsync(cachedPath);
                if (fileInfo.exists && fileInfo.size > 0) {
                  this.accessLog.set(pubkey, Date.now());
                  this.cacheSize += fileInfo.size;
                }
              }
              return cachedPath;
            }
          } catch (error) {
            console.error('Error fetching profile from network:', error);
          }
        }
      }
      
      // Return fallback URL if provided and nothing in cache
      return fallbackUrl;
    } catch (error) {
      console.error('Error getting profile image:', error);
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
        if (!file.endsWith('.jpg')) continue;
        
        const pubkey = file.replace('.jpg', '');
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
          
          console.log(`Removed old profile image: ${record.pubkey} (${(record.size / 1024).toFixed(1)} KB)`);
        } catch (error) {
          console.error(`Error removing cache file ${record.path}:`, error);
        }
      }
      
      // Update total cache size
      this.cacheSize -= freedSpace;
      
      if (removedCount > 0) {
        console.log(`Cleaned up profile image cache: removed ${removedCount} files, freed ${(freedSpace / (1024 * 1024)).toFixed(2)} MB`);
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
            const pubkey = file.replace('.jpg', '');
            this.accessLog.delete(pubkey);
            this.cacheSize -= size;
            
            clearedCount++;
            clearedSize += size;
          }
        }
      }
      
      console.log(`Cleared ${clearedCount} old profile images from cache (${(clearedSize / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (error) {
      console.error('Error clearing old cache:', error);
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
      
      console.log('Profile image cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
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
export const profileImageCache = new ProfileImageCache();
