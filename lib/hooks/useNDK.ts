// lib/hooks/useNDK.ts
import { useEffect } from 'react';
import { useNDKStore } from '@/lib/stores/ndk';
import type { NDKUser, NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk-mobile';

// Core hook for NDK access
export function useNDK() {
  const { ndk, isLoading, error, init } = useNDKStore(state => ({
    ndk: state.ndk,
    isLoading: state.isLoading,
    error: state.error,
    init: state.init
  }));
  
  useEffect(() => {
    if (!ndk && !isLoading) {
      init();
    }
  }, [ndk, isLoading, init]);
  
  return { ndk, isLoading, error };
}

// Hook for current user info
export function useNDKCurrentUser() {
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

// Hook for authentication actions
export function useNDKAuth() {
  const { 
    login, 
    loginWithExternalSigner, 
    logout, 
    generateKeys, 
    isAuthenticated, 
    isLoading 
  } = useNDKStore(state => ({
    login: state.login,
    loginWithExternalSigner: state.loginWithExternalSigner,
    logout: state.logout,
    generateKeys: state.generateKeys,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading
  }));
  
  return {
    login,
    loginWithExternalSigner,
    logout,
    generateKeys,
    isAuthenticated,
    isLoading
  };
}

// New hook for event operations
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
