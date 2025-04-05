import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';
import NDK, { NDKUser } from '@nostr-dev-kit/ndk-mobile';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { AuthService } from '@/lib/auth/AuthService';
import { useNDK } from './useNDK';
import { Platform } from 'react-native';
import { AuthMethod } from '@/lib/auth/types';
import { createLogger } from '@/lib/utils/logger';

// Create auth-specific logger
const logger = createLogger('useAuthQuery');

/**
 * Authentication state type
 */
export type AuthState =
  | {
      status: 'loading';
    }
  | {
      status: 'authenticated';
      user: NDKUser;
      method: AuthMethod;
    }
  | {
      status: 'unauthenticated';
    };

/**
 * Login parameters
 */
export type LoginParams =
  | {
      method: 'private_key';
      privateKey: string;
    }
  | {
      method: 'amber';
    }
  | {
      method: 'ephemeral';
    };

/**
 * useAuthQuery Hook - Enhanced with better persistence and error handling
 * 
 * React Query-based hook for managing authentication state.
 * Provides queries and mutations for working with user authentication.
 * 
 * Features:
 * - Authentication state management
 * - Login with different methods (private key, Amber, ephemeral)
 * - Logout functionality
 * - Automatic revalidation of auth state
 * - Improved persistence across app restarts
 */
export function useAuthQuery() {
  const queryClient = useQueryClient();
  const { ndk } = useNDK();
  
  // Track initialization state
  const initializationRef = useRef<{
    isInitializing: boolean;
    initialized: boolean;
    error: Error | null;
  }>({
    isInitializing: false,
    initialized: false,
    error: null
  });
  
  // Track auth service instance
  const authServiceRef = useRef<AuthService | null>(null);
  
  // Create auth service (or a stub if NDK isn't ready)
  const authService = useMemo(() => {
    if (!ndk) {
      // Return a placeholder that returns unauthenticated state
      // This prevents errors when NDK is still initializing
      logger.info("NDK not available yet, using placeholder auth service");
      // Create a placeholder with just the methods we need for the query function
      const placeholderService = {
        initialize: async () => {},
        loginWithPrivateKey: async () => { throw new Error('NDK not initialized'); },
        loginWithAmber: async () => { throw new Error('NDK not initialized'); },
        createEphemeralKey: async () => { throw new Error('NDK not initialized'); },
        logout: async () => {},
        getCurrentAuthMethod: async () => undefined,
      };
      
      // Use a type assertion to bypass TypeScript's type checking
      // This is safe because we only use a subset of the methods in this hook
      return placeholderService as unknown as AuthService;
    }
    
    logger.info("Creating AuthService with NDK instance");
    const service = new AuthService(ndk);
    authServiceRef.current = service;
    return service;
  }, [ndk]);

  // Pre-initialize auth service when it changes
  useEffect(() => {
    const initRef = initializationRef.current;
    
    if (!authService || initRef.isInitializing || initRef.initialized) {
      return;
    }
    
    const initialize = async () => {
      initRef.isInitializing = true;
      try {
        logger.info("Pre-initializing auth service");
        await authService.initialize();
        initRef.initialized = true;
        initRef.error = null;
        
        // Force refetch of auth state 
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.current() });
        
        logger.info("Auth service pre-initialization complete");
      } catch (error) {
        logger.error("Auth service pre-initialization failed:", error);
        initRef.error = error as Error;
      } finally {
        initRef.isInitializing = false;
      }
    };
    
    initialize();
  }, [authService, queryClient]);

  // Query to get current auth state - enhanced with better error handling and retry
  const authQuery: UseQueryResult<AuthState> = useQuery({
    queryKey: QUERY_KEYS.auth.current(),
    queryFn: async (): Promise<AuthState> => {
      logger.debug("Running auth query function");
      
      if (!ndk) {
        logger.debug("No NDK instance, returning unauthenticated");
        return { status: 'unauthenticated' };
      }

      try {
        // Initialize auth service (will be fast if already initialized)
        logger.debug("Initializing auth service in query function");
        await authService.initialize();
        
        // Check if user is authenticated
        if (ndk.activeUser) {
          logger.info("NDK has active user:", ndk.activeUser.pubkey);
          const method = await authService.getCurrentAuthMethod();
          return {
            status: 'authenticated',
            user: ndk.activeUser,
            method: method || 'private_key',
          };
        }
        
        logger.debug("No active user, returning unauthenticated");
        return { status: 'unauthenticated' };
      } catch (error) {
        logger.error("Error getting auth state:", error);
        return { status: 'unauthenticated' };
      }
    },
    // Adjusted query settings for better reliability
    staleTime: 10 * 60 * 1000, // 10 minutes - don't refetch too often
    refetchOnWindowFocus: true, // Refresh when app comes to foreground
    refetchOnMount: true,
    refetchOnReconnect: true, // Refresh when network reconnects
    retry: 2, // Retry a couple times if fails
    refetchInterval: false, // Don't auto-refresh continuously
  });

  // Login mutation - with better success handling
  const loginMutation = useMutation<NDKUser, Error, LoginParams>({
    mutationFn: async (params: LoginParams): Promise<NDKUser> => {
      if (!ndk) {
        logger.error("Login attempted without NDK instance");
        throw new Error('NDK instance is required for login');
      }
      
      logger.info(`Attempting login with method: ${params.method}`);
      
      switch (params.method) {
        case 'private_key':
          return authService.loginWithPrivateKey(params.privateKey);
        case 'amber':
          if (Platform.OS !== 'android') {
            logger.error("Amber login attempted on non-Android platform");
            throw new Error('Amber login is only available on Android');
          }
          return authService.loginWithAmber();
        case 'ephemeral':
          return authService.createEphemeralKey();
        default:
          logger.error("Invalid login method:", params.method);
          throw new Error('Invalid login method');
      }
    },
    onSuccess: async (user, variables) => {
      logger.info("Login successful, updating auth state");
      
      // Get the method from the variables and use type assertion since TS is having trouble
      const method = (variables as LoginParams).method;
      
      // Update auth state after successful login
      queryClient.setQueryData<AuthState>(QUERY_KEYS.auth.current(), {
        status: 'authenticated',
        user,
        method,
      });
      
      // Force update all auth-dependent queries
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.all });
      
      // Also mark initialization as complete
      initializationRef.current.initialized = true;
      initializationRef.current.error = null;
    },
    onError: (error) => {
      logger.error("Login error:", error);
      // Clear any partial auth data on failure
      queryClient.setQueryData<AuthState>(QUERY_KEYS.auth.current(), {
        status: 'unauthenticated',
      });
    },
  });

  // Logout mutation - with better error handling
  const logoutMutation: UseMutationResult<void, Error, void> = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!ndk) {
        logger.error("Logout attempted without NDK instance");
        throw new Error('NDK instance is required for logout');
      }
      
      logger.info("Performing logout");
      await authService.logout();
    },
    onSuccess: async () => {
      logger.info("Logout successful, resetting auth state");
      
      // Set auth state to unauthenticated after successful logout
      queryClient.setQueryData<AuthState>(QUERY_KEYS.auth.current(), {
        status: 'unauthenticated',
      });
      
      // Reset any queries that depend on authentication
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      logger.error("Logout error:", error);
      
      // Try to reset auth state even on error
      try {
        queryClient.setQueryData<AuthState>(QUERY_KEYS.auth.current(), {
          status: 'unauthenticated',
        });
        queryClient.invalidateQueries();
      } catch (e) {
        logger.error("Failed to reset auth state after logout error:", e);
      }
    },
  });

  // Login function
  const login = useCallback(
    (params: LoginParams) => {
      logger.info(`Login requested with method: ${params.method}`);
      return loginMutation.mutateAsync(params);
    },
    [loginMutation]
  );

  // Logout function
  const logout = useCallback(() => {
    logger.info("Logout requested");
    return logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Derived state
  const auth = authQuery.data;
  const isLoading = authQuery.isLoading;
  const isAuthenticated = auth?.status === 'authenticated';
  const user = isAuthenticated ? auth.user : undefined;
  const isAuthenticating = loginMutation.isPending;

  return {
    // State
    auth,
    isLoading,
    isAuthenticated,
    user,
    
    // Actions
    login,
    logout,
    isAuthenticating,
    
    // Raw query/mutation objects for advanced use
    authQuery,
    loginMutation,
    logoutMutation,
  };
}
