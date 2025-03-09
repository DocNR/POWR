// lib/db/services/RelayService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { NDKCommon, NDKRelayCommon, safeAddRelay, safeRemoveRelay } from '@/types/ndk-common';

// Status constants to match NDK implementations
const NDK_RELAY_STATUS = {
  CONNECTING: 0,
  CONNECTED: 1,
  DISCONNECTING: 2,
  DISCONNECTED: 3,
  RECONNECTING: 4,
  AUTH_REQUIRED: 5
};

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
  created_at: number;
  updated_at: number;
}

export interface RelayWithStatus extends RelayConfig {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
}

/**
 * Service for managing Nostr relays
 */
export class RelayService {
  private db: SQLiteDatabase;
  private ndk: NDKCommon | null = null;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Set NDK instance for relay operations
   */
  setNDK(ndk: NDKCommon) {
    this.ndk = ndk;
    console.log('[RelayService] NDK instance set');
  }

  /**
   * Get all relays from database
   */
  async getAllRelays(): Promise<RelayConfig[]> {
    try {
      const relays = await this.db.getAllAsync<RelayConfig>(
        'SELECT url, read, write, priority, created_at, updated_at FROM relays ORDER BY priority DESC, created_at DESC'
      );
      
      console.log(`[RelayService] Found ${relays.length} relays in database`);
      
      return relays.map(relay => ({
        ...relay,
        read: Boolean(relay.read),
        write: Boolean(relay.write)
      }));
    } catch (error) {
      console.error('[RelayService] Error getting relays:', error);
      return [];
    }
  }

  /**
   * Get all relays with their current connection status
   */
  async getAllRelaysWithStatus(): Promise<RelayWithStatus[]> {
    try {
      const relays = await this.getAllRelays();
      
      if (!this.ndk) {
        console.warn('[RelayService] NDK not initialized, returning relays with disconnected status');
        // Return relays with disconnected status if NDK not initialized
        return relays.map(relay => ({
          ...relay,
          status: 'disconnected'
        }));
      }
      
      return relays.map(relay => {
        let status: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
        
        try {
          const ndkRelay = this.ndk?.pool.getRelay(relay.url);
          if (ndkRelay) {
            status = this.getRelayStatus(ndkRelay);
          }
        } catch (error) {
          console.error(`[RelayService] Error getting status for relay ${relay.url}:`, error);
        }
        
        return {
          ...relay,
          status
        };
      });
    } catch (error) {
      console.error('[RelayService] Error getting relays with status:', error);
      return [];
    }
  }

  /**
   * Add a new relay to the database
   */
  async addRelay(url: string, read = true, write = true, priority?: number): Promise<boolean> {
    try {
      // Normalize the URL
      url = url.trim();
      
      // Validate URL format
      if (!url.startsWith('wss://')) {
        throw new Error('Relay URL must start with wss://');
      }
      
      const now = Date.now();
      
      // Check if relay already exists
      const existingRelay = await this.db.getFirstAsync<{ url: string }>(
        'SELECT url FROM relays WHERE url = ?',
        [url]
      );
      
      if (existingRelay) {
        console.log(`[RelayService] Relay ${url} already exists, updating instead`);
        return this.updateRelay(url, { read, write, priority });
      }
      
      // If no priority specified, make it higher than the current highest
      if (priority === undefined) {
        const highestPriority = await this.db.getFirstAsync<{ priority: number }>(
          'SELECT MAX(priority) as priority FROM relays'
        );
        
        priority = ((highestPriority?.priority || 0) + 1);
      }
      
      console.log(`[RelayService] Adding relay ${url} with read=${read}, write=${write}, priority=${priority}`);
      
      // Add the relay
      await this.db.runAsync(
        'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [url, read ? 1 : 0, write ? 1 : 0, priority, now, now]
      );
      
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
      const now = Date.now();
      
      // Check if relay exists
      const existingRelay = await this.db.getFirstAsync<{ url: string }>(
        'SELECT url FROM relays WHERE url = ?',
        [url]
      );
      
      if (!existingRelay) {
        console.log(`[RelayService] Relay ${url} does not exist, adding instead`);
        const read = changes.read !== undefined ? changes.read : true;
        const write = changes.write !== undefined ? changes.write : true;
        return this.addRelay(url, read, write, changes.priority);
      }
      
      // Prepare update fields
      const updates: string[] = [];
      const params: any[] = [];
      
      if (changes.read !== undefined) {
        updates.push('read = ?');
        params.push(changes.read ? 1 : 0);
      }
      
      if (changes.write !== undefined) {
        updates.push('write = ?');
        params.push(changes.write ? 1 : 0);
      }
      
      if (changes.priority !== undefined) {
        updates.push('priority = ?');
        params.push(changes.priority);
      }
      
      // Always update the updated_at timestamp
      updates.push('updated_at = ?');
      params.push(now);
      
      // Add the URL to the parameters
      params.push(url);
      
      console.log(`[RelayService] Updating relay ${url} with changes:`, 
        Object.entries(changes)
          .filter(([key]) => ['read', 'write', 'priority'].includes(key))
          .map(([key, value]) => `${key}=${value}`)
          .join(', ')
      );
      
      // Execute update
      if (updates.length > 0) {
        await this.db.runAsync(
          `UPDATE relays SET ${updates.join(', ')} WHERE url = ?`,
          params
        );
      }
      
      console.log(`[RelayService] Successfully updated relay ${url}`);
      return true;
    } catch (error) {
      console.error('[RelayService] Error updating relay:', error);
      throw error;
    }
  }

  /**
   * Remove a relay from the database
   */
  async removeRelay(url: string): Promise<boolean> {
    try {
      console.log(`[RelayService] Removing relay ${url}`);
      await this.db.runAsync('DELETE FROM relays WHERE url = ?', [url]);
      console.log(`[RelayService] Successfully removed relay ${url}`);
      return true;
    } catch (error) {
      console.error('[RelayService] Error removing relay:', error);
      throw error;
    }
  }

  /**
   * Get relays that are enabled for reading, writing, or both
   */
  async getEnabledRelays(): Promise<string[]> {
    try {
      const relays = await this.db.getAllAsync<{ url: string }>(
        'SELECT url FROM relays WHERE read = 1 OR write = 1 ORDER BY priority DESC, created_at DESC'
      );
      
      console.log(`[RelayService] Found ${relays.length} enabled relays`);
      return relays.map(relay => relay.url);
    } catch (error) {
      console.error('[RelayService] Error getting enabled relays:', error);
      return [];
    }
  }

  /**
   * Apply relay configuration to NDK
   * This implementation uses the safeAddRelay and safeRemoveRelay utilities
   */
  async applyRelayConfig(ndk?: NDKCommon): Promise<boolean> {
    try {
      // Use provided NDK or the stored one
      const ndkInstance = ndk || this.ndk;
      
      if (!ndkInstance) {
        throw new Error('NDK not initialized');
      }
      
      // Get all relay configurations
      const relayConfigs = await this.getAllRelays();
      
      if (relayConfigs.length === 0) {
        console.warn('[RelayService] No relays found, using defaults');
        await this.resetToDefaults();
        return this.applyRelayConfig(ndkInstance); // Recursive call after reset
      }
      
      console.log(`[RelayService] Applying configuration for ${relayConfigs.length} relays`);
      
      // Get the current relay URLs
      const currentRelayUrls: string[] = [];
      try {
        ndkInstance.pool.relays.forEach((_, url) => currentRelayUrls.push(url));
        console.log(`[RelayService] NDK currently has ${currentRelayUrls.length} relays`);
      } catch (error) {
        console.error('[RelayService] Error getting current relay URLs:', error);
      }
      
      // Disconnect from relays that are not in the config or have changed permissions
      for (const url of currentRelayUrls) {
        // Get config for this URL if it exists
        const config = relayConfigs.find(r => r.url === url);
        
        // If the relay doesn't exist in our config or the read/write status changed,
        // we should remove it and possibly add it back with new settings
        if (!config || (!config.read && !config.write)) {
          console.log(`[RelayService] Removing relay ${url} from NDK pool`);
          safeRemoveRelay(ndkInstance, url);
        }
      }
      
      // Add or reconfigure relays
      for (const relay of relayConfigs) {
        if (relay.read || relay.write) {
          try {
            let ndkRelay = ndkInstance.pool.getRelay(relay.url);
            
            if (ndkRelay) {
              // Update relay's read/write config if needed
              try {
                const needsUpdate = (ndkRelay.read !== relay.read) || 
                                 (ndkRelay.write !== relay.write);
                
                if (needsUpdate) {
                  console.log(`[RelayService] Updating relay ${relay.url} settings: read=${relay.read}, write=${relay.write}`);
                  // Set properties directly
                  ndkRelay.read = relay.read;
                  ndkRelay.write = relay.write;
                }
              } catch (error) {
                // If we can't set properties directly, remove and re-add the relay
                console.log(`[RelayService] Recreating relay ${relay.url} due to error:`, error);
                safeRemoveRelay(ndkInstance, relay.url);
                ndkRelay = safeAddRelay(ndkInstance, relay.url, {
                  read: relay.read,
                  write: relay.write
                });
              }
            } else {
              // Add new relay
              console.log(`[RelayService] Adding new relay ${relay.url} to NDK pool`);
              ndkRelay = safeAddRelay(ndkInstance, relay.url, {
                read: relay.read,
                write: relay.write
              });
            }
            
            // Connect the relay if it was added successfully
            if (ndkRelay && typeof ndkRelay.connect === 'function') {
              console.log(`[RelayService] Connecting to relay ${relay.url}`);
              ndkRelay.connect().catch((error: any) => {
                console.error(`[RelayService] Error connecting to relay ${relay.url}:`, error);
              });
            }
          } catch (innerError) {
            console.error(`[RelayService] Error adding/updating relay ${relay.url}:`, innerError);
            // Continue with other relays even if one fails
          }
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
   * Import relays from user metadata (kind:3 events)
   */
  async importFromUserMetadata(pubkey: string, ndk: any): Promise<boolean> {
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
      
      // Get highest current priority
      const highestPriority = await this.db.getFirstAsync<{ priority: number }>(
        'SELECT MAX(priority) as priority FROM relays'
      );
      
      let maxPriority = (highestPriority?.priority || 0);
      let importCount = 0;
      let updatedCount = 0;
      
      // Process each relay in the event
      for (const tag of latestEvent.tags) {
        if (tag[0] === 'r') {
          const url = tag[1];
          
          // Check for read/write specification in the tag
          let read = true;
          let write = true;
          
          if (tag.length > 2) {
            read = tag[2] !== 'write'; // If "write", then not read
            write = tag[2] !== 'read'; // If "read", then not write
          }
          
          try {
            // Check if the relay already exists
            const existingRelay = await this.db.getFirstAsync<{ url: string }>(
              'SELECT url FROM relays WHERE url = ?',
              [url]
            );
            
            const now = Date.now();
            
            if (existingRelay) {
              // Update existing relay
              await this.db.runAsync(
                'UPDATE relays SET read = ?, write = ?, updated_at = ? WHERE url = ?',
                [read ? 1 : 0, write ? 1 : 0, now, url]
              );
              updatedCount++;
            } else {
              // Add new relay with incremented priority
              maxPriority++;
              await this.db.runAsync(
                'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [url, read ? 1 : 0, write ? 1 : 0, maxPriority, now, now]
              );
              importCount++;
            }
          } catch (innerError) {
            console.error(`[RelayService] Error importing relay ${url}:`, innerError);
            // Continue with other relays
          }
        }
      }
      
      console.log(`[RelayService] Imported ${importCount} new relays, updated ${updatedCount} existing relays`);
      return importCount > 0 || updatedCount > 0;
    } catch (error) {
      console.error('[RelayService] Error importing relays from metadata:', error);
      throw error;
    }
  }

  /**
   * Reset relays to default set
   */
  async resetToDefaults(): Promise<boolean> {
    try {
      console.log('[RelayService] Resetting relays to defaults');
      
      // Clear existing relays
      await this.db.runAsync('DELETE FROM relays');
      
      // Add default relays
      const now = Date.now();
      
      for (let i = 0; i < DEFAULT_RELAYS.length; i++) {
        const url = DEFAULT_RELAYS[i];
        const priority = DEFAULT_RELAYS.length - i; // Higher priority for first relays
        
        await this.db.runAsync(
          'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [url, 1, 1, priority, now, now]
        );
      }
      
      console.log(`[RelayService] Successfully reset to ${DEFAULT_RELAYS.length} default relays`);
      return true;
    } catch (error) {
      console.error('[RelayService] Error resetting relays to defaults:', error);
      throw error;
    }
  }

  /**
   * Create a kind:3 event with the user's relay preferences
   */
  async publishRelayList(ndk?: any): Promise<boolean> {
    try {
      // Use provided NDK or the stored one
      const ndkInstance = ndk || this.ndk;
      
      if (!ndkInstance || !ndkInstance.signer) {
        throw new Error('NDK not initialized or not signed in');
      }
      
      console.log('[RelayService] Publishing relay list to Nostr');
      
      // Get all relays
      const relays = await this.getAllRelays();
      
      if (relays.length === 0) {
        console.warn('[RelayService] No relays to publish');
        return false;
      }
      
      // Create event using any NDK version
      const NDKEvent = ndkInstance.constructor.name === 'NDK' ? 
                      ndkInstance.constructor.NDKEvent : 
                      require('@nostr-dev-kit/ndk-mobile').NDKEvent;
                      
      const event = new NDKEvent(ndkInstance);
      event.kind = 3;
      
      // Add relay tags
      for (const relay of relays) {
        // Skip disabled relays
        if (!relay.read && !relay.write) continue;
        
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
   * Initialize relays from database or defaults
   * If no relays in database, add defaults
   */
  async initializeRelays(): Promise<string[]> {
    try {
      console.log('[RelayService] Initializing relays');
      
      // First verify the relays table exists and has the correct structure
      await this.checkAndDebugRelays();
      
      // Check if there are any relays in the database
      const count = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM relays'
      );
      
      // If no relays, add defaults
      if (!count || count.count === 0) {
        console.log('[RelayService] No relays found in database, adding defaults');
        await this.resetToDefaults();
      } else {
        console.log(`[RelayService] Found ${count.count} relays in database`);
      }
      
      // Return enabled relays
      const enabledRelays = await this.getEnabledRelays();
      console.log(`[RelayService] Returning ${enabledRelays.length} enabled relays`);
      return enabledRelays;
    } catch (error) {
      console.error('[RelayService] Error initializing relays:', error);
      console.log('[RelayService] Falling back to default relays');
      // Return defaults on error
      return DEFAULT_RELAYS;
    }
  }

  /**
   * Helper to convert NDK relay status to our status format
   */
  private getRelayStatus(relay: any): 'connected' | 'connecting' | 'disconnected' | 'error' {
    try {
      if (relay.status === NDK_RELAY_STATUS.CONNECTED) {
        return 'connected';
      } else if (
        relay.status === NDK_RELAY_STATUS.CONNECTING || 
        relay.status === NDK_RELAY_STATUS.RECONNECTING
      ) {
        return 'connecting';
      } else {
        return 'disconnected';
      }
    } catch (error) {
      console.error(`[RelayService] Error getting relay status:`, error);
      return 'disconnected';
    }
  }

  /**
   * Check and debug relays table and content
   */
  private async checkAndDebugRelays(): Promise<void> {
    try {
      console.log('[RelayService] Checking database for relays...');
      
      // Check if table exists
      const tableExists = await this.db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master 
         WHERE type='table' AND name='relays'`
      );
      
      if (!tableExists || tableExists.count === 0) {
        console.error('[RelayService] Relays table does not exist!');
        return;
      }
      
      console.log('[RelayService] Relays table exists');
      
      // Check relay count
      const count = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM relays'
      );
      
      console.log(`[RelayService] Found ${count?.count || 0} relays in database`);
      
      if (count && count.count > 0) {
        // Get sample relays
        const sampleRelays = await this.db.getAllAsync<RelayConfig>(
          'SELECT url, read, write, priority FROM relays LIMIT 5'
        );
        
        console.log('[RelayService] Sample relays:', sampleRelays);
      }
    } catch (error) {
      console.error('[RelayService] Error checking relays:', error);
    }
  }

  /**
   * Import user's relay preferences on login
   */
  async importUserRelaysOnLogin(user: any, ndk: any): Promise<void> {
    console.log('[RelayService] Checking for user relay preferences...');
    if (!user || !user.pubkey) return;
    
    try {
      // First check if we already have relays in the database
      const existingCount = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM relays'
      );
      
      // If we have relays and they're not just the defaults, skip import
      if (existingCount?.count > DEFAULT_RELAYS.length) {
        console.log(`[RelayService] Using existing relay configuration (${existingCount?.count} relays)`);
        return;
      }
      
      console.log('[RelayService] Attempting to import user relay preferences');
      
      // Try to import from metadata
      const success = await this.importFromUserMetadata(user.pubkey, ndk);
      
      if (success) {
        console.log('[RelayService] Successfully imported user relay preferences');
        // Apply the imported configuration immediately
        await this.applyRelayConfig(ndk);
      } else {
        console.log('[RelayService] No relay preferences found, using defaults');
      }
    } catch (error) {
      console.error('[RelayService] Error importing user relays:', error);
    }
  }
}