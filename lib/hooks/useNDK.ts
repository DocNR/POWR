// lib/hooks/useNDK.ts
import { useEffect } from 'react';
import { useNDKStore } from '@/lib/stores/ndk';
import type { NDKUser } from '@nostr-dev-kit/ndk';

/**
 * Hook to access NDK instance and initialization status
 */
export function useNDK() {
  const { ndk, isLoading, error, init, relayStatus } = useNDKStore(state => ({
    ndk: state.ndk,
    isLoading: state.isLoading,
    error: state.error,
    init: state.init,
    relayStatus: state.relayStatus
  }));
  
  useEffect(() => {
    if (!ndk && !isLoading) {
      init();
    }
  }, [ndk, isLoading, init]);
  
  return { 
    ndk, 
    isLoading, 
    error,
    relayStatus
  };
}

/**
 * Hook to access current NDK user information
 */
export function useNDKCurrentUser(): { 
  currentUser: NDKUser | null;
  isAuthenticated: boolean;
  isLoading: boolean; 
} {
  const { currentUser, isAuthenticated, isLoading } = useNDKStore(state => ({
    currentUser: state.currentUser,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading
  }));
  
  return { 
    currentUser, 
    isAuthenticated,
    isLoading 
  };
}

/**
 * Hook to access NDK authentication methods
 */
export function useNDKAuth() {
  const { login, logout, isAuthenticated, isLoading, generateKeys } = useNDKStore(state => ({
    login: state.login,
    logout: state.logout,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    generateKeys: state.generateKeys
  }));
  
  return {
    login,
    logout,
    generateKeys,
    isAuthenticated,
    isLoading
  };
}

/**
 * Hook for direct access to Nostr event actions
 */
export function useNDKEvents() {
  const { publishEvent, fetchEventsByFilter } = useNDKStore(state => ({
    publishEvent: state.publishEvent,
    fetchEventsByFilter: state.fetchEventsByFilter
  }));
  
  return {
    publishEvent,
    fetchEventsByFilter
  };
}