// types/feed.ts
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { 
  ParsedWorkoutRecord, 
  ParsedExerciseTemplate, 
  ParsedWorkoutTemplate,
  ParsedSocialPost,
  ParsedLongformContent
} from '@/types/nostr-workout';

// Base feed entry interface
export interface FeedEntry {
  id: string;
  eventId: string;
  event?: NDKEvent;
  timestamp: number;
  seen?: boolean;
  updated?: number;
}

// Workout-specific feed entry
export interface WorkoutFeedEntry extends FeedEntry {
  type: 'workout';
  content?: ParsedWorkoutRecord;
}

// Exercise template feed entry
export interface ExerciseFeedEntry extends FeedEntry {
  type: 'exercise';
  content?: ParsedExerciseTemplate;
}

// Workout template feed entry
export interface TemplateFeedEntry extends FeedEntry {
  type: 'template';
  content?: ParsedWorkoutTemplate;
}

// Social post feed entry
export interface SocialFeedEntry extends FeedEntry {
  type: 'social';
  content?: ParsedSocialPost;
}

// Article feed entry
export interface ArticleFeedEntry extends FeedEntry {
  type: 'article';
  content?: ParsedLongformContent;
}

// Union type for all feed entries
export type AnyFeedEntry = 
  | WorkoutFeedEntry 
  | ExerciseFeedEntry 
  | TemplateFeedEntry 
  | SocialFeedEntry
  | ArticleFeedEntry;

// Function signature for updating entries
export type UpdateEntryFn = (id: string, updater: (entry: AnyFeedEntry) => AnyFeedEntry) => void;

// Feed filter options
export interface FeedFilterOptions {
  feedType: 'following' | 'powr' | 'global' | 'user-activity' | 'workout-history';
  since?: number;
  until?: number;
  limit?: number;
  authors?: string[];
  kinds?: number[];
}

// Feed entry filter function
export type FeedEntryFilterFn = (entry: AnyFeedEntry) => boolean;

// Feed options
export interface FeedOptions {
  subId?: string;
  enabled?: boolean;
  filterFn?: FeedEntryFilterFn;
  sortFn?: (a: AnyFeedEntry, b: AnyFeedEntry) => number;
  feedType?: 'following' | 'powr' | 'global' | 'user-activity' | 'workout-history';
}
