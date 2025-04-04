# React Query Integration for POWR

**Last Updated:** April 3, 2025  
**Status:** Implementation Plan  
**Authors:** POWR Development Team

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [React Query Integration Strategy](#react-query-integration-strategy)
4. [Authentication & State Management](#authentication--state-management)
5. [Data Fetching & Caching](#data-fetching--caching)
6. [Offline Support & Publication Queue](#offline-support--publication-queue)
7. [Error Handling](#error-handling)
8. [Conflict Resolution](#conflict-resolution)
9. [Implementation Roadmap](#implementation-roadmap)
10. [API Reference](#api-reference)
11. [Migration Guide](#migration-guide)

## Overview

This document outlines the plan to integrate React Query (TanStack Query) into the POWR app to resolve critical issues with authentication state transitions, hook ordering, and offline synchronization while preserving our local-first architecture with Nostr integration.

### Key Goals

- Fix React hook ordering issues causing crashes during authentication state changes
- Provide consistent data access patterns across the application
- Enhance offline support with better synchronization
- Improve error handling and recovery
- Maintain local-first architecture with SQLite and Nostr integration

### Architecture Principles

1. **SQLite Remains Primary Persistence Layer**: All user data will continue to be persisted in SQLite
2. **React Query as Sync/Cache Layer**: React Query manages data synchronization between UI, SQLite, and Nostr
3. **Zustand for UI State**: Active workout state and UI-specific state remain in Zustand stores
4. **NDK for Nostr Integration**: NDK remains the primary interface for Nostr communication

## Current Architecture Analysis

### Existing Data Flow

```
┌─ UI Components ─────────────────────────────────┐
│                                                 │
│  React Components (screens, etc.)               │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│                                                 │
│  Custom Hooks (useProfile, useSocialFeed, etc.) │
│                                                 │
└───────┬───────────────────────┬─────────────────┘
        │                       │
┌───────▼───────────┐  ┌────────▼────────────────┐
│                   │  │                         │
│  SQLite Services  │  │  NDK Integration        │
│  (Local Storage)  │  │  (Nostr Communication)  │
│                   │  │                         │
└───────────────────┘  └─────────────────────────┘
```

### Current Authentication System

The current authentication system is implemented across several components:

- `lib/auth/AuthService.ts`: Core authentication service
- `lib/auth/AuthStateManager.ts`: State machine for auth transitions
- `lib/auth/SigningQueue.ts`: Queue for NDK event signing
- `lib/hooks/useNDK.ts`: Hook for accessing the NDK instance
- `lib/hooks/useNDKAuth.ts`: Hook for authentication with NDK
- `lib/signers/NDKAmberSigner.ts`: External signer integration for Android

The system implements a state machine pattern:

```typescript
type AuthState = 
  | { status: 'unauthenticated' }
  | { status: 'authenticating', method: 'private_key' | 'amber' | 'ephemeral' }
  | { status: 'authenticated', user: NDKUser, method: 'private_key' | 'amber' | 'ephemeral' }
  | { status: 'signing', operationCount: number, operations: SigningOperation[] }
  | { status: 'error', error: Error };
```

However, hook ordering issues occur when components conditionally use hooks based on authentication state.

### Current Caching System

The current caching system includes:

- `SocialFeedCache`: SQLite-based caching for social feed events
- `ProfileImageCache`: Caching for user profile images
- `ContactCacheService`: Caching for user contact lists
- `EventCache`: General-purpose cache for Nostr events
- `PublicationQueueService`: Queue for pending Nostr publications

### NDK Integration

NDK is integrated through:

- `lib/stores/ndk.ts`: NDK store implementation
- `lib/hooks/useNDK.ts`: Hook for accessing NDK
- `lib/initNDK.ts`: NDK initialization
- Various hooks for specific NDK operations

## React Query Integration Strategy

### New Architecture with React Query

```
┌─ UI Components ─────────────────────────────────┐
│                                                 │
│  React Components (screens, etc.)               │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─ Data Access Layer ───────────────────────────┐
│                                               │
│  React Query Hooks                            │
│  (useProfile, useWorkouts, useTemplates, etc.)│
│                                               │
└───────┬───────────────────────┬───────────────┘
        │                       │
        ▼                       ▼
┌───────────────────┐  ┌────────────────────────┐
│ SQLite Services   │  │ NDK Integration         │
│ (local storage)   │  │ (network/Nostr)         │
└───────────────────┘  └────────────────────────┘
```

### Replacement Strategy

Our strategy is to use React Query to replace portions of our custom hooks that handle data fetching, caching, and synchronization, while preserving our SQLite services and NDK integration.

#### What React Query Will Replace

- Custom caching logic in hooks
- Manual state management for loading/error states
- Ad-hoc fetch retry and synchronization logic
- Authentication state propagation

#### What Will Remain Unchanged

- SQLite database schema and services
- NDK event handling and Nostr communication
- Zustand stores for active workout state and UI-specific state
- Core business logic

### Key Benefits

1. **Consistent Hook Ordering**: React Query preserves hook call order across renders
2. **Automatic Background Refetching**: Built-in mechanisms for data freshness
3. **Standardized Loading/Error States**: Consistent data loading patterns
4. **Optimistic Updates**: Built-in support for optimistic UI updates
5. **Deduplication of Requests**: Prevents redundant network/database calls

## Authentication & State Management

### React Query Auth Provider

We'll implement a centralized authentication system using React Query:

```tsx
// lib/auth/ReactQueryAuthProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useState, ReactNode } from 'react';
import { AuthService } from './AuthService';

// Create a new Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
});

// Create a context for global access to auth methods
const AuthContext = createContext<{
  authService: AuthService | null;
}>({ authService: null });

// Provider component
export function ReactQueryAuthProvider({ children }: { children: ReactNode }) {
  const [authService] = useState(() => new AuthService());

  return (
    <AuthContext.Provider value={{ authService }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

// Hook for accessing auth service
export function useAuthService() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthService must be used within a ReactQueryAuthProvider');
  }
  return context.authService;
}
```

### Auth Query Hook

```typescript
// lib/hooks/useAuthQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthService } from '../auth/ReactQueryAuthProvider';
import * as SecureStore from 'expo-secure-store';

// Auth state query keys
export const AUTH_KEYS = {
  all: ['auth'] as const,
  current: () => [...AUTH_KEYS.all, 'current'] as const,
  profile: (pubkey: string) => [...AUTH_KEYS.all, 'profile', pubkey] as const,
};

// Hook for managing auth state
export function useAuthQuery() {
  const authService = useAuthService();
  const queryClient = useQueryClient();

  // Query for current auth state
  const authQuery = useQuery({
    queryKey: AUTH_KEYS.current(),
    queryFn: async () => {
      // Check for stored credentials
      const pubkey = await SecureStore.getItemAsync('nostr_pubkey');
      
      // If no credentials, return unauthenticated state
      if (!pubkey) {
        return { status: 'unauthenticated' };
      }
      
      // Initialize auth from stored credentials
      try {
        // For direct key login
        return await authService.getCurrentAuthState();
      } catch (error) {
        // Handle initialization error
        console.error('Auth initialization error:', error);
        
        // Clear any invalid credentials
        await SecureStore.deleteItemAsync('nostr_pubkey');
        
        return {
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    },
    // Auth doesn't automatically become stale
    staleTime: Infinity,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (params: { 
      method: 'private_key' | 'amber' | 'ephemeral'; 
      privateKey?: string; 
    }) => {
      // Set auth state to authenticating first
      queryClient.setQueryData(AUTH_KEYS.current(), {
        status: 'authenticating',
        method: params.method
      });
      
      // Perform login based on method
      try {
        switch (params.method) {
          case 'private_key':
            if (!params.privateKey) throw new Error('Private key required');
            return await authService.loginWithPrivateKey(params.privateKey);
          case 'amber':
            return await authService.loginWithAmber();
          case 'ephemeral':
            return await authService.createEphemeralKey();
          default:
            throw new Error(`Unsupported auth method: ${params.method}`);
        }
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (user) => {
      // Update auth state on success
      queryClient.setQueryData(AUTH_KEYS.current(), {
        status: 'authenticated',
        user,
        method: user.authMethod
      });
      
      // Invalidate auth-dependent queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['relays'] });
    },
    onError: (error) => {
      // Set error state
      queryClient.setQueryData(AUTH_KEYS.current(), {
        status: 'error',
        error
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Perform logout
      await authService.logout();
    },
    onSuccess: () => {
      // Reset auth state
      queryClient.setQueryData(AUTH_KEYS.current(), {
        status: 'unauthenticated'
      });
      
      // Clear user-dependent queries
      queryClient.removeQueries({ queryKey: ['contacts'] });
      queryClient.removeQueries({ queryKey: ['feed'] });
      queryClient.removeQueries({ queryKey: ['profile'] });
    }
  });

  return {
    auth: authQuery.data,
    isLoading: authQuery.isLoading,
    isError: authQuery.isError,
    error: authQuery.error,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isAuthenticating: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
```

### Amber Signer Integration

```typescript
// lib/hooks/useAmberSignerWithQuery.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthQuery, AUTH_KEYS } from './useAuthQuery';
import { NDKEvent } from '@nostr-dev-kit/ndk';

// Hook for Amber signing operations
export function useAmberSigner() {
  const { auth } = useAuthQuery();
  const queryClient = useQueryClient();

  // Mutation for signing events
  const signEventMutation = useMutation({
    mutationFn: async (event: NDKEvent) => {
      if (auth?.status !== 'authenticated') {
        throw new Error('Not authenticated');
      }
      
      // Update auth state to show signing in progress
      queryClient.setQueryData(AUTH_KEYS.current(), {
        ...auth,
        status: 'signing',
        operationCount: (auth.operationCount || 0) + 1,
        operations: [...(auth.operations || []), { 
          type: 'sign', 
          event, 
          timestamp: Date.now() 
        }]
      });
      
      try {
        // Use AmberSignerModule to sign the event
        const signedEvent = await AmberSignerModule.signEvent(
          JSON.stringify(event.rawEvent()), 
          event.pubkey
        );
        
        // Restore auth state after signing
        queryClient.setQueryData(AUTH_KEYS.current(), auth);
        
        return signedEvent;
      } catch (error) {
        // Update auth state with error
        queryClient.setQueryData(AUTH_KEYS.current(), {
          ...auth,
          status: 'authenticated',
          error
        });
        
        throw error;
      }
    }
  });

  return {
    signEvent: signEventMutation.mutate,
    isSigningEvent: signEventMutation.isPending,
    signingError: signEventMutation.error
  };
}
```

### Authentication Component Updates

Components will need to be updated to use the new auth hooks consistently:

```tsx
// Example Login Screen
function LoginScreen() {
  const { login, isAuthenticating, error } = useAuthQuery();
  const [privateKey, setPrivateKey] = useState('');

  // Handle login
  const handleLogin = () => {
    login({ method: 'private_key', privateKey });
  };

  // Handle Amber login
  const handleAmberLogin = () => {
    login({ method: 'amber' });
  };

  return (
    <View>
      {isAuthenticating ? (
        <ActivityIndicator />
      ) : (
        <>
          <TextInput
            value={privateKey}
            onChangeText={setPrivateKey}
            placeholder="Enter your private key"
            secureTextEntry
          />
          <Button onPress={handleLogin} title="Login with Private Key" />
          <Button onPress={handleAmberLogin} title="Login with Amber" />
          {error && <Text>{error.message}</Text>}
        </>
      )}
    </View>
  );
}
```

## Data Fetching & Caching

### Query Keys Structure

We'll implement a structured query key strategy for effective cache management:

```typescript
// lib/queryKeys.ts
export const QUERY_KEYS = {
  auth: {
    all: ['auth'] as const,
    current: () => [...QUERY_KEYS.auth.all, 'current'] as const,
    profile: (pubkey: string) => [...QUERY_KEYS.auth.all, 'profile', pubkey] as const,
  },
  contacts: {
    all: ['contacts'] as const,
    list: (pubkey: string) => [...QUERY_KEYS.contacts.all, 'list', pubkey] as const,
  },
  feed: {
    all: ['feed'] as const,
    type: (type: string) => [...QUERY_KEYS.feed.all, type] as const,
    user: (type: string, pubkey: string) => [...QUERY_KEYS.feed.type(type), pubkey] as const,
  },
  workouts: {
    all: ['workouts'] as const,
    list: (filters?: any) => [...QUERY_KEYS.workouts.all, 'list', filters] as const,
    detail: (id: string) => [...QUERY_KEYS.workouts.all, 'detail', id] as const,
    history: (pubkey: string) => [...QUERY_KEYS.workouts.all, 'history', pubkey] as const,
  },
  templates: {
    all: ['templates'] as const,
    list: (filters?: any) => [...QUERY_KEYS.templates.all, 'list', filters] as const,
    detail: (id: string) => [...QUERY_KEYS.templates.all, 'detail', id] as const,
  },
  exercises: {
    all: ['exercises'] as const,
    list: (filters?: any) => [...QUERY_KEYS.exercises.all, 'list', filters] as const,
    detail: (id: string) => [...QUERY_KEYS.exercises.all, 'detail', id] as const,
  },
  powr_packs: {
    all: ['powr_packs'] as const,
    list: () => [...QUERY_KEYS.powr_packs.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.powr_packs.all, 'detail', id] as const,
  },
  publication_queue: {
    all: ['publication_queue'] as const,
    list: () => [...QUERY_KEYS.publication_queue.all, 'list'] as const,
  },
  relays: {
    all: ['relays'] as const,
    list: () => [...QUERY_KEYS.relays.all, 'list'] as const,
    status: () => [...QUERY_KEYS.relays.all, 'status'] as const,
  },
};
```

### Sample Data Access Hooks

#### Social Feed

```typescript
// lib/hooks/useSocialFeedWithQuery.ts
import { useQuery } from '@tanstack/react-query';
import { useAuthQuery } from './useAuthQuery';
import { QUERY_KEYS } from '../queryKeys';
import { SocialFeedCache } from '../db/services/SocialFeedCache';
import { SocialFeedService } from '../social/socialFeedService';
import { useConnectivity } from './useConnectivity';

export function useSocialFeedWithQuery({
  feedType = 'global',
  authors = [],
  limit = 30
}) {
  const { auth } = useAuthQuery();
  const { isOnline } = useConnectivity();
  const isAuthenticated = auth?.status === 'authenticated';

  return useQuery({
    queryKey: QUERY_KEYS.feed.type(feedType),
    queryFn: async () => {
      // First check cache
      const cachedEvents = await SocialFeedCache.getFeedEvents(feedType, limit);
      
      // If offline, return cached data only
      if (!isOnline) {
        return cachedEvents;
      }
      
      // If online, fetch fresh data
      try {
        const socialService = new SocialFeedService();
        
        // Different behavior based on feed type
        let events;
        
        switch (feedType) {
          case 'following':
            // Only fetch following feed if authenticated
            if (!isAuthenticated) return cachedEvents;
            events = await socialService.getFollowingFeed(auth.user.pubkey, limit);
            break;
          case 'global':
            events = await socialService.getGlobalFeed(limit);
            break;
          case 'powr':
            events = await socialService.getPOWRFeed(limit);
            break;
          default:
            events = await socialService.getGlobalFeed(limit);
        }
        
        // Cache the new events
        await SocialFeedCache.cacheFeedEvents(feedType, events);
        
        return events;
      } catch (error) {
        console.error(`Error fetching ${feedType} feed:`, error);
        // Fall back to cache on error
        return cachedEvents;
      }
    },
    // Only run query for following feed if authenticated
    enabled: feedType !== 'following' || isAuthenticated,
    // Data refetching strategies
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchInterval: isOnline ? 5 * 60 * 1000 : false, // 5 minutes if online
    // Provide last cached result while refetching
    placeholderData: keepPreviousData,
  });
}
```

#### Workout History

```typescript
// lib/hooks/useWorkoutHistoryWithQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../queryKeys';
import { useAuthQuery } from './useAuthQuery';
import { useConnectivity } from './useConnectivity';
import { WorkoutService } from '../db/services/WorkoutService';
import { NostrWorkoutService } from '../db/services/NostrWorkoutService';
import { mergeWorkouts } from '../utils/workout';

export function useWorkoutHistoryWithQuery(options = {}) {
  const { auth } = useAuthQuery();
  const { isOnline } = useConnectivity();
  const queryClient = useQueryClient();
  const isAuthenticated = auth?.status === 'authenticated';
  const pubkey = auth?.user?.pubkey;

  // Query for workout history
  const workoutHistoryQuery = useQuery({
    queryKey: QUERY_KEYS.workouts.history(pubkey || 'anonymous'),
    queryFn: async () => {
      // Always fetch local workouts
      const localWorkouts = await WorkoutService.getWorkoutHistory();
      
      // If not authenticated or offline, return only local
      if (!isAuthenticated || !isOnline) {
        return localWorkouts;
      }
      
      try {
        // Fetch Nostr workouts
        const nostrWorkouts = await NostrWorkoutService.getWorkoutHistory(pubkey);
        
        // Merge local and Nostr workouts, removing duplicates and sorting by date
        const mergedWorkouts = mergeWorkouts(localWorkouts, nostrWorkouts);
        
        return mergedWorkouts;
      } catch (error) {
        console.error('Error fetching Nostr workouts:', error);
        // Fall back to local on error
        return localWorkouts;
      }
    },
    // Only enabled if we have a valid pubkey for authenticated users
    enabled: !isAuthenticated || !!pubkey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  });

  // Add workout mutation
  const addWorkoutMutation = useMutation({
    mutationFn: async (workout) => {
      // Always save to local database first
      const savedWorkout = await WorkoutService.saveWorkout(workout);
      
      // If authenticated and online, also publish to Nostr
      if (isAuthenticated && isOnline) {
        try {
          await NostrWorkoutService.publishWorkout(savedWorkout);
        } catch (error) {
          // If publishing fails, queue for later
          console.error('Error publishing workout to Nostr:', error);
          await PublicationQueueService.queueWorkout(savedWorkout);
        }
      } else if (isAuthenticated) {
        // If offline but authenticated, queue for later
        await PublicationQueueService.queueWorkout(savedWorkout);
      }
      
      return savedWorkout;
    },
    onSuccess: (savedWorkout) => {
      // Update queries that might have this workout
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workouts.history(pubkey || 'anonymous'),
      });
    }
  });

  return {
    workouts: workoutHistoryQuery.data || [],
    isLoading: workoutHistoryQuery.isLoading,
    isError: workoutHistoryQuery.isError,
    error: workoutHistoryQuery.error,
    addWorkout: addWorkoutMutation.mutate,
    isAddingWorkout: addWorkoutMutation.isPending,
  };
}
```

#### Exercise Library

```typescript
// lib/hooks/useExercisesWithQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../queryKeys';
import { ExerciseService } from '../db/services/ExerciseService';
import { useAuthQuery } from './useAuthQuery';
import { useConnectivity } from './useConnectivity';

export function useExercisesWithQuery(filters = {}) {
  const queryClient = useQueryClient();
  const { auth } = useAuthQuery();
  const { isOnline } = useConnectivity();
  const isAuthenticated = auth?.status === 'authenticated';

  // Query for exercise list
  const exercisesQuery = useQuery({
    queryKey: QUERY_KEYS.exercises.list(filters),
    queryFn: async () => {
      // Fetch from SQLite
      return ExerciseService.getExercises(filters);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Mutation for adding an exercise
  const addExerciseMutation = useMutation({
    mutationFn: async (exercise) => {
      // Save to SQLite
      const savedExercise = await ExerciseService.saveExercise(exercise);
      
      // If authenticated and online, also publish to Nostr
      if (isAuthenticated && isOnline) {
        try {
          await PublishExerciseToNostr(savedExercise);
        } catch (error) {
          // If publishing fails, queue for later
          console.error('Error publishing exercise to Nostr:', error);
          await PublicationQueueService.queueExercise(savedExercise);
        }
      } else if (isAuthenticated) {
        // If offline but authenticated, queue for later
        await PublicationQueueService.queueExercise(savedExercise);
      }
      
      return savedExercise;
    },
    onSuccess: (savedExercise) => {
      // Update exercise list
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.exercises.list(),
      });
    }
  });

  return {
    exercises: exercisesQuery.data || [],
    isLoading: exercisesQuery.isLoading,
    isError: exercisesQuery.isError,
    error: exercisesQuery.error,
    addExercise: addExerciseMutation.mutate,
    isAddingExercise: addExerciseMutation.isPending,
  };
}
```

## Offline Support & Publication Queue

### Enhanced Publication Queue

```typescript
// lib/hooks/usePublicationQueueWithQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../queryKeys';
import { PublicationQueueService } from '../db/services/PublicationQueueService';
import { useAuthQuery } from './useAuthQuery';
import { useConnectivity } from './useConnectivity';

export function usePublicationQueueWithQuery() {
  const queryClient = useQueryClient();
  const { auth } = useAuthQuery();
  const { isOnline } = useConnectivity();
  const isAuthenticated = auth?.status === 'authenticated';

  // Query for queue items
  const queueQuery = useQuery({
    queryKey: QUERY_KEYS.publication_queue.list(),
    queryFn: async () => {
      return PublicationQueueService.getQueueItems();
    },
    // Refresh every minute to check for new items
    refetchInterval: 60 * 1000,
  });

  // Process a single item
  const processItemMutation = useMutation({
    mutationFn: async (item) => {
      if (!isOnline || !isAuthenticated) {
        throw new Error('Cannot process: offline or not authenticated');
      }

      // Process based on item type
      switch (item.type) {
        case 'workout':
          await NostrWorkoutService.publishWorkout(item.data);
          break;
        case 'exercise':
          await PublishExerciseToNostr(item.data);
          break;
        // Other types...
        default:
          throw new Error(`Unknown queue item type: ${item.type}`);
      }

      // Remove from queue if successful
      await PublicationQueueService.removeItem(item.id);
      
      return { success: true, item };
    },
    onSuccess: (result, item) => {
      // Invalidate related queries
      switch (item.type) {
        case 'workout':
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.workouts.all,
          });
          break;
        case 'exercise':
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.exercises.all,
          });
          break;
        // Other types...
      }
      
      // Invalidate the queue
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.publication_queue.list(),
      });
    }
  });

  // Process all eligible items
  const processQueueMutation = useMutation({
    mutationFn: async () => {
      if (!isOnline || !isAuthenticated) {
        return { processed: 0, skipped: queueQuery.data?.length || 0 };
      }

      const items = queueQuery.data || [];
      
      // Process each item
      const results = await Promise.allSettled(
        items.map(item => processItemMutation.mutateAsync(item))
      );
      
      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;
      
      return {
        processed: successes,
        failed: failures,
        total: items.length
      };
    }
  });

  // Auto-process queue when connectivity changes
  useEffect(() => {
    if (isOnline && isAuthenticated && queueQuery.data?.length > 0) {
      processQueueMutation.mutate();
    }
  }, [isOnline, isAuthenticated, queueQuery.data?.length]);

  return {
    queueItems: queueQuery.data || [],
    isLoading: queueQuery.isLoading,
    processItem: processItemMutation.mutate,
    processQueue: processQueueMutation.mutate,
    isProcessing: processItemMutation.isPending || processQueueMutation.isPending,
    processStats: processQueueMutation.data,
  };
}
```

### Connectivity Monitoring

```typescript
// lib/hooks/useConnectivityWithQuery.ts
import { useQuery } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { QUERY_KEYS } from '../queryKeys';

export function useConnectivityWithQuery() {
  return useQuery({
    queryKey: ['connectivity'],
    queryFn: async () => {
      const state = await NetInfo.fetch();
      return {
        isOnline: state.isConnected && state.isInternetReachable,
        type: state.type,
        details: state.details
      };
    },
    // Refetch connectivity status frequently
    refetchInterval: 30 * 1000, // 30 seconds
    // Always refetch on window focus
    refetchOnWindowFocus: true,
    // Start with offline assumption for safety
    placeholderData: { isOnline: false, type: 'unknown', details: null },
  });
}

// Add a higher-order component to automatically retry data fetching when connectivity is restored
export function withConnectivityRetry(Component) {
  return function ConnectivityAwareComponent(props) {
    const { data: connectivity } = useConnectivityWithQuery();
    const queryClient = useQueryClient();
    
    // When connectivity is restored, invalidate certain queries
    useEffect(() => {
      if (connectivity?.isOnline) {
        // Invalidate stale queries
        queryClient.invalidateQueries({ type: 'all', stale: true });
      }
    }, [connectivity?.isOnline, queryClient]);
    
    return <Component {...props} connectivity={connectivity} />;
  };
}
```

## Error Handling

Proper error handling is critical for a robust user experience, especially in a fitness app with offline capabilities. React Query provides excellent tools for error handling that we'll leverage.

### NDK-Specific Error Types

```typescript
// lib/errors/NDKErrors.ts
export enum NDKErrorType {
  NETWORK = 'network',
  RELAY_REJECTION = 'relay_rejection',
  SIGNING_FAILURE = 'signing_failure',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export class NDKQueryError extends Error {
  type: NDKErrorType;
  relayUrl?: string;
  recoverable: boolean;
  retryAfter?: number;
  
  constructor(message: string, options: {
    type: NDKErrorType;
    relayUrl?: string;
    recoverable?: boolean;
    retryAfter?: number;
  }) {
    super(message);
    this.name = 'NDKQueryError';
    this.type = options.type;
    this.relayUrl = options.relayUrl;
    this.recoverable = options.recoverable ?? true;
    this.retryAfter = options.retryAfter;
  }
}

// Helper to categorize errors
export function handleNDKError(error: any): NDKQueryError {
  // Network errors
  if (
    error.message?.includes('disconnected') || 
    error.message?.includes('failed to fetch') ||
    error.message?.includes('network')
  ) {
    return new NDKQueryError('Network connection issue', {
      type: NDKErrorType.NETWORK,
      recoverable: true,
      retryAfter: 5000 // 5 seconds
    });
  }
  
  // Relay rejection errors
  if (error.message?.includes('rejected') || error.code === 'rejected') {
    return new NDKQueryError(`Relay rejected event: ${error.message}`, {
      type: NDKErrorType.RELAY_REJECTION,
      relayUrl: error.relay?.url,
      recoverable: false
    });
  }
  
  // Signing errors (e.g., Amber)
  if (
    error.message?.includes('signing') || 
    error.message?.includes('permission denied') || 
    error.message?.includes('cancelled')
  ) {
    return new NDKQueryError(`Failed to sign event: ${error.message}`, {
      type: NDKErrorType.SIGNING_FAILURE,
      recoverable: false
    });
  }
  
  // Timeout errors
  if (error.message?.includes('timeout')) {
    return new NDKQueryError(`Operation timed out: ${error.message}`, {
      type: NDKErrorType.TIMEOUT,
      recoverable: true,
      retryAfter: 10000 // 10 seconds
    });
  }
  
  // Default to unknown error
  return new NDKQueryError(`Unknown NDK error: ${error.message || 'No details'}`, {
    type: NDKErrorType.UNKNOWN,
    recoverable: true
  });
}
```

### Centralized Error Handling with QueryClient

```typescript
// lib/queryClient.ts
import { QueryClient, QueryCache } from '@tanstack/react-query';
import { showErrorToast } from '../utils/toast';
import { NDKQueryError, NDKErrorType } from './errors/NDKErrors';

// Create a custom query client with centralized error handling
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Custom retry logic based on error type
          if (error instanceof NDKQueryError) {
            // Don't retry unrecoverable errors
            if (!error.recoverable) return false;
            
            // Limit retry count based on error type
            switch (error.type) {
              case NDKErrorType.NETWORK:
                return failureCount < 5; // More retries for network issues
              case NDKErrorType.TIMEOUT:
                return failureCount < 3; // Reasonable retries for timeouts
              default:
                return failureCount < 2; // Limited retries for other errors
            }
          }
          
          // Default retry logic
          return failureCount < 3;
        },
        retryDelay: (attemptIndex, error) => {
          // Use recommended retry delay if available
          if (error instanceof NDKQueryError && error.retryAfter) {
            return error.retryAfter;
          }
          
          // Default exponential backoff with jitter
          const baseDelay = 1000; // 1 second
          const maxDelay = 30000; // 30 seconds
          const exponentialDelay = Math.min(
            baseDelay * (2 ** attemptIndex), 
            maxDelay
          );
          
          // Add jitter (up to 25%)
          const jitter = Math.random() * 0.25 * exponentialDelay;
          return exponentialDelay + jitter;
        }
      }
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only show meaningful errors to the user
        if (shouldShowToUser(error, query)) {
          const errorTitle = getErrorTitle(error);
          const errorMessage = getErrorMessage(error);
          
          showErrorToast({
            title: errorTitle,
            message: errorMessage,
            duration: 3000
          });
        }
        
        // Log all errors for debugging
        console.error(`[QueryError] ${query.queryKey}:`, error);
      }
    })
  });
}

// Helper to determine if error should be shown to user
function shouldShowToUser(error: any, query: any): boolean {
  // Don't show network errors during background updates
  if (
    error instanceof NDKQueryError && 
    error.type === NDKErrorType.NETWORK &&
    query.state.fetchStatus === 'fetching' &&
    query.state.data !== undefined
  ) {
    return false;
  }
  
  // Don't show errors for certain query types
  if (
    query.queryKey[0] === 'connectivity' || 
    query.queryKey[0] === 'publication_queue'
  ) {
    return false;
  }
  
  return true;
}

// Helper to get a user-friendly error title
function getErrorTitle(error: any): string {
  if (error instanceof NDKQueryError) {
    switch (error.type) {
      case NDKErrorType.NETWORK:
        return 'Connection Issue';
      case NDKErrorType.RELAY_REJECTION:
        return 'Request Rejected';
      case NDKErrorType.SIGNING_FAILURE:
        return 'Authentication Error';
      case NDKErrorType.TIMEOUT:
        return 'Request Timeout';
      default:
        return 'Unexpected Error';
    }
  }
  
  return 'Error';
}

// Helper to get a user-friendly error message
function getErrorMessage(error: any): string {
  if (error instanceof NDKQueryError) {
    switch (error.type) {
      case NDKErrorType.NETWORK:
        return 'Unable to connect to the network. Your changes will be saved locally and synced when connection is restored.';
      case NDKErrorType.RELAY_REJECTION:
        return 'The server rejected your request. Please try again later.';
      case NDKErrorType.SIGNING_FAILURE:
        return 'Unable to sign the data. Please check your authentication and try again.';
      case NDKErrorType.TIMEOUT:
        return 'The request took too long to complete. Please try again.';
      default:
        return error.message || 'Something went wrong. Please try again.';
    }
  }
  
  return error.message || 'An unknown error occurred.';
}
```

### Error Boundary for React Query

```tsx
// components/QueryErrorBoundary.tsx
import React from 'react';
import { Text, View, Button } from 'react-native';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

export function QueryErrorBoundary({ children }) {
  const { reset } = useQueryErrorResetBoundary();
  
  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-xl font-bold mb-2">Something went wrong</Text>
          <Text className="text-center mb-4">{error.message}</Text>
          <Button 
            title="Try again" 
            onPress={resetErrorBoundary} 
          />
        </View>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

## Conflict Resolution

A key challenge in any offline-first application is handling conflicts between local and remote data. This is especially important for a fitness app with Nostr integration where data can be modified in multiple locations.

### Conflict Types

In POWR, we need to handle several types of conflicts:

1. **Workout Records Conflicts**: Local workout records vs. published Nostr events
2. **Template Conflicts**: Changes to templates that exist both locally and remotely
3. **Exercise Conflicts**: Modifications to exercises that may be referenced by templates
4. **User Content Conflicts**: Conflicts when importing content created by other users

### Conflict Resolution Strategies

```typescript
// lib/utils/conflictResolution.ts
import { Workout, Exercise, Template } from '../types';

// Merge strategies
export type MergeStrategy = 
  | 'local-wins' 
  | 'remote-wins' 
  | 'newest-wins' 
  | 'manual';

// Interface for entities that can be merged
export interface Mergeable {
  id: string;
  updatedAt?: number; // timestamp
  createdAt?: number;
  version?: number;
  source?: 'local' | 'remote';
  nostrEvent?: any; // Nostr event data
}

// Generic merge function
export function mergeEntities<T extends Mergeable>(
  local: T | null,
  remote: T | null,
  strategy: MergeStrategy = 'newest-wins'
): { 
  result: T | null;
  conflict: boolean;
  winner: 'local' | 'remote' | 'none'; 
} {
  // If only one exists, return it
  if (!local) return { result: remote, conflict: false, winner: remote ? 'remote' : 'none' };
  if (!remote) return { result: local, conflict: false, winner: 'local' };
  
  // Check if they're identical (e.g., same version or same content)
  if (local.version === remote.version || areEntitiesIdentical(local, remote)) {
    return { result: local, conflict: false, winner: 'local' };
  }
  
  // Detect conflict
  const conflict = true;
  
  // Apply merge strategy
  switch (strategy) {
    case 'local-wins':
      return { result: local, conflict, winner: 'local' };
      
    case 'remote-wins':
      return { result: remote, conflict, winner: 'remote' };
      
    case 'newest-wins':
      // Use updatedAt to determine which is newer
      const localTime = local.updatedAt || local.createdAt || 0;
      const remoteTime = remote.updatedAt || remote.createdAt || 0;
      
      if (localTime > remoteTime) {
        return { result: local, conflict, winner: 'local' };
      } else if (remoteTime > localTime) {
        return { result: remote, conflict, winner: 'remote' };
      } else {
        // If timestamps match, prefer remote for consistency
        return { result: remote, conflict, winner: 'remote' };
      }
      
    case 'manual':
      // Return both for manual resolution
      throw new ConflictError(local, remote);
      
    default:
      // Default to newest-wins
      return mergeEntities(local, remote, 'newest-wins');
  }
}

// Custom error for conflicts that require manual resolution
export class ConflictError extends Error {
  local: Mergeable;
  remote: Mergeable;
  
  constructor(local: Mergeable, remote: Mergeable) {
    super('Data conflict detected');
    this.name = 'ConflictError';
    this.local = local;
    this.remote = remote;
  }
}

// Helper to check if entities are identical in content
function areEntitiesIdentical(a: Mergeable, b: Mergeable): boolean {
  // Basic check for different IDs
  if (a.id !== b.id) return false;
  
  // For Nostr events, compare the raw event content
  if (a.nostrEvent && b.nostrEvent) {
    return a.nostrEvent.content === b.nostrEvent.content;
  }
  
  // Basic comparison for other entities
  // This is a simple check and should be enhanced for specific entity types
  const aKeys = Object.keys(a).filter(k => !['source', 'nostrEvent'].includes(k));
  const bKeys = Object.keys(b).filter(k => !['source', 'nostrEvent'].includes(k));
  
  if (aKeys.length !== bKeys.length) return false;
  
  return aKeys.every(key => {
    // Skip certain fields
    if (['updatedAt', 'createdAt', 'version'].includes(key)) return true;
    
    return JSON.stringify(a[key]) === JSON.stringify(b[key]);
  });
}

// Workout-specific merge function
export function mergeWorkouts(
  local: Workout | null, 
  remote: Workout | null, 
  strategy: MergeStrategy = 'newest-wins'
): Workout | null {
  const result = mergeEntities(local, remote, strategy);
  
  if (!result.result || !result.conflict) {
    return result.result;
  }
  
  // If there's a conflict, we need to merge the workout details
  const base = result.winner === 'local' ? local! : remote!;
  const other = result.winner === 'local' ? remote! : local!;
  
  // Start with the winning workout
  const merged = { ...base };
  
  // Merge exercises (this would need a more sophisticated algorithm in practice)
  if (base.exercises && other.exercises) {
    // Simple approach: use exercises from winning workout
    // A more complex merge would match exercises by ID and merge their sets
    merged.exercises = base.exercises;
  }
  
  return merged;
}

// Exercise-specific merge
export function mergeExercises(
  local: Exercise | null, 
  remote: Exercise | null, 
  strategy: MergeStrategy = 'newest-wins'
): Exercise | null {
  return mergeEntities(local, remote, strategy).result;
}

// Template-specific merge
export function mergeTemplates(
  local: Template | null, 
  remote: Template | null, 
  strategy: MergeStrategy = 'newest-wins'
): Template | null {
  const result = mergeEntities(local, remote, strategy);
  
  if (!result.result || !result.conflict) {
    return result.result;
  }
  
  // If there's a conflict, we need to merge the template details
  const base = result.winner === 'local' ? local! : remote!;
  const other = result.winner === 'local' ? remote! : local!;
  
  // Start with the winning template
  const merged = { ...base };
  
  // Merge exercises (similar to workout merge)
  if (base.exercises && other.exercises) {
    merged.exercises = base.exercises;
  }
  
  return merged;
}
```

### Applying Conflict Resolution in Queries

```typescript
// Using conflict resolution in workout history query
export function useWorkoutHistoryWithConflictResolution(options = {}) {
  const { auth } = useAuthQuery();
  const { isOnline } = useConnectivityWithQuery();
  const isAuthenticated = auth?.status === 'authenticated';
  const pubkey = auth?.user?.pubkey;
  
  // State for tracking conflicts
  const [conflicts, setConflicts] = useState<{
    [id: string]: { local: Workout; remote: Workout; resolved: boolean }
  }>({});
  
  // Query for workout history
  const workoutHistoryQuery = useQuery({
    queryKey: QUERY_KEYS.workouts.history(pubkey || 'anonymous'),
    queryFn: async () => {
      // Get local workouts
      const localWorkouts = await WorkoutService.getWorkoutHistory();
      
      // If not authenticated or offline, return only local
      if (!isAuthenticated || !isOnline) {
        return localWorkouts;
      }
      
      try {
        // Get Nostr workouts
        const nostrWorkouts = await NostrWorkoutService.getWorkoutHistory(pubkey);
        
        // Create maps for efficient lookup
        const localWorkoutMap = Object.fromEntries(
          localWorkouts.map(w => [w.id, { ...w, source: 'local' }])
        );
        
        const remoteWorkoutMap = Object.fromEntries(
          nostrWorkouts.map(w => [w.id, { ...w, source: 'remote' }])
        );
        
        // Combine all workout IDs
        const allIds = [...new Set([
          ...Object.keys(localWorkoutMap),
          ...Object.keys(remoteWorkoutMap)
        ])];
        
        // Track new conflicts
        const newConflicts = {};
        
        // Merge workouts
        const mergedWorkouts = allIds.map(id => {
          const local = localWorkoutMap[id] || null;
          const remote = remoteWorkoutMap[id] || null;
          
          try {
            // Attempt to merge
            const merged = mergeWorkouts(local, remote);
            return merged;
          } catch (error) {
            if (error instanceof ConflictError) {
              // Store conflict for manual resolution
              newConflicts[id] = {
                local: error.local as Workout,
                remote: error.remote as Workout,
                resolved: false
              };
              
              // For now, return local version
              return local;
            }
            
            // For other errors, prefer local
            console.error(`Error merging workout ${id}:`, error);
            return local || remote;
          }
        }).filter(Boolean);
        
        // Update conflicts
        if (Object.keys(newConflicts).length > 0) {
          setConflicts(prev => ({
            ...prev,
            ...newConflicts
          }));
        }
        
        return mergedWorkouts;
      } catch (error) {
        console.error('Error fetching Nostr workouts:', error);
        return localWorkouts;
      }
    }
  });
  
  // Function to resolve a conflict manually
  const resolveConflict = useCallback((id: string, winner: 'local' | 'remote') => {
    const conflict = conflicts[id];
    if (!conflict) return;
    
    // Get the winning workout
    const workout = winner === 'local' ? conflict.local : conflict.remote;
    
    // Save the winning workout
    WorkoutService.saveWorkout(workout)
      .then(() => {
        // Mark conflict as resolved
        setConflicts(prev => ({
          ...prev,
          [id]: { ...prev[id], resolved: true }
        }));
        
        // Refetch workout history
        workoutHistoryQuery.refetch();
      })
      .catch(error => {
        console.error('Error resolving conflict:', error);
      });
  }, [conflicts, workoutHistoryQuery]);
  
  return {
    workouts: workoutHistoryQuery.data || [],
    isLoading: workoutHistoryQuery.isLoading,
    conflicts: Object.entries(conflicts)
      .filter(([_, conflict]) => !conflict.resolved)
      .map(([id, conflict]) => ({ id, ...conflict })),
    resolveConflict,
  };
}
```

## Implementation Roadmap

A phased approach to integrating React Query will help manage complexity and minimize disruption:

### Phase 1: Core Infrastructure (Weeks 1-2)

1. **Setup React Query Foundation**
   - Install React Query package
   - Create QueryClientProvider setup
   - Add basic error handling

2. **Authentication Integration**
   - Implement useAuthQuery hook
   - Create centralized authentication service
   - Update NDK signer integration

3. **Build Query Key Structure**
   - Establish query key naming conventions
   - Create query key utilities
   - Document key structure

### Phase 2: Social & Profile Features (Weeks 3-4)

1. **Profile Integration**
   - Move profile fetching to React Query
   - Implement caching for profile data
   - Fix profile-related hook ordering issues

2. **Social Feed Integration**
   - Convert useSocialFeed to React Query
   - Implement better cache management for feed data
   - Fix following feed issues

3. **Contact List Integration**
   - Update useContactList with React Query
   - Enhance contact synchronization
   - Fix contact-related hook ordering issues

### Phase 3: Workout & Exercise Features (Weeks 5-6)

1. **Exercise Library Integration**
   - Convert exercise library to React Query
   - Implement conflict resolution for exercises
   - Update exercise caching strategy

2. **Template Management**
   - Convert template hooks to React Query
   - Add conflict resolution for templates
   - Update template-related components

3. **Workout History Integration**
   - Update workout history with React Query
   - Implement workout conflict resolution
   - Enhance workout synchronization

### Phase 4: System-Wide Integration (Weeks 7-8)

1. **Publication Queue Enhancement**
   - Convert publication queue to React Query
   - Implement background processing
   - Add better retry strategies

2. **Offline Support Refinement**
   - Enhance connectivity monitoring
   - Add automatic synchronization
   - Improve error recovery

3. **Testing & Refinement**
   - Test authentication transitions
   - Verify offline behavior
   - Optimize performance

### Migration Approach

For each component being migrated:

1. Create new React Query hook alongside existing hook
2. Update component to use both hooks temporarily
3. Once the new hook is stable, remove the old hook
4. Fix any dependencies or issues

This allows for gradual transition with minimal disruption.

## API Reference

### Authentication Hooks

- `useAuthQuery()`: Primary hook for authentication state
- `useAmberSigner()`: Hook for Amber signer integration
- `useAuthStatus()`: Hook for checking authentication status

### Data Access Hooks

- `useSocialFeedWithQuery()`: Hook for social feed access
- `useWorkoutHistoryWithQuery()`: Hook for workout history
- `useExercisesWithQuery()`: Hook for exercise library
- `useTemplatesWithQuery()`: Hook for template management
- `usePOWRPacksWithQuery()`: Hook for POWR packs integration

### System Hooks

- `useConnectivityWithQuery()`: Hook for monitoring connectivity
- `usePublicationQueueWithQuery()`: Hook for publication queue
- `useRelaysWithQuery()`: Hook for relay management

### Utility Hooks

- `useOptimisticMutation()`: Helper for optimistic updates
- `useConflictResolution()`: Hook for managing conflicts
- `useAuthCompatibleQuery()`: Hook that's safe for auth state transitions

## Migration Guide

### Component Migration Example

#### Before:

```tsx
function FollowingScreen() {
  const { isAuthenticated, currentUser } = useNDKCurrentUser();
  
  // Only execute if authenticated
  const { contacts } = isAuthenticated 
    ? useContactList(currentUser?.pubkey) 
    : { contacts: [] };
  
  // Only execute if authenticated and has contacts
  const { 
    feedItems, 
    loading, 
    refresh 
  } = isAuthenticated && contacts.length > 0 
    ? useSocialFeed({ feedType: 'following', authors: contacts })
    : { feedItems: [], loading: false, refresh: () => Promise.resolve() };
  
  // Early return for unauthenticated state
  if (!isAuthenticated) {
    return <NostrLoginPrompt />;
  }
  
  return (
    <FlatList
      data={feedItems}
      // Other props
    />
  );
}
```

#### After:

```tsx
function FollowingScreen() {
  const { auth } = useAuthQuery();
  const isAuthenticated = auth?.status === 'authenticated';
  
  // Always execute, but parameters depend on auth state
  const { contacts } = useContactsWithQuery({
    pubkey: auth?.user?.pubkey || '',
    enabled: isAuthenticated
  });
  
  // Always execute, but parameters depend on auth state and contacts
  const { 
    feedItems, 
    isLoading, 
    refetch 
  } = useSocialFeedWithQuery({
    feedType: 'following',
    authors: contacts || [],
    enabled: isAuthenticated && (contacts?.length > 0)
  });
  
  // Render different UI based on state, but always call the same hooks
  if (!isAuthenticated) {
    return <NostrLoginPrompt />;
  }
  
  return (
    <FlatList
      data={feedItems}
      // Other props
    />
  );
}
```

### Best Practices

1. **Always call hooks in the same order**: Never conditionally call hooks
2. **Use the `enabled` parameter**: Control when queries execute
3. **Provide fallback data**: Use `placeholderData` for consistent UI
4. **Handle authentication in query functions**: Not in component conditionals
5. **Use QueryErrorBoundary**: Wrap components for clean error handling
6. **Standardize error handling**: Use the NDKErrors system
7. **Implement optimistic updates**: For better user experience
8. **Cache invalidation**: Properly invalidate dependent queries
9. **Prefer mutation for state changes**: Use mutations for all data modifications

By following these guidelines, we can ensure a smooth migration to React Query while fixing the critical issues in our current authentication system.
