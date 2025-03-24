import * as FileSystem from 'expo-file-system';
import NDK, { NDKUser, NDKSubscriptionCacheUsage } from '@nostr-dev-kit/ndk-mobile';
import * as Crypto from 'expo-crypto';

/**
 * Service for caching profile images
 * This service downloads and caches profile images locally,
 * providing offline access and reducing network usage
 */
export class ProfileImageCache {
  private cacheDirectory: string;
  private ndk: NDK | null = null;
  
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
      
      if (fileInfo.exists) {
        // Check if cache is fresh (less than 24 hours old)
        const stats = await FileSystem.getInfoAsync(cachedPath, { md5: false });
        // Type assertion for modificationTime which might not be in the type definition
        const modTime = (stats as any).modificationTime || 0;
        const cacheAge = Date.now() - modTime * 1000;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge < maxAge) {
          console.log(`Using cached profile image for ${pubkey}`);
          return cachedPath;
        }
      }
      
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
                  console.log(`Successfully cached profile image for ${pubkey}`);
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
              await FileSystem.downloadAsync(imageUrl, cachedPath);
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
      
      for (const file of files) {
        const filePath = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
          // Type assertion for modificationTime
          const modTime = (fileInfo as any).modificationTime || 0;
          const fileAge = now - modTime * 1000;
          if (fileAge > maxAgeMs) {
            await FileSystem.deleteAsync(filePath);
            clearedCount++;
          }
        }
      }
      
      console.log(`Cleared ${clearedCount} old profile images from cache`);
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
      console.log('Profile image cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

// Create singleton instance
export const profileImageCache = new ProfileImageCache();
