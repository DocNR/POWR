// lib/db/services/RelayService.ts
import { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '@/utils/ids';
import { Alert } from 'react-native';
import NDK, { NDKRelay, NDKRelayStatus, NDKEvent } from '@nostr-dev-kit/ndk-mobile';

// Default relays to use when none are configured
export const DEFAULT_RELAYS = [
  'wss://powr.duckdns.org',
  'wss://relay.damus.io', 
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://nos.lol'
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
  private ndk: NDK | null = null;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Set NDK instance for relay operations
   */
  setNDK(ndk: NDK) {
    this.ndk = ndk;
  }

  /**
   * Get all relays from database
   */
  async getAllRelays(): Promise<RelayConfig[]> {
    try {
      const relays = await this.db.getAllAsync<RelayConfig>(
        'SELECT url, read, write, priority, created_at, updated_at FROM relays ORDER BY priority DESC, created_at DESC'
      );
      
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
        // Return relays with disconnected status if NDK not initialized
        return relays.map(relay => ({
          ...relay,
          status: 'disconnected'
        }));
      }
      
      return relays.map(relay => {
        const ndkRelay = this.ndk?.pool.getRelay(relay.url);
        let status: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
        
        if (ndkRelay) {
          status = this.getRelayStatus(ndkRelay);
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
      // Validate URL format
      if (!url.trim().startsWith('wss://')) {
        throw new Error('Relay URL must start with wss://');
      }
      
      const now = Date.now();
      
      // Check if relay already exists
      const existingRelay = await this.db.getFirstAsync<{ url: string }>(
        'SELECT url FROM relays WHERE url = ?',
        [url]
      );
      
      if (existingRelay) {
        throw new Error('This relay already exists');
      }
      
      // If no priority specified, make it higher than the current highest
      if (priority === undefined) {
        const highestPriority = await this.db.getFirstAsync<{ priority: number }>(
          'SELECT MAX(priority) as priority FROM relays'
        );
        
        priority = (highestPriority?.priority || 0) + 1;
      }
      
      // Add the relay
      await this.db.runAsync(
        'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [url, read ? 1 : 0, write ? 1 : 0, priority, now, now]
      );
      
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
      
      // Execute update
      if (updates.length > 0) {
        await this.db.runAsync(
          `UPDATE relays SET ${updates.join(', ')} WHERE url = ?`,
          params
        );
      }
      
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
      await this.db.runAsync('DELETE FROM relays WHERE url = ?', [url]);
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
      
      return relays.map(relay => relay.url);
    } catch (error) {
      console.error('[RelayService] Error getting enabled relays:', error);
      return [];
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
      
      // Fetch kind:3 event for user's relay list
      const filter = { kinds: [3], authors: [pubkey] };
      const events = await ndk.fetchEvents(filter);
      
      if (!events || events.size === 0) {
        throw new Error('No relay list found');
      }
      
      // Find the most recent event
      let latestEvent = null;
      let latestCreatedAt = 0;
      
      for (const event of events) {
        if (event.created_at && event.created_at > latestCreatedAt) {
          latestEvent = event;
          latestCreatedAt = event.created_at;
        }
      }
      
      if (!latestEvent) {
        throw new Error('No valid relay list found');
      }
      
      // Get highest current priority
      const highestPriority = await this.db.getFirstAsync<{ priority: number }>(
        'SELECT MAX(priority) as priority FROM relays'
      );
      
      let maxPriority = (highestPriority?.priority || 0);
      let importCount = 0;
      
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
      
      return importCount > 0;
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
      
      return true;
    } catch (error) {
      console.error('[RelayService] Error resetting relays to defaults:', error);
      throw error;
    }
  }

  /**
   * Apply relay configuration to NDK
   */
  async applyRelayConfig(ndk: NDK): Promise<boolean> {
    try {
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      // Get enabled relays
      const enabledRelays = await this.getEnabledRelays();
      
      if (enabledRelays.length === 0) {
        console.warn('[RelayService] No enabled relays found, using defaults');
        await this.resetToDefaults();
        return this.applyRelayConfig(ndk); // Recursive call after reset
      }
  
      console.log('[RelayService] Applying relay configuration with relays:', enabledRelays);
  
      // Create a completely new NDK instance with these relays
      // This is the key change - we're creating a new NDK instance instead of
      // trying to modify the existing one
      const ndkConfig = {
        explicitRelayUrls: enabledRelays
      };
  
      // Store this config in a way that survives app restarts
      try {
        // Save the relay config to persistent storage
        await this.db.runAsync(
          'INSERT OR REPLACE INTO app_status (key, value, updated_at) VALUES (?, ?, ?)',
          ['relay_config', JSON.stringify(enabledRelays), Date.now()]
        );
        console.log('[RelayService] Saved relay configuration');
      } catch (err) {
        console.warn('[RelayService] Error saving relay configuration:', err);
      }
  
      // Alert the user that they need to restart the app
      // for the changes to take effect
      Alert.alert(
        'Relay Configuration Updated',
        'The relay configuration has been updated. Please restart the app for the changes to take effect.',
        [{ text: 'OK', style: 'default' }]
      );
      
      return true;
    } catch (error) {
      console.error('[RelayService] Error applying relay configuration:', error);
      throw error;
    }
  }

  /**
   * Create a kind:3 event with the user's relay preferences
   */
  async publishRelayList(ndk: NDK): Promise<boolean> {
    try {
      if (!ndk || !ndk.signer) {
        throw new Error('NDK not initialized or not signed in');
      }
      
      // Get all relays
      const relays = await this.getAllRelays();
      
      // Create event
      const event = new NDKEvent(ndk);
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
      
      // Sign and publish
      await event.sign();
      await event.publish();
      
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
      // Check if there are any relays in the database
      const count = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM relays'
      );
      
      // If no relays, add defaults
      if (!count || count.count === 0) {
        await this.resetToDefaults();
      }
      
      // Return enabled relays
      return await this.getEnabledRelays();
    } catch (error) {
      console.error('[RelayService] Error initializing relays:', error);
      // Return defaults on error
      return DEFAULT_RELAYS;
    }
  }

  /**
   * Helper to convert NDK relay status to our status format
   */
  private getRelayStatus(relay: NDKRelay): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (relay.status === NDKRelayStatus.CONNECTED) {
      return 'connected';
    } else if (relay.status === NDKRelayStatus.CONNECTING || relay.status === NDKRelayStatus.RECONNECTING) {
      return 'connecting';
    } else {
      return 'disconnected';
    }
  }
}