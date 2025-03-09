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
  private debug: boolean = false; 

  constructor(db: SQLiteDatabase) {
    this.db = db;
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
        return relays.map(relay => ({
          ...relay,
          status: 'disconnected'
        }));
      }
      
      // Log the relays in the NDK pool for debugging
      console.log('[RelayService] Checking status for relays. Current NDK pool:');
      this.ndk.pool.relays.forEach((ndkRelay, url) => {
        console.log(`  - ${url}: status=${ndkRelay.status}`);
      });
      
      return relays.map(relay => {
        const status = this.getRelayStatus(relay);
        console.log(`[RelayService] Status for relay ${relay.url}: ${status}`);
        
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

  private normalizeRelayUrl(url: string): string {
    // Remove trailing slash if present
    return url.replace(/\/$/, '');
  }

  /**
   * Add a new relay to the database
   */
  async addRelay(url: string, read = true, write = true, priority?: number): Promise<boolean> {
    try {
      // Normalize the URL
      url = this.normalizeRelayUrl(url.trim());
      
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
      
      // Safely log event details without circular references
      try {
        console.log('[RelayService] Event ID:', latestEvent.id);
        console.log('[RelayService] Event Kind:', latestEvent.kind);
        console.log('[RelayService] Event Created At:', latestEvent.created_at);
        console.log('[RelayService] Event Tags Count:', latestEvent.tags ? latestEvent.tags.length : 0);
        
        // Safely log the tags
        if (latestEvent.tags && Array.isArray(latestEvent.tags)) {
          console.log('[RelayService] Tags:');
          latestEvent.tags.forEach((tag: any[], index: number) => {
            console.log(`  Tag ${index}:`, JSON.stringify(tag));
          });
        }
      } catch (error) {
        console.log('[RelayService] Error logging event details:', error);
      }
      
      // Get highest current priority
      const highestPriority = await this.db.getFirstAsync<{ priority: number }>(
        'SELECT MAX(priority) as priority FROM relays'
      );
      
      let maxPriority = (highestPriority?.priority || 0);
      let importCount = 0;
      let updatedCount = 0;
      
      // Check if any relay tags exist
      let relayTagsFound = false;
      
      // Process each relay in the event
      if (latestEvent.tags && Array.isArray(latestEvent.tags)) {
        for (const tag of latestEvent.tags) {
          try {
            console.log(`[RelayService] Processing tag: ${JSON.stringify(tag)}`);
            
            // More flexible tag detection - handle 'r', 'R', or 'relay' tag types
            if ((tag[0] === 'r' || tag[0] === 'R' || tag[0] === 'relay') && tag.length > 1 && tag[1]) {
              relayTagsFound = true;
              console.log(`[RelayService] Found relay tag: ${tag[1]}`);
              
              const url = tag[1];
              
              // Ensure URL is properly formatted
              if (!url.startsWith('wss://') && !url.startsWith('ws://')) {
                console.log(`[RelayService] Skipping invalid relay URL: ${url}`);
                continue;
              }
              
              // Check for read/write specification in the tag
              let read = true;
              let write = true;
              
              if (tag.length > 2) {
                // Handle various common formatting patterns
                const readWriteSpec = tag[2]?.toLowerCase();
                if (readWriteSpec === 'write') {
                  read = false;
                  write = true;
                  console.log(`[RelayService] Relay ${url} configured as write-only`);
                } else if (readWriteSpec === 'read') {
                  read = true;
                  write = false;
                  console.log(`[RelayService] Relay ${url} configured as read-only`);
                } else {
                  console.log(`[RelayService] Unrecognized read/write spec: ${readWriteSpec}, using default (read+write)`);
                }
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
                  console.log(`[RelayService] Updated existing relay: ${url} (read=${read}, write=${write})`);
                } else {
                  // Add new relay with incremented priority
                  maxPriority++;
                  await this.db.runAsync(
                    'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [url, read ? 1 : 0, write ? 1 : 0, maxPriority, now, now]
                  );
                  importCount++;
                  console.log(`[RelayService] Added new relay: ${url} (read=${read}, write=${write}, priority=${maxPriority})`);
                }
              } catch (innerError) {
                console.error(`[RelayService] Error importing relay ${url}:`, innerError);
                // Continue with other relays
              }
            }
          } catch (tagError) {
            console.log('[RelayService] Error processing tag:', tagError);
          }
        }
      }
      
      // Check for relays in content (some clients store them there)
      if (!relayTagsFound) {
        console.log('[RelayService] No relay tags found in event tags, checking content...');
        
        try {
          // Only try to parse the content if it's a string
          if (typeof latestEvent.content === 'string') {
            const contentObj = JSON.parse(latestEvent.content);
            
            // Only log specific properties to avoid circular references
            console.log('[RelayService] Content has relays property:', contentObj.hasOwnProperty('relays'));
            
            // Some clients store relays in content as an object
            if (contentObj.relays && typeof contentObj.relays === 'object') {
              console.log('[RelayService] Found relay URLs in content:', Object.keys(contentObj.relays));
              
              // Process relays from content object
              for (const [url, permissions] of Object.entries(contentObj.relays)) {
                try {
                  if (typeof url === 'string' && (url.startsWith('wss://') || url.startsWith('ws://'))) {
                    relayTagsFound = true;
                    
                    let read = true;
                    let write = true;
                    
                    // Handle different formats of permissions
                    if (typeof permissions === 'object' && permissions !== null) {
                      // Format: { "wss://relay.example.com": { "read": true, "write": false } }
                      if ('read' in permissions) read = Boolean((permissions as any).read);
                      if ('write' in permissions) write = Boolean((permissions as any).write);
                    } else if (typeof permissions === 'string') {
                      // Format: { "wss://relay.example.com": "read" }
                      read = (permissions as string).includes('read');
                      write = (permissions as string).includes('write');
                    }
                    
                    console.log(`[RelayService] Found relay in content: ${url} (read=${read}, write=${write})`);
                    
                    // Then add or update the relay just like above...
                    try {
                      const existingRelay = await this.db.getFirstAsync<{ url: string }>(
                        'SELECT url FROM relays WHERE url = ?',
                        [url]
                      );
                      
                      const now = Date.now();
                      
                      if (existingRelay) {
                        await this.db.runAsync(
                          'UPDATE relays SET read = ?, write = ?, updated_at = ? WHERE url = ?',
                          [read ? 1 : 0, write ? 1 : 0, now, url]
                        );
                        updatedCount++;
                        console.log(`[RelayService] Updated existing relay from content: ${url} (read=${read}, write=${write})`);
                      } else {
                        maxPriority++;
                        await this.db.runAsync(
                          'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                          [url, read ? 1 : 0, write ? 1 : 0, maxPriority, now, now]
                        );
                        importCount++;
                        console.log(`[RelayService] Added new relay from content: ${url} (read=${read}, write=${write}, priority=${maxPriority})`);
                      }
                    } catch (innerError) {
                      console.error(`[RelayService] Error importing relay ${url} from content:`, innerError);
                    }
                  }
                } catch (relayError) {
                  console.log('[RelayService] Error processing relay from content:', relayError);
                }
              }
            }
          } else {
            console.log('[RelayService] Content is not a string:', typeof latestEvent.content);
          }
        } catch (e) {
          // Convert the unknown error to a string safely
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.log('[RelayService] Content is not JSON or does not contain relay information:', errorMessage);
        }
      }
      
      // Check the raw event string that might be available
      if (!relayTagsFound && latestEvent.rawEvent && typeof latestEvent.rawEvent === 'string') {
        console.log('[RelayService] Checking raw event string for relay information');
        try {
          const rawEventObj = JSON.parse(latestEvent.rawEvent);
          if (rawEventObj.tags && Array.isArray(rawEventObj.tags)) {
            console.log(`[RelayService] Raw event has ${rawEventObj.tags.length} tags`);
            
            for (const tag of rawEventObj.tags) {
              try {
                if ((tag[0] === 'r' || tag[0] === 'R') && tag.length > 1 && tag[1]) {
                  relayTagsFound = true;
                  const url = tag[1];
                  
                  console.log(`[RelayService] Found relay in raw event: ${url}`);
                  
                  // Process like above...
                  if (url.startsWith('wss://') || url.startsWith('ws://')) {
                    let read = true;
                    let write = true;
                    
                    if (tag.length > 2) {
                      const readWriteSpec = tag[2]?.toLowerCase();
                      if (readWriteSpec === 'write') {
                        read = false;
                        write = true;
                      } else if (readWriteSpec === 'read') {
                        read = true;
                        write = false;
                      }
                    }
                    
                    try {
                      const existingRelay = await this.db.getFirstAsync<{ url: string }>(
                        'SELECT url FROM relays WHERE url = ?',
                        [url]
                      );
                      
                      const now = Date.now();
                      
                      if (existingRelay) {
                        await this.db.runAsync(
                          'UPDATE relays SET read = ?, write = ?, updated_at = ? WHERE url = ?',
                          [read ? 1 : 0, write ? 1 : 0, now, url]
                        );
                        updatedCount++;
                      } else {
                        maxPriority++;
                        await this.db.runAsync(
                          'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                          [url, read ? 1 : 0, write ? 1 : 0, maxPriority, now, now]
                        );
                        importCount++;
                      }
                    } catch (innerError) {
                      console.error(`[RelayService] Error importing relay ${url} from raw event:`, innerError);
                    }
                  }
                }
              } catch (tagError) {
                console.log('[RelayService] Error processing tag from raw event:', tagError);
              }
            }
          }
        } catch (rawError) {
          // Convert the unknown error to a string safely
          const errorMessage = rawError instanceof Error ? rawError.message : String(rawError);
          console.log('[RelayService] Error parsing raw event:', errorMessage);
        }
      }
      
      // Try to access user cached relays
      if (!relayTagsFound && ndk && ndk.pool && ndk.pool.relays) {
        console.log('[RelayService] Checking for relays in the user NDK pool');
        
        try {
          // Try to access the user's connected relays
          const userRelays = Array.from(ndk.pool.relays.keys());
          if (userRelays.length > 0) {
            console.log(`[RelayService] Found ${userRelays.length} relays in user's NDK pool:`, userRelays);
            
            // Import these relays
            for (const url of userRelays) {
              if (typeof url === 'string' && (url.startsWith('wss://') || url.startsWith('ws://'))) {
                try {
                  const existingRelay = await this.db.getFirstAsync<{ url: string }>(
                    'SELECT url FROM relays WHERE url = ?',
                    [url]
                  );
                  
                  const now = Date.now();
                  
                  if (existingRelay) {
                    // We'll only update the timestamp, not the permissions
                    await this.db.runAsync(
                      'UPDATE relays SET updated_at = ? WHERE url = ?',
                      [now, url]
                    );
                    updatedCount++;
                    console.log(`[RelayService] Updated existing relay from NDK pool: ${url}`);
                  } else {
                    maxPriority++;
                    await this.db.runAsync(
                      'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                      [url, 1, 1, maxPriority, now, now]
                    );
                    importCount++;
                    console.log(`[RelayService] Added new relay from NDK pool: ${url}`);
                  }
                } catch (innerError) {
                  console.error(`[RelayService] Error importing relay ${url} from NDK pool:`, innerError);
                }
              }
            }
            
            // Set flag to true because we found relays
            relayTagsFound = userRelays.length > 0;
          }
        } catch (poolError) {
          console.log('[RelayService] Error accessing NDK pool relays:', poolError);
        }
      }
      
      if (!relayTagsFound) {
        console.log('[RelayService] No relay information found in any format');
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
      let addedCount = 0;
      
      for (let i = 0; i < DEFAULT_RELAYS.length; i++) {
        const url = DEFAULT_RELAYS[i];
        const priority = DEFAULT_RELAYS.length - i; // Higher priority for first relays
        
        try {
          await this.db.runAsync(
            'INSERT INTO relays (url, read, write, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [url, 1, 1, priority, now, now]
          );
          addedCount++;
        } catch (innerError) {
          console.error(`[RelayService] Error adding default relay ${url}:`, innerError);
        }
      }
      
      console.log(`[RelayService] Successfully reset to ${addedCount} default relays`);
      return addedCount > 0;
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
    // Check if the relay has a trailing slash in the URL
    const urlWithoutSlash = relay.url ? relay.url.replace(/\/$/, '') : '';
    const urlWithSlash = urlWithoutSlash + '/';
    
    // Try to get the relay from NDK pool - check both with and without trailing slash
    const ndkRelay = this.ndk?.pool.getRelay(urlWithoutSlash) || 
                     this.ndk?.pool.getRelay(urlWithSlash);
    
    if (ndkRelay) {
      console.log(`[RelayService] Detailed relay status for ${relay.url}: status=${ndkRelay.status}, connected=${!!ndkRelay.connected}`);
      
      // The most reliable way to check connection status is to check the 'connected' property
      if (ndkRelay.connected) {
        return 'connected';
      }
      
      // NDK relay status: 0=connecting, 1=connected, 2=disconnecting, 3=disconnected, 4=reconnecting, 5=auth_required
      if (ndkRelay.status === 1) {
        return 'connected';
      } else if (ndkRelay.status === 0 || ndkRelay.status === 4) { // CONNECTING or RECONNECTING
        return 'connecting';
      } else if (ndkRelay.status === 5) { // AUTH_REQUIRED - This is actually a connected state!
        return 'connected';  // This is the key fix
      } else {
        return 'disconnected';
      }
    }
    
    // If we can't find the relay in the NDK pool
    return 'disconnected';
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
      if (existingCount && existingCount.count !== undefined && existingCount.count > 0) {
        console.log(`[RelayService] Found ${existingCount.count} existing relays, checking if we need to import more`);
      } else {
        console.log('[RelayService] No existing relays found, will attempt to import');
      }
      
      console.log('[RelayService] Attempting to import user relay preferences');
      
      // Try to import from metadata
      const success = await this.importFromUserMetadata(user.pubkey, ndk);
      
      if (success) {
        console.log('[RelayService] Successfully imported user relay preferences');
        // Apply the imported configuration immediately
        await this.applyRelayConfig(ndk);
      } else {
        console.log('[RelayService] No relay preferences found, resetting to defaults');
        await this.resetToDefaults();
        await this.applyRelayConfig(ndk);
      }
    } catch (error) {
      console.error('[RelayService] Error importing user relays:', error);
      // On error, reset to defaults
      try {
        console.log('[RelayService] Error occurred, resetting to defaults');
        await this.resetToDefaults();
        await this.applyRelayConfig(ndk);
      } catch (resetError) {
        console.error('[RelayService] Error resetting to defaults:', resetError);
      }
    }
  }}