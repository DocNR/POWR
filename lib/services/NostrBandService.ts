// lib/services/NostrBandService.ts
import { nip19 } from 'nostr-tools';
import { createLogger, enableModule } from '@/lib/utils/logger';
import { Platform } from 'react-native';

// Enable logging
enableModule('NostrBandService');
const logger = createLogger('NostrBandService');
const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';

export interface ProfileStats {
  pubkey: string;
  followersCount: number;
  followingCount: number;
  isLoading: boolean;
  error: Error | null;
}

interface NostrBandProfileStatsResponse {
  stats: {
    [pubkey: string]: {
      pubkey: string;
      followers_pubkey_count?: number;
      pub_following_pubkey_count?: number;
      // Add other fields as needed from the API response
    };
  };
}

/**
 * Service for interacting with the NostrBand API
 * This service provides methods to fetch statistics from nostr.band
 */
export class NostrBandService {
  private readonly apiUrl = 'https://api.nostr.band';
  private cacheDisabled = true; // Disable any internal caching
  
  /**
   * Fetches profile statistics from nostr.band API
   * @param pubkey Pubkey in hex format or npub format
   * @param forceFresh Whether to bypass any caching with a cache-busting parameter
   * @returns Promise with profile stats
   */
  async fetchProfileStats(pubkey: string, forceFresh: boolean = true): Promise<ProfileStats> {
    try {
      // Always log request details
      logger.info(`[${platform}] Fetching profile stats for pubkey: ${pubkey.substring(0, 8)}...`);
      
      // Check if pubkey is npub or hex and convert if needed
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub')) {
        try {
          const decoded = nip19.decode(pubkey);
          if (decoded.type === 'npub') {
            hexPubkey = decoded.data as string;
          }
        } catch (error) {
          logger.error(`[${platform}] Error decoding npub:`, error);
          throw new Error('Invalid npub format');
        }
      }
      
      // Always force cache busting
      const cacheBuster = `?_t=${Date.now()}`;
      const endpoint = `/v0/stats/profile/${hexPubkey}`;
      const url = `${this.apiUrl}${endpoint}${cacheBuster}`;
      
      logger.info(`[${platform}] Fetching from: ${url}`);
      
      // Fetch with explicit no-cache headers
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[${platform}] API error: ${response.status} - ${errorText}`);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json() as NostrBandProfileStatsResponse;
      
      // Check if we got valid data
      if (!data || !data.stats || !data.stats[hexPubkey]) {
        logger.error(`[${platform}] Invalid response from API:`, JSON.stringify(data));
        throw new Error('Invalid response from API');
      }
      
      // Extract relevant stats
      const profileStats = data.stats[hexPubkey];
      
      // Create result with real data - ensure we have non-null values
      const result = {
        pubkey: hexPubkey,
        followersCount: profileStats.followers_pubkey_count ?? 0,
        followingCount: profileStats.pub_following_pubkey_count ?? 0,
        isLoading: false,
        error: null
      };
      
      // Log the fetched stats
      logger.info(`[${platform}] Fetched stats for ${hexPubkey.substring(0, 8)}:`, {
        followersCount: result.followersCount,
        followingCount: result.followingCount
      });
      
      return result;
    } catch (error) {
      // Log the error with platform info
      logger.error(`[${platform}] Error fetching profile stats:`, error);
      
      // Always throw to allow the query to properly retry
      throw error;
    }
  }
}

// Export a singleton instance
export const nostrBandService = new NostrBandService();
