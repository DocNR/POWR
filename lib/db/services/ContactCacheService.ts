// lib/db/services/ContactCacheService.ts

import { SQLiteDatabase } from 'expo-sqlite';
import { DbService } from '../db-service';
import { SocialFeedCache } from './SocialFeedCache';

/**
 * Service for caching user contact lists
 * This service provides offline access to contact lists
 */
export class ContactCacheService {
  private db: DbService;
  
  constructor(database: SQLiteDatabase) {
    this.db = new DbService(database);
    this.initializeTable();
  }
  
  /**
   * Initialize the contact cache table
   */
  private async initializeTable(): Promise<void> {
    try {
      // Create contact_cache table if it doesn't exist
      await this.db.runAsync(`
        CREATE TABLE IF NOT EXISTS contact_cache (
          owner_pubkey TEXT NOT NULL,
          contact_pubkey TEXT NOT NULL,
          cached_at INTEGER NOT NULL,
          PRIMARY KEY (owner_pubkey, contact_pubkey)
        )
      `);
      
      // Create index for faster queries
      await this.db.runAsync(`
        CREATE INDEX IF NOT EXISTS idx_contact_cache_owner 
        ON contact_cache (owner_pubkey)
      `);
      
      console.log('[ContactCacheService] Contact cache table initialized');
    } catch (error) {
      console.error('[ContactCacheService] Error initializing table:', error);
    }
  }
  
  /**
   * Cache contacts for a user
   * @param ownerPubkey The user's pubkey
   * @param contacts Array of contact pubkeys
   */
  async cacheContacts(ownerPubkey: string, contacts: string[]): Promise<void> {
    if (!ownerPubkey || !contacts.length) return;
    
    try {
      // Use the global transaction lock to prevent conflicts with other services
      await SocialFeedCache.executeWithLock(async () => {
        try {
          // Use a transaction for better performance
          await this.db.withTransactionAsync(async () => {
            // First delete all existing contacts for this owner
            await this.db.runAsync(
              'DELETE FROM contact_cache WHERE owner_pubkey = ?',
              [ownerPubkey]
            );
            
            // Then insert all contacts
            const timestamp = Date.now();
            const insertPromises = contacts.map(contactPubkey => 
              this.db.runAsync(
                'INSERT INTO contact_cache (owner_pubkey, contact_pubkey, cached_at) VALUES (?, ?, ?)',
                [ownerPubkey, contactPubkey, timestamp]
              )
            );
            
            await Promise.all(insertPromises);
          });
          
          console.log(`[ContactCacheService] Cached ${contacts.length} contacts for ${ownerPubkey}`);
        } catch (error) {
          console.error('[ContactCacheService] Error in transaction:', error);
          throw error; // Rethrow to ensure the transaction is marked as failed
        }
      });
    } catch (error) {
      console.error('[ContactCacheService] Error caching contacts:', error);
    }
  }
  
  /**
   * Get cached contacts for a user
   * @param ownerPubkey The user's pubkey
   * @returns Array of contact pubkeys
   */
  async getCachedContacts(ownerPubkey: string): Promise<string[]> {
    if (!ownerPubkey) return [];
    
    try {
      const rows = await this.db.getAllAsync<{ contact_pubkey: string }>(
        'SELECT contact_pubkey FROM contact_cache WHERE owner_pubkey = ?',
        [ownerPubkey]
      );
      
      return rows.map(row => row.contact_pubkey);
    } catch (error) {
      console.error('[ContactCacheService] Error getting cached contacts:', error);
      return [];
    }
  }
  
  /**
   * Clear cached contacts for a user
   * @param ownerPubkey The user's pubkey
   */
  async clearCachedContacts(ownerPubkey: string): Promise<void> {
    if (!ownerPubkey) return;
    
    try {
      await this.db.runAsync(
        'DELETE FROM contact_cache WHERE owner_pubkey = ?',
        [ownerPubkey]
      );
      
      console.log(`[ContactCacheService] Cleared cached contacts for ${ownerPubkey}`);
    } catch (error) {
      console.error('[ContactCacheService] Error clearing cached contacts:', error);
    }
  }
  
  /**
   * Clear old cached contacts
   * @param maxAgeDays Maximum age in days (default: 7)
   */
  async clearOldCache(maxAgeDays: number = 7): Promise<void> {
    try {
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - maxAgeMs;
      
      const result = await this.db.runAsync(
        'DELETE FROM contact_cache WHERE cached_at < ?',
        [cutoffTime]
      );
      
      console.log(`[ContactCacheService] Cleared old contact cache entries`, result);
    } catch (error) {
      console.error('[ContactCacheService] Error clearing old cache:', error);
    }
  }
}

// Create a singleton factory function
let contactCacheService: ContactCacheService | null = null;

export function getContactCacheService(database: SQLiteDatabase): ContactCacheService {
  if (!contactCacheService) {
    contactCacheService = new ContactCacheService(database);
  }
  return contactCacheService;
}
