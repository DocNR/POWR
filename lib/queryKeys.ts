/**
 * Query keys for React Query
 * 
 * This file defines constants used as queryKeys to identify different queries.
 * Using a structured approach to queryKeys makes it easier to:
 * 1. Understand the purpose of each query
 * 2. Invalidate related queries
 * 3. Ensure consistent naming throughout the app
 */

export const QUERY_KEYS = {
  // Auth related queries
  auth: {
    all: ['auth'] as const,
    current: () => [...QUERY_KEYS.auth.all, 'current'] as const,
    profile: (pubkey: string) => [...QUERY_KEYS.auth.all, 'profile', pubkey] as const,
  },
  
  // Relay related queries
  relays: {
    all: ['relays'] as const,
    status: () => [...QUERY_KEYS.relays.all, 'status'] as const,
    list: () => [...QUERY_KEYS.relays.all, 'list'] as const,
  },
  
  // System related queries
  system: {
    all: ['system'] as const,
    connectivity: () => [...QUERY_KEYS.system.all, 'connectivity'] as const,
  },
  
  // Workouts related queries
  workouts: {
    all: ['workouts'] as const,
    detail: (id: string) => [...QUERY_KEYS.workouts.all, 'detail', id] as const,
    list: (filters?: any) => [...QUERY_KEYS.workouts.all, 'list', filters] as const,
    history: (pubkey: string) => [...QUERY_KEYS.workouts.all, 'history', pubkey] as const,
  },
  
  // Templates related queries
  templates: {
    all: ['templates'] as const,
    detail: (id: string) => [...QUERY_KEYS.templates.all, 'detail', id] as const,
    list: (filters?: any) => [...QUERY_KEYS.templates.all, 'list', filters] as const,
    favorites: () => [...QUERY_KEYS.templates.all, 'favorites'] as const,
  },
  
  // Exercises related queries
  exercises: {
    all: ['exercises'] as const,
    detail: (id: string) => [...QUERY_KEYS.exercises.all, 'detail', id] as const,
    list: (filters?: any) => [...QUERY_KEYS.exercises.all, 'list', filters] as const,
    namesByEvent: (eventId: string) => [...QUERY_KEYS.exercises.all, 'namesByEvent', eventId] as const,
    namesByWorkout: (workoutId: string) => [...QUERY_KEYS.exercises.all, 'namesByWorkout', workoutId] as const,
  },
  
  // Social feed related queries
  feed: {
    all: ['feed'] as const,
    global: (filters?: any) => [...QUERY_KEYS.feed.all, 'global', filters] as const,
    following: (pubkey: string, filters?: any) => [...QUERY_KEYS.feed.all, 'following', pubkey, filters] as const,
    user: (pubkey: string, filters?: any) => [...QUERY_KEYS.feed.all, 'user', pubkey, filters] as const,
    thread: (id: string) => [...QUERY_KEYS.feed.all, 'thread', id] as const,
  },
  
  // Contact list related queries
  contacts: {
    all: ['contacts'] as const,
    list: (pubkey: string) => [...QUERY_KEYS.contacts.all, 'list', pubkey] as const,
    followers: (pubkey: string) => [...QUERY_KEYS.contacts.all, 'followers', pubkey] as const,
    following: (pubkey: string) => [...QUERY_KEYS.contacts.all, 'following', pubkey] as const,
  },
  
  // Profile related queries
  profile: {
    all: ['profile'] as const,
    stats: (pubkey?: string) => [...QUERY_KEYS.profile.all, 'stats', pubkey] as const,
    bannerImage: (pubkey?: string) => [...QUERY_KEYS.profile.all, 'bannerImage', pubkey] as const,
    profileImage: (pubkey?: string) => [...QUERY_KEYS.profile.all, 'profileImage', pubkey] as const,
  },
  
  // POWR Packs related queries
  powrPacks: {
    all: ['powrPacks'] as const,
    list: () => [...QUERY_KEYS.powrPacks.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.powrPacks.all, 'detail', id] as const,
  },
};
