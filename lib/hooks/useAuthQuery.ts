import { useCallback, useMemo, useContext } from 'react';
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
import { NDKContext } from '@/lib/auth/ReactQueryAuthProvider';

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
 * useAuthQuery Hook
 * 
 * React Query-based hook for managing authentication state.
 * Provides queries and mutations for working with user authentication.
 * 
 * Features:
 * - Authentication state management
 * - Login with different methods (private key, Amber, ephemeral)
 * - Logout functionality
 * - Automatic revalidation of auth state
 */
export function useAuthQuery() {
  const queryClient = useQueryClient();
  const { ndk } = useNDK();
  
  // Create auth service (or a stub if NDK isn't ready)
  const authService = useMemo(() => {
    if (!ndk) {
      // Return a placeholder that returns unauthenticated state
      // This prevents errors when NDK is still initializing
      console.log('[useAuthQuery] NDK not available yet, using placeholder auth service');
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
    
    return new AuthService(ndk);
  }, [ndk]);

  // Query to get current auth state
  const authQuery: UseQueryResult<AuthState> = useQuery({
    queryKey: QUERY_KEYS.auth.current(),
    queryFn: async (): Promise<AuthState> => {
      if (!ndk) {
        return { status: 'unauthenticated' };
      }

      try {
        // Initialize auth service
        await authService.initialize();
        
        // Check if user is authenticated
        if (ndk.activeUser) {
          const method = await authService.getCurrentAuthMethod();
          return {
            status: 'authenticated',
            user: ndk.activeUser,
            method: method || 'private_key',
          };
        }
        
        return { status: 'unauthenticated' };
      } catch (error) {
        console.error('[useAuthQuery] Error getting auth state:', error);
        return { status: 'unauthenticated' };
      }
    },
    staleTime: Infinity, // Auth state doesn't go stale by itself
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: false,
  });

  // Login mutation
  const loginMutation: UseMutationResult<NDKUser, Error, LoginParams> = useMutation({
    mutationFn: async (params: LoginParams): Promise<NDKUser> => {
      if (!ndk) {
        throw new Error('NDK instance is required for login');
      }
      
      switch (params.method) {
        case 'private_key':
          return authService.loginWithPrivateKey(params.privateKey);
        case 'amber':
          if (Platform.OS !== 'android') {
            throw new Error('Amber login is only available on Android');
          }
          return authService.loginWithAmber();
        case 'ephemeral':
          return authService.createEphemeralKey();
        default:
          throw new Error('Invalid login method');
      }
    },
    onSuccess: async (user, variables) => {
      // Update auth state after successful login
      queryClient.setQueryData<AuthState>(QUERY_KEYS.auth.current(), {
        status: 'authenticated',
        user,
        method: variables.method,
      });
      
      // Invalidate any queries that depend on authentication
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.all });
    },
    onError: (error) => {
      console.error('[useAuthQuery] Login error:', error);
    },
  });

  // Logout mutation
  const logoutMutation: UseMutationResult<void, Error, void> = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!ndk) {
        throw new Error('NDK instance is required for logout');
      }
      
      await authService.logout();
    },
    onSuccess: async () => {
      // Set auth state to unauthenticated after successful logout
      queryClient.setQueryData<AuthState>(QUERY_KEYS.auth.current(), {
        status: 'unauthenticated',
      });
      
      // Reset any queries that depend on authentication
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('[useAuthQuery] Logout error:', error);
    },
  });

  // Login function
  const login = useCallback(
    (params: LoginParams) => {
      return loginMutation.mutateAsync(params);
    },
    [loginMutation]
  );

  // Logout function
  const logout = useCallback(() => {
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
