// lib/hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { NDKUser, NDKUserProfile } from '@nostr-dev-kit/ndk-mobile';
import { useNDK } from './useNDK';

export function useProfile(pubkey: string | undefined) {
  const { ndk } = useNDK();
  const [profile, setProfile] = useState<NDKUserProfile | null>(null);
  const [user, setUser] = useState<NDKUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!ndk || !pubkey) {
      setIsLoading(false);
      return;
    }
    
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Create NDK user
        const ndkUser = ndk.getUser({ pubkey });
        
        // Fetch profile
        await ndkUser.fetchProfile();
        
        // Normalize profile data, similar to your current implementation
        if (ndkUser.profile) {
          // Ensure image property exists (some clients use picture instead)
          if (!ndkUser.profile.image && (ndkUser.profile as any).picture) {
            ndkUser.profile.image = (ndkUser.profile as any).picture;
          }
        }
        
        setUser(ndkUser);
        setProfile(ndkUser.profile || null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [ndk, pubkey]);
  
  const refreshProfile = async () => {
    if (!ndk || !pubkey) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const ndkUser = ndk.getUser({ pubkey });
      await ndkUser.fetchProfile();
      
      setUser(ndkUser);
      setProfile(ndkUser.profile || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh profile'));
    } finally {
      setIsLoading(false);
    }
  };
  
  return { 
    profile, 
    user, 
    isLoading, 
    error,
    refreshProfile
  };
}