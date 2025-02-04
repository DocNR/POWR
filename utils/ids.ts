// utils/ids.ts

/**
 * Generates a unique identifier with optional source prefix
 * @param source - Optional source identifier ('local' or 'nostr')
 * @returns A unique string identifier
 */
export function generateId(source: 'local' | 'nostr' = 'local'): string {
    // Generate timestamp and random parts
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    
    // For local IDs, use the current format with a prefix
    if (source === 'local') {
      return `local:${timestamp}-${randomPart}`;
    }
    
    // For Nostr-compatible IDs (temporary until we integrate actual Nostr)
    // This creates a similar format to Nostr but is clearly marked as temporary
    return `nostr:temp:${timestamp}-${randomPart}`;
  }
  
  /**
   * Checks if an ID is a Nostr event ID or temporary Nostr-format ID
   */
  export function isNostrId(id: string): boolean {
    return id.startsWith('note1') || id.startsWith('nostr:');
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