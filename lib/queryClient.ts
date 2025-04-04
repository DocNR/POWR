import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

/**
 * Creates and configures a React Query client with optimal settings.
 * 
 * @returns Configured QueryClient instance
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache time = 1 hour (data kept in memory)
        gcTime: 60 * 60 * 1000,
        
        // Stale time = 30 seconds (before background refetch)
        staleTime: 30 * 1000,
        
        // Retry failed queries 3 times with exponential backoff
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(
          1000 * 2 ** attemptIndex, 
          30000
        ),
        
        // Don't refetch on window focus in app (native behavior)
        refetchOnWindowFocus: Platform.OS === 'web',
        
        // Refetch when gaining connectivity
        refetchOnReconnect: true,
        
        // Disable automatic refetching when a query mount is happening
        // This prevents excessive data fetching during navigation
        refetchOnMount: false,
      },
      mutations: {
        // Retry failed mutations 2 times
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(
          1000 * 2 ** attemptIndex, 
          10000
        ),
      },
    },
  });
}

/**
 * Function to update an item in a list by ID
 * Utility for optimistic updates in React Query
 */
export function updateItemInList<T extends { id: string }>(
  oldData: T[] | undefined, 
  updatedItem: T
): T[] {
  if (!oldData) return [updatedItem];
  
  return oldData.map(item => 
    item.id === updatedItem.id ? updatedItem : item
  );
}

/**
 * Function to remove an item from a list by ID
 * Utility for optimistic updates in React Query
 */
export function removeItemFromList<T extends { id: string }>(
  oldData: T[] | undefined, 
  idToRemove: string
): T[] {
  if (!oldData) return [];
  
  return oldData.filter(item => item.id !== idToRemove);
}

/**
 * Function to add an item to a list
 * Utility for optimistic updates in React Query
 */
export function addItemToList<T>(
  oldData: T[] | undefined, 
  newItem: T,
  prepend = true
): T[] {
  if (!oldData) return [newItem];
  
  return prepend 
    ? [newItem, ...oldData] 
    : [...oldData, newItem];
}
