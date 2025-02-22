// lib/hooks/useNDK.ts
import { useEffect } from 'react';
import { useNDKStore } from '../stores/ndk';
import type { NDKUser } from '@nostr-dev-kit/ndk';

export function useNDK() {
  const { ndk, isLoading, init } = useNDKStore();
  
  useEffect(() => {
    if (!ndk && !isLoading) {
      init();
    }
  }, [ndk, isLoading, init]);
  
  return { ndk, isLoading };
}

export function useNDKCurrentUser(): { 
  currentUser: NDKUser | null;
  isAuthenticated: boolean;
  isLoading: boolean; 
} {
  const { currentUser, isAuthenticated, isLoading } = useNDKStore();
  
  return { 
    currentUser, 
    isAuthenticated,
    isLoading 
  };
}

export function useNDKAuth() {
  const { login, logout, isAuthenticated, isLoading } = useNDKStore();
  
  return {
    login,
    logout,
    isAuthenticated,
    isLoading
  };
}