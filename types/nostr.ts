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
    EXERCISE = 33401,
    TEMPLATE = 33402,
    WORKOUT = 33403
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