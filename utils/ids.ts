// utils/ids.ts
import { v4 as uuidv4 } from 'uuid'; // You'll need to add this dependency

/**
 * Generates a unique identifier with optional source prefix
 * @param source - Optional source identifier ('local' or 'nostr')
 * @returns A unique string identifier
 */
export function generateId(source: 'local' | 'nostr' = 'local'): string {
  // For local IDs, use the current format with a prefix
  if (source === 'local') {
    // Generate timestamp and random parts
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `local:${timestamp}-${randomPart}`;
  }
  
  // For Nostr IDs, use proper UUID format
  return uuidv4();
}

/**
 * Generates a Nostr-compatible d-tag for addressable events
 * @param type - Optional type identifier for the d-tag, e.g., 'exercise', 'template'
 * @param ensureUnique - Optional boolean to ensure the d-tag is always globally unique
 * @returns A string to use as the d-tag value
 */
export function generateDTag(type: string = '', ensureUnique: boolean = true): string {
  if (ensureUnique) {
    // If we need global uniqueness, generate a short UUID-based tag
    const shortId = uuidv4().substring(0, 12);
    return type ? `${type}-${shortId}` : shortId;
  } else {
    // For local uniqueness (e.g., per-user), a simpler ID may suffice
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return type ? `${type}-${timestamp}${randomPart}` : `${timestamp}${randomPart}`;
  }
}

/**
 * Checks if an ID is a Nostr event ID or temporary Nostr-format ID
 */
export function isNostrId(id: string): boolean {
  // Check for standard Nostr bech32 encoding or our temporary format
  return id.startsWith('note1') || id.startsWith('nostr:') || 
         // Also check for UUID format (for new Nostr event IDs)
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Checks if an ID is a local ID
 */
export function isLocalId(id: string): boolean {
  return id.startsWith('local:');
}

/**
 * Extracts the timestamp from an ID
 */
export function getTimestampFromId(id: string): number | null {
  try {
    const parts = id.split(':').pop()?.split('-');
    if (!parts?.[0]) return null;
    return parseInt(parts[0], 36);
  } catch {
    return null;
  }
}

/**
 * Creates a Nostr addressable reference (NIP-01/33)
 * @param kind - The Nostr event kind 
 * @param pubkey - The author's public key
 * @param dTag - The d-tag value for the addressable event
 * @returns A string in the format "kind:pubkey:d-tag"
 */
export function createNostrReference(kind: number, pubkey: string, dTag: string): string {
  return `${kind}:${pubkey}:${dTag}`;
}