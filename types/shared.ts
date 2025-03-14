// types/shared.ts
/**
 * Available storage sources for content
 */
export type StorageSource = 'local' | 'powr' | 'nostr';

/**
 * Nostr sync metadata
 */
export interface NostrSyncMetadata {
  timestamp: number;
  metadata: {
    id: string;
    pubkey: string;
    relayUrl: string;
    created_at: number;
    dTag?: string;
    eventId?: string;
  };
}

/**
 * Last synced information for different storage sources
 */
export interface LastSyncedInfo {
  backup?: number;
  nostr?: NostrSyncMetadata;
}

/**
 * Content availability information
 * Tracks where content is stored and when it was last synced
 */
export interface ContentAvailability {
  source: StorageSource[];
  lastSynced?: LastSyncedInfo;
}

/**
 * Generic content metadata interface
 * Can be extended by specific content types
 */
export interface ContentMetadata {
  created_at: number;
  updated_at?: number;
  deleted_at?: number;
  version?: number;
}

/**
 * Base interface for all syncable content
 */
export interface SyncableContent extends ContentMetadata {
  id: string;
  availability: ContentAvailability;
}
