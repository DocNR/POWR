// lib/hooks/useProfile.ts
import { useState, useEffect, useRef } from 'react';
import { NDKUser, NDKUserProfile } from '@nostr-dev-kit/ndk-mobile';
import { useNDK } from './useNDK';

export function useProfile(pubkey: string | undefined) {
  const { ndk } = useNDK();
  const [profile, setProfile] = useState<NDKUserProfile | null>(null);
  const [user, setUser] = useState<NDKUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Reference to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Reset mounted ref when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (!ndk || !pubkey) {
      setIsLoading(false);
      return;
    }
    
    let isEffectActive = true;
    
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
        
        // Only update state if component is still mounted and effect is active
        if (isMountedRef.current && isEffectActive) {
          setUser(ndkUser);
          setProfile(ndkUser.profile || null);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        // Only update state if component is still mounted and effect is active
        if (isMountedRef.current && isEffectActive) {
          setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
          setIsLoading(false);
        }
      }
    };
    
    fetchProfile();
    
    // Cleanup function to prevent state updates if the effect is cleaned up
    return () => {
      isEffectActive = false;
    };
  }, [ndk, pubkey]);
  
  const refreshProfile = async () => {
    if (!ndk || !pubkey || !isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const ndkUser = ndk.getUser({ pubkey });
      await ndkUser.fetchProfile();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setUser(ndkUser);
        setProfile(ndkUser.profile || null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to refresh profile'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
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