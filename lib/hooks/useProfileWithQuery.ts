import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { useAuthQuery } from './useAuthQuery';
import NDK, { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk-mobile';

interface ProfileData {
  profile?: {
    displayName?: string;
    name?: string;
    about?: string;
    website?: string;
    picture?: string;
    banner?: string;
    nip05?: string;
    lud16?: string;
  };
  pubkey: string;
  raw?: NDKEvent;
  lastUpdated?: number;
}

interface ProfileUpdateParams {
  displayName?: string;
  name?: string;
  about?: string;
  website?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string;
}

/**
 * useProfileWithQuery Hook
 * 
 * React Query-based hook for fetching and updating user profiles
 * 
 * Features:
 * - Fetch profile data for the authenticated user or any pubkey
 * - Update the user's profile
 * - Optimistic updates
 * - Automatic revalidation
 */
export function useProfileWithQuery(pubkey?: string) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthQuery();
  
  // Use the provided pubkey, or the authenticated user's pubkey if not provided
  const targetPubkey = pubkey || user?.pubkey;
  const isSelf = isAuthenticated && user?.pubkey === targetPubkey;
  
  // No pubkey available - return placeholder state
  if (!targetPubkey) {
    return {
      profile: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      isUpdating: false,
      updateProfile: async () => {
        throw new Error('Cannot update profile without a pubkey');
      },
    };
  }
  
  // Query for profile data
  const { 
    data: profile,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: QUERY_KEYS.auth.profile(targetPubkey),
    queryFn: async (): Promise<ProfileData> => {
      // Basic implementation - in reality, this would fetch from NDK and SQLite
      return {
        pubkey: targetPubkey,
        profile: {
          displayName: targetPubkey.slice(0, 8),
          about: 'Profile fetched with React Query',
        },
        lastUpdated: Date.now(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!targetPubkey,
  });
  
  // Mutation for updating profile
  const { mutateAsync, isPending: isUpdating } = useMutation({
    mutationFn: async (params: ProfileUpdateParams): Promise<ProfileData> => {
      if (!isSelf) {
        throw new Error('Cannot update profile of another user');
      }
      
      // In a real implementation, this would create and publish a kind 0 event
      console.log('[useProfileWithQuery] Updating profile:', params);
      
      // Return the updated profile (optimistically)
      return {
        pubkey: targetPubkey,
        profile: {
          ...profile?.profile,
          ...params,
        },
        lastUpdated: Date.now(),
      };
    },
    onSuccess: (data) => {
      // Update the profile in the cache
      queryClient.setQueryData(
        QUERY_KEYS.auth.profile(targetPubkey),
        data
      );
    },
  });
  
  // Update profile function
  const updateProfile = useCallback(
    async (params: ProfileUpdateParams) => {
      if (!isSelf) {
        throw new Error('Cannot update profile of another user');
      }
      
      return await mutateAsync(params);
    },
    [isSelf, mutateAsync]
  );
  
  return {
    profile,
    isLoading,
    isError,
    error,
    isUpdating,
    updateProfile,
    refetch,
  };
}
