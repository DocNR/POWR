import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';

/**
 * Connection state type
 */
export type ConnectionState = {
  isOnline: boolean;
  type: string;
  lastUpdated: number;
};

/**
 * useConnectivityWithQuery Hook
 * 
 * React Query-based hook for monitoring network connectivity status.
 * 
 * Features:
 * - Real-time monitoring of online/offline status
 * - Connection type information
 * - Consistent state across the app
 * - Automatic event subscription and cleanup
 */
export function useConnectivityWithQuery() {
  const queryClient = useQueryClient();
  const connectivityService = ConnectivityService.getInstance();
  
  // Query for network status
  const { data: connectionState, ...rest } = useQuery({
    queryKey: QUERY_KEYS.system.connectivity(),
    queryFn: async (): Promise<ConnectionState> => {
      const netInfo = await NetInfo.fetch();
      const isOnline = netInfo.isConnected ?? false;
      
      return {
        isOnline,
        type: netInfo.type,
        lastUpdated: Date.now()
      };
    },
    // Never consider connectivity stale
    staleTime: Infinity,
    // Don't refetch on window focus, we'll handle updates via listeners
    refetchOnWindowFocus: false,
  });
  
  // Subscribe to network status changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isOnline = state.isConnected ?? false;
      
      // Update query data
      queryClient.setQueryData<ConnectionState>(
        QUERY_KEYS.system.connectivity(), 
        {
          isOnline,
          type: state.type,
          lastUpdated: Date.now()
        }
      );
      
      // Update connectivity service offline mode (inverse of isOnline)
      connectivityService.setOfflineMode(!isOnline);
      
      // If we're going online, invalidate queries that need fresh data
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.relays.status() });
      }
    });
    
    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, [queryClient, connectivityService]);
  
  // Default to offline if no data is available yet
  const defaultState: ConnectionState = {
    isOnline: false,
    type: 'unknown',
    lastUpdated: Date.now()
  };
  
  // Return connection state and additional query information
  return {
    ...connectionState || defaultState,
    ...rest
  };
}
