// utils/nostr-utils.ts
import { NostrEvent } from '@/types/nostr';

/**
 * Helper function to find a tag value in a Nostr event
 */
export function findTagValue(tags: string[][], name: string): string | null {
  const tag = tags.find(t => t[0] === name);
  return tag && tag.length > 1 ? tag[1] : null;
}

/**
 * Get all values for a specific tag name
 */
export function getTagValues(tags: string[][], name: string): string[] {
  return tags.filter(t => t[0] === name).map(t => t[1]);
}

/**
 * Get template tag information
 */
export function getTemplateTag(tags: string[][]): { reference: string, relay: string } | undefined {
  const templateTag = tags.find(t => t[0] === 'template');
  if (!templateTag || templateTag.length < 3) return undefined;
  
  return {
    reference: templateTag[1],
    relay: templateTag[2] || ''
  };
}