// types/powr-pack.ts
import { WorkoutTemplate } from './templates';
import { BaseExercise } from './exercise';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';

// Basic POWR Pack structure
export interface POWRPack {
  id: string;
  title: string;
  description?: string;
  authorPubkey: string;
  nostrEventId?: string;
  importDate: number;
  updatedAt: number;
}

// Pack item reference
export interface POWRPackItem {
  packId: string;
  itemId: string;
  itemType: 'exercise' | 'template';
  itemOrder?: number;
  isImported: boolean;
  nostrEventId?: string;
}

// Combined pack with content for display
export interface POWRPackWithContent {
  pack: POWRPack;
  exercises: BaseExercise[];
  templates: WorkoutTemplate[];
}

// Structure for importing packs
export interface POWRPackImport {
  packEvent: NDKEvent;
  exercises: NDKEvent[];
  templates: NDKEvent[];
}

// Selected items during import process
export interface POWRPackSelection {
  packId: string;
  selectedExercises: string[]; // Exercise IDs
  selectedTemplates: string[]; // Template IDs
  // Mapping of template ID to required exercise IDs
  templateDependencies: Record<string, string[]>;
}