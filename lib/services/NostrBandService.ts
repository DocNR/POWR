// lib/services/NostrBandService.ts
import { nip19 } from 'nostr-tools';

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
  
  /**
   * Fetches profile statistics from nostr.band API
   * @param pubkey Pubkey in hex format or npub format
   * @returns Promise with profile stats
   */
  async fetchProfileStats(pubkey: string): Promise<ProfileStats> {
    try {
      // Check if pubkey is npub or hex and convert if needed
      let hexPubkey = pubkey;
      if (pubkey.startsWith('npub')) {
        try {
          const decoded = nip19.decode(pubkey);
          if (decoded.type === 'npub') {
            hexPubkey = decoded.data as string;
          }
        } catch (error) {
          console.error('Error decoding npub:', error);
          throw new Error('Invalid npub format');
        }
      }
      
      // Build URL
      const endpoint = `/v0/stats/profile/${hexPubkey}`;
      const url = `${this.apiUrl}${endpoint}`;
      
      // Fetch data
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json() as NostrBandProfileStatsResponse;
      
      // Extract relevant stats
      const profileStats = data.stats[hexPubkey];
      
      if (!profileStats) {
        throw new Error('Profile stats not found in response');
      }
      
      return {
        pubkey: hexPubkey,
        followersCount: profileStats.followers_pubkey_count ?? 0,
        followingCount: profileStats.pub_following_pubkey_count ?? 0,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      return {
        pubkey,
        followersCount: 0,
        followingCount: 0,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
}

// Export a singleton instance
export const nostrBandService = new NostrBandService();
