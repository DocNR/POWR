import React, { ReactNode, useEffect, useState, createContext, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../queryClient';
import NDK from '@nostr-dev-kit/ndk-mobile';
import { initializeNDK } from '@/lib/initNDK';

// Create context for NDK instance
export const NDKContext = createContext<{ ndk: NDK | null; isInitialized: boolean }>({
  ndk: null,
  isInitialized: false,
});

interface ReactQueryAuthProviderProps {
  children: ReactNode;
  enableOfflineMode?: boolean;
  queryClient?: QueryClient;
}

/**
 * ReactQueryAuthProvider
 * 
 * Main provider component for React Query integration with authentication.
 * This component:
 * - Creates and configures the QueryClient
 * - Creates an NDK instance
 * - Provides React Query context and NDK context
 * - Ensures consistent hook ordering regardless of initialization state
 */
export function ReactQueryAuthProvider({
  children,
  enableOfflineMode = true,
  queryClient: customQueryClient,
}: ReactQueryAuthProviderProps) {
  // Create Query Client if not provided (always created)
  const queryClient = useMemo(() => customQueryClient ?? createQueryClient(), [customQueryClient]);
  
  // NDK state - but we ALWAYS render regardless of state
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // NDK context value (memoized to prevent unnecessary re-renders)
  const ndkContextValue = useMemo(() => ({ 
    ndk, 
    isInitialized 
  }), [ndk, isInitialized]);

  // Initialize NDK
  useEffect(() => {
    const initNDK = async () => {
      try {
        console.log('[ReactQueryAuthProvider] Initializing NDK...');
        const result = await initializeNDK();
        setNdk(result.ndk);
        setIsInitialized(true);
        console.log('[ReactQueryAuthProvider] NDK initialized successfully');
      } catch (err) {
        console.error('[ReactQueryAuthProvider] Error initializing NDK:', err);
        // Still mark as initialized so the app can handle the error state
        setIsInitialized(true);
      }
    };
    
    initNDK();
  }, [enableOfflineMode]);

  // Always render children, regardless of NDK initialization status
  // This ensures consistent hook ordering in child components
  return (
    <QueryClientProvider client={queryClient}>
      <NDKContext.Provider value={ndkContextValue}>
        {children}
      </NDKContext.Provider>
    </QueryClientProvider>
  );
}

/**
 * Example usage in app/_layout.tsx:
 * 
 * ```tsx
 * import { ReactQueryAuthProvider } from '@/lib/auth/ReactQueryAuthProvider';
 * 
 * export default function RootLayout() {
 *   return (
 *     <ReactQueryAuthProvider>
 *       <Stack />
 *     </ReactQueryAuthProvider>
 *   );
 * }
 * ```
 */
