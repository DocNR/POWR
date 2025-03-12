// lib/db/services/RelayService.ts
import NDK, { NDKRelay } from '@nostr-dev-kit/ndk-mobile';

// Default relays to use when none are configured
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io', 
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://relay.current.fyi'
];

export interface RelayConfig {
  url: string;
  read: boolean;
  write: boolean;
  priority?: number;
  created_at?: number;
  updated_at?: number;
}

export interface RelayWithStatus extends RelayConfig {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
}

/**
 * Service for managing Nostr relays
 * This implementation uses NDK's built-in relay management capabilities
 */
export class RelayService {
  private ndk: NDK | null = null;
  private debug: boolean = false; 

  constructor() {
    // No database required anymore
  }

  enableDebug() {
    this.debug = true;
    console.log('[RelayService] Debug mode enabled');
  }
    
  private logDebug(message: string, ...args: any[]) {
    if (this.debug) {
      console.log(`[RelayService Debug] ${message}`, ...args);
    }
  }

  /**
   * Set NDK instance for relay operations
   */
  setNDK(ndk: NDK) {
    this.ndk = ndk;
    console.log('[RelayService] NDK instance set');
  }

  /**
   * Get all relays with their current connection status
   */
  async getAllRelaysWithStatus(): Promise<RelayWithStatus[]> {
    try {
      if (!this.ndk) {
        console.warn('[RelayService] NDK not initialized, returning empty relay list');
        return [];
      }
      
      const relays: RelayWithStatus[] = [];
      
      // Get relays directly from NDK pool
      this.ndk.pool.relays.forEach((relay, url) => {
        const status = this.getRelayStatus(relay);
        
        relays.push({
          url,
          read: relay.read ?? true,
          write: relay.write ?? true,
          status,
          priority: 0, // Default priority
          created_at: Date.now(),
          updated_at: Date.now()
        });
      });
      
      console.log(`[RelayService] Found ${relays.length} relays in NDK pool`);
      return relays;
    } catch (error) {
      console.error('[RelayService] Error getting relays with status:', error);
      return [];
    }
  }

  /**
   * Add a new relay to NDK
   */
  async addRelay(url: string, read = true, write = true): Promise<boolean> {
    try {
      if (!this.ndk) {
        throw new Error('NDK not initialized');
      }
      
      // Normalize URL by removing trailing slash
      url = url.replace(/\/$/, '');
      
      // Validate URL format
      if (!url.startsWith('wss://')) {
        throw new Error('Relay URL must start with wss://');
      }
      
      console.log(`[RelayService] Adding relay ${url} with read=${read}, write=${write}`);
      
      // Get or create the relay using the NDK pool
      const relay = this.ndk.pool.getRelay(url, true);
      
      // Set read/write permissions
      relay.read = read;
      relay.write = write;
      
      // Connect to the relay if not already connected
      if (!relay.connected) {
        try {
          await relay.connect();
        } catch (connectError) {
          console.warn(`[RelayService] Warning: Error connecting to relay ${url}:`, connectError);
          // Continue even if connection fails - it will auto-reconnect
        }
      }
      
      console.log(`[RelayService] Successfully added relay ${url}`);
      return true;
    } catch (error) {
      console.error('[RelayService] Error adding relay:', error);
      throw error;
    }
  }

  /**
   * Update an existing relay
   */
  async updateRelay(url: string, changes: Partial<RelayConfig>): Promise<boolean> {
    try {
      if (!this.ndk) {
        throw new Error('NDK not initialized');
      }
      
      // Get the relay from NDK pool
      const relay = this.ndk.pool.getRelay(url, false);
      
      if (!relay) {
        console.log(`[RelayService] Relay ${url} not found, adding instead`);
        const read = changes.read !== undefined ? changes.read : true;
        const write = changes.write !== undefined ? changes.write : true;
        return this.addRelay(url, read, write);
      }
      
      // Update relay properties
      if (changes.read !== undefined) {
        relay.read = changes.read;
      }
      
      if (changes.write !== undefined) {
        relay.write = changes.write;
      }
      
      console.log(`[RelayService] Updated relay ${url} with new settings`);
      return true;
    } catch (error) {
      console.error('[RelayService] Error updating relay:', error);
      throw error;
    }
  }

  /**
   * Remove a relay from NDK
   */
  async removeRelay(url: string): Promise<boolean> {
    try {
      if (!this.ndk) {
        throw new Error('NDK not initialized');
      }
      
      console.log(`[RelayService] Removing relay ${url}`);
      
      // Use NDK pool's removeRelay method
      const success = this.ndk.pool.removeRelay(url);
      
      if (success) {
        console.log(`[RelayService] Successfully removed relay ${url}`);
      } else {
        console.log(`[RelayService] Relay ${url} was not found in the pool`);
      }
      
      return success;
    } catch (error) {
      console.error('[RelayService] Error removing relay:', error);
      throw error;
    }
  }

  /**
   * Apply relay configuration to NDK
   */
  async applyRelayConfig(relays: RelayConfig[]): Promise<boolean> {
    try {
      if (!this.ndk) {
        throw new Error('NDK not initialized');
      }
      
      if (relays.length === 0) {
        console.warn('[RelayService] No relays provided, using defaults');
        return this.resetToDefaults();
      }
      
      console.log(`[RelayService] Applying configuration for ${relays.length} relays`);
      
      // Get current relays from NDK
      const currentRelays = Array.from(this.ndk.pool.relays.keys());
      
      // Remove relays that aren't in the new configuration
      for (const url of currentRelays) {
        if (!relays.find(r => r.url === url)) {
          console.log(`[RelayService] Removing relay ${url} from NDK pool`);
          this.ndk.pool.removeRelay(url);
        }
      }
      
      // Add or update relays from the configuration
      for (const relay of relays) {
        const ndkRelay = this.ndk.pool.getRelay(relay.url, false);
        
        if (ndkRelay) {
          // Update existing relay
          ndkRelay.read = relay.read;
          ndkRelay.write = relay.write;
        } else {
          // Add new relay
          console.log(`[RelayService] Adding relay ${relay.url} to NDK pool`);
          const newRelay = this.ndk.pool.getRelay(relay.url, true);
          newRelay.read = relay.read;
          newRelay.write = relay.write;
        }
      }
      
      console.log('[RelayService] Successfully applied relay configuration');
      return true;
    } catch (error) {
      console.error('[RelayService] Error applying relay configuration:', error);
      throw error;
    }
  }

  /**
   * Initialize relays - used during app startup
   */
  async initializeRelays(): Promise<boolean> {
    try {
      if (!this.ndk) {
        throw new Error('NDK not initialized');
      }
      
      console.log('[RelayService] Initializing relays');
      
      // Check if we already have relays in the pool
      if (this.ndk.pool.size() === 0) {
        // No relays, add the defaults
        console.log('[RelayService] No relays found, adding defaults');
        for (const url of DEFAULT_RELAYS) {
          const relay = this.ndk.pool.getRelay(url, true);
          await relay.connect();
        }
      }
      
      return true;
    } catch (error) {
      console.error('[RelayService] Error initializing relays:', error);
      // Reset to defaults on error
      return this.resetToDefaults();
    }
  }

  /**
   * Reset relays to default set
   */
  async resetToDefaults(): Promise<boolean> {
    try {
      if (!this.ndk) {
        throw new Error('NDK not initialized');
      }
      
      console.log('[RelayService] Resetting relays to defaults');
      
      // Clear existing relays from NDK
      const currentRelays = Array.from(this.ndk.pool.relays.keys());
      for (const url of currentRelays) {
        this.ndk.pool.removeRelay(url);
      }
      
      // Add default relays
      for (const url of DEFAULT_RELAYS) {
        const relay = this.ndk.pool.getRelay(url, true);
        try {
          await relay.connect();
        } catch (error) {
          console.error(`[RelayService] Error connecting to relay ${url}:`, error);
          // Continue even if connection fails
        }
      }
      
      console.log(`[RelayService] Successfully reset to ${DEFAULT_RELAYS.length} default relays`);
      return true;
    } catch (error) {
      console.error('[RelayService] Error resetting relays to defaults:', error);
      throw error;
    }
  }

  /**
   * Import relays from user metadata (kind:3 events)
   */
  async importFromUserMetadata(pubkey: string, ndk: NDK): Promise<boolean> {
    try {
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      console.log(`[RelayService] Importing relays from metadata for user ${pubkey.slice(0, 8)}...`);
      
      // Fetch kind:3 event for user's relay list
      const filter = { kinds: [3], authors: [pubkey] };
      const events = await ndk.fetchEvents(filter);
      
      if (!events || events.size === 0) {
        console.log('[RelayService] No relay list found in user metadata');
        return false;
      }
      
      // Find the most recent event
      let latestEvent: any = null;
      let latestCreatedAt = 0;
      
      for (const event of events) {
        if (event.created_at && event.created_at > latestCreatedAt) {
          latestEvent = event;
          latestCreatedAt = event.created_at;
        }
      }
      
      if (!latestEvent) {
        console.log('[RelayService] No valid relay list found in user metadata');
        return false;
      }
      
      console.log(`[RelayService] Found relay list in event created at ${new Date(latestCreatedAt * 1000).toISOString()}`);
      
      let relaysFound = false;
      const relayConfigs: RelayConfig[] = [];
      
      // Process relay tags from event
      if (latestEvent.tags && Array.isArray(latestEvent.tags)) {
        for (const tag of latestEvent.tags) {
          if (tag[0] === 'r' && tag.length > 1) {
            relaysFound = true;
            const url = tag[1];
            
            // Skip invalid URLs
            if (!url.startsWith('wss://')) continue;
            
            // Parse read/write settings
            let read = true;
            let write = true;
            
            if (tag.length > 2) {
              read = tag[2] !== 'write'; // If "write", then not read
              write = tag[2] !== 'read'; // If "read", then not write
            }
            
            relayConfigs.push({ url, read, write });
          }
        }
      }
      
      if (!relaysFound || relayConfigs.length === 0) {
        console.log('[RelayService] No relay tags found in event');
        return false;
      }
      
      // Apply the found relay configuration
      return this.applyRelayConfig(relayConfigs);
    } catch (error) {
      console.error('[RelayService] Error importing relays from metadata:', error);
      throw error;
    }
  }

  /**
   * Create a kind:3 event with the user's relay preferences
   */
  async publishRelayList(ndk?: NDK): Promise<boolean> {
    try {
      // Use provided NDK or the stored one
      const ndkInstance = ndk || this.ndk;
      
      if (!ndkInstance || !ndkInstance.signer) {
        throw new Error('NDK not initialized or not signed in');
      }
      
      console.log('[RelayService] Publishing relay list to Nostr');
      
      // Get all relays directly from NDK pool
      const relays: RelayConfig[] = [];
      ndkInstance.pool.relays.forEach((relay, url) => {
        relays.push({
          url,
          read: relay.read ?? true,
          write: relay.write ?? true
        });
      });
      
      if (relays.length === 0) {
        console.warn('[RelayService] No relays to publish');
        return false;
      }
      
      // Create kind:3 event
      const { NDKEvent } = require('@nostr-dev-kit/ndk-mobile');
      const event = new NDKEvent(ndkInstance);
      event.kind = 3;
      
      // Add relay tags
      for (const relay of relays) {
        if (relay.read && relay.write) {
          // Full access
          event.tags.push(['r', relay.url]);
        } else if (relay.read) {
          // Read-only
          event.tags.push(['r', relay.url, 'read']);
        } else if (relay.write) {
          // Write-only
          event.tags.push(['r', relay.url, 'write']);
        }
      }
      
      console.log(`[RelayService] Publishing kind:3 event with ${event.tags.length} relay tags`);
      
      // Sign and publish
      await event.sign();
      await event.publish();
      
      console.log('[RelayService] Successfully published relay list');
      return true;
    } catch (error) {
      console.error('[RelayService] Error publishing relay list:', error);
      throw error;
    }
  }

  /**
   * Helper to convert NDK relay status to our status format
   */
  private getRelayStatus(relay: NDKRelay): 'connected' | 'connecting' | 'disconnected' | 'error' {
    try {
      // Check if the relay is connected
      if (relay.connected) {
        return 'connected';
      }
      
      // Map NDK status to our status format
      switch (relay.status) {
        case 0: // CONNECTING
        case 4: // RECONNECTING
          return 'connecting';
        case 1: // CONNECTED
        case 5: // AUTH_REQUIRED (is actually a connected state)
          return 'connected';
        case 3: // DISCONNECTED
          return 'disconnected';
        default:
          return 'disconnected';
      }
    } catch (error) {
      console.error('[RelayService] Error getting relay status:', error);
      return 'error';
    }
  }
}