// types/events.ts
export enum NostrEventKind {
  METADATA = 0,
  TEXT = 1,
  EXERCISE_TEMPLATE = 33401,
  WORKOUT_TEMPLATE = 33402,
  WORKOUT_RECORD = 33403
}

export interface NostrEvent {
  kind: NostrEventKind;
  content: string;
  tags: string[][];
  created_at: number;
  pubkey?: string;
  id?: string;
  sig?: string;
}

export interface NostrMetadata {
  id: string;
  pubkey: string;
  relayUrl: string;
  kind?: number;
  created_at: number;
}

export interface NostrReference {
  id: string;
  kind: NostrEventKind;
  pubkey: string;
  relay?: string;
}

// Utility types for tag handling
export type NostrTag = string[];

export interface NostrTagMap {
  d?: string;
  title?: string;
  type?: string;
  category?: string;
  equipment?: string;
  format?: string;
  format_units?: string;
  instructions?: string[];
  exercise?: string[];
  start?: string;
  end?: string;
  completed?: string;
  total_weight?: string;
  t?: string[];
  [key: string]: string | string[] | undefined;
}

export function getTagValue(tags: NostrTag[], name: string): string | undefined {
  return tags.find(tag => tag[0] === name)?.[1];
}

export function getTagValues(tags: NostrTag[], name: string): string[] {
  return tags.filter(tag => tag[0] === name).map(tag => tag[1]);
}

export function tagsToMap(tags: NostrTag[]): NostrTagMap {
  return tags.reduce((map, tag) => {
    const [name, ...values] = tag;
    if (values.length === 1) {
      map[name] = values[0];
    } else {
      map[name] = values;
    }
    return map;
  }, {} as NostrTagMap);
}