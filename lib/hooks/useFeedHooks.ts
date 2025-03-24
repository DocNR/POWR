// lib/hooks/useFeedHooks.ts
import { nip19 } from 'nostr-tools';
import { useMemo } from 'react';
import { useSocialFeed } from './useSocialFeed';
import { useNDKCurrentUser } from './useNDK';

/**
 * This file contains constants related to the POWR account.
 * The feed implementation has been moved to useSocialFeed.ts.
 */

// POWR official account pubkey
export const POWR_ACCOUNT_PUBKEY = 'npub1p0wer69rpkraqs02l5v8rutagfh6g9wxn2dgytkv44ysz7avt8nsusvpjk';

// Convert POWR account pubkey to hex at the module level
export let POWR_PUBKEY_HEX: string = '';
try {
  if (POWR_ACCOUNT_PUBKEY.startsWith('npub')) {
    const decoded = nip19.decode(POWR_ACCOUNT_PUBKEY);
    POWR_PUBKEY_HEX = decoded.data as string;
  } else {
    POWR_PUBKEY_HEX = POWR_ACCOUNT_PUBKEY;
  }
  console.log("[useFeedHooks] Initialized POWR pubkey hex:", POWR_PUBKEY_HEX);
} catch (error) {
  console.error('[useFeedHooks] Error decoding POWR account npub:', error);
  POWR_PUBKEY_HEX = '';
}

/**
 * @deprecated Use useSocialFeed from lib/hooks/useSocialFeed.ts instead.
 * Example:
 * 
 * // For POWR feed:
 * const { feedItems, loading, refresh } = useSocialFeed({
 *   feedType: 'powr',
 *   authors: [POWR_PUBKEY_HEX]
 * });
 * 
 * // For Following feed:
 * const { feedItems, loading, refresh } = useSocialFeed({
 *   feedType: 'following'
 * });
 * 
 * // For Global feed:
 * const { feedItems, loading, refresh } = useSocialFeed({
 *   feedType: 'global'
 * });
 */
