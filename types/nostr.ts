// types/nostr.ts
export interface NostrEvent {
  id?: string;
  pubkey?: string;
  content: string;
  created_at: number;
  kind: number;
  tags: string[][];
  sig?: string;
}

export enum NostrEventKind {
  TEXT = 1,
  EXERCISE = 33401,
  TEMPLATE = 33402,
  WORKOUT = 1301  // Updated from 33403 to 1301
}

export interface NostrTag {
  name: string;
  value: string;
  index?: number;
}

// Helper functions
export function getTagValue(tags: string[][], name: string): string | undefined {
  const tag = tags.find(t => t[0] === name);
  return tag ? tag[1] : undefined;
}

export function getTagValues(tags: string[][], name: string): string[] {
  return tags.filter(t => t[0] === name).map(t => t[1]);
}

// New helper function for template tags
export function getTemplateTag(tags: string[][]): { reference: string, relay: string } | undefined {
  const templateTag = tags.find(t => t[0] === 'template');
  if (!templateTag) return undefined;
  
  return {
      reference: templateTag[1],
      relay: templateTag[2]
  };
}