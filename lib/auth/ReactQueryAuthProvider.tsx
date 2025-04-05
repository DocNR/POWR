import React, { ReactNode, useEffect, useState, createContext, useMemo, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../queryClient';
import NDK from '@nostr-dev-kit/ndk-mobile';
import { initializeNDK } from '@/lib/initNDK';
import { createLogger } from '@/lib/utils/logger';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from './constants';  

// Create auth-specific logger
const logger = createLogger('ReactQueryAuthProvider');

// Create context for NDK instance
export const NDKContext = createContext<{ ndk: NDK | null; isInitialized: boolean }>({
  ndk: null,
  isInitialized: false,
});

interface ReactQueryAuthProviderProps {
  children: ReactNode;
  enableOfflineMode?: boolean;
  queryClient?: QueryClient;
  enableNDK?: boolean; // New prop to control NDK initialization
}

/**
 * ReactQueryAuthProvider - Enhanced with persistence support
 * 
 * Main provider component for React Query integration with authentication.
 * This component:
 * - Creates and configures the QueryClient
 * - Creates an NDK instance with proper credential restoration
 * - Provides React Query context and NDK context
 * - Ensures consistent hook ordering regardless of initialization state
 */
export function ReactQueryAuthProvider({
  children,
  enableOfflineMode = true,
  queryClient: customQueryClient,
  enableNDK = true, // Default to true for backward compatibility
}: ReactQueryAuthProviderProps) {
  // Create Query Client if not provided (always created)
  const queryClient = useMemo(() => customQueryClient ?? createQueryClient(), [customQueryClient]);
  
  // NDK state - but we ALWAYS render regardless of state
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track initialization attempts
  const initAttemptRef = useRef(0);
  
  // NDK context value (memoized to prevent unnecessary re-renders)
  const ndkContextValue = useMemo(() => ({ 
    ndk, 
    isInitialized 
  }), [ndk, isInitialized]);

  // Enhanced initialization with credential checking
  useEffect(() => {
    // Skip NDK initialization if enableNDK is false
    if (!enableNDK) {
      logger.info("NDK initialization skipped (enableNDK=false)");
      setIsInitialized(true); // Still mark as initialized so the app can proceed
      return;
    }
    
    // Track this initialization attempt
    const currentAttempt = ++initAttemptRef.current;
    
    const initNDK = async () => {
      try {
        logger.info(`Initializing NDK (attempt ${currentAttempt})...`);
        
        // Pre-check for credentials to improve logging - using constants for key names
        const hasPrivateKey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
        const hasExternalSigner = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
        
        logger.debug("Auth credentials status:", { 
          hasPrivateKey: !!hasPrivateKey, 
          hasExternalSigner: !!hasExternalSigner 
        });
        
        // Initialize NDK with context name
        const result = await initializeNDK('react-query');
        
        // Update state only if this is still the most recent initialization attempt
        if (currentAttempt === initAttemptRef.current) {
          setNdk(result.ndk);
          setIsInitialized(true);
          logger.info("NDK initialized successfully");
          
          // Force refetch auth state to ensure it's up to date
          queryClient.invalidateQueries({ queryKey: ['auth', 'current'] });
        }
      } catch (err) {
        logger.error("Error initializing NDK:", err);
        // Still mark as initialized so the app can handle the error state
        if (currentAttempt === initAttemptRef.current) {
          setIsInitialized(true);
        }
      }
    };
    
    initNDK();
  }, [enableOfflineMode, enableNDK, queryClient]);

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
