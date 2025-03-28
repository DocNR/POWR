// lib/hooks/useProfileStats.ts
import { useState, useEffect, useCallback } from 'react';
import { nostrBandService, ProfileStats } from '@/lib/services/NostrBandService';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';

interface UseProfileStatsOptions {
  pubkey?: string;
  refreshInterval?: number; // in milliseconds
}

/**
 * Hook to fetch profile statistics from nostr.band API
 * Provides follower/following counts and other statistics
 */
export function useProfileStats(options: UseProfileStatsOptions = {}) {
  const { currentUser } = useNDKCurrentUser();
  const { 
    pubkey: optionsPubkey, 
    refreshInterval = 0 // default to no auto-refresh
  } = options;
  
  // Use provided pubkey or fall back to current user's pubkey
  const pubkey = optionsPubkey || currentUser?.pubkey;
  
  const [stats, setStats] = useState<ProfileStats>({
    pubkey: pubkey || '',
    followersCount: 0,
    followingCount: 0,
    isLoading: false,
    error: null
  });
  
  const [lastRefreshed, setLastRefreshed] = useState<number>(0);
  
  // Function to fetch profile stats
  const fetchStats = useCallback(async () => {
    if (!pubkey) return;
    
    setStats(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const profileStats = await nostrBandService.fetchProfileStats(pubkey);
      setStats({
        ...profileStats,
        isLoading: false
      });
      setLastRefreshed(Date.now());
    } catch (error) {
      console.error('Error in useProfileStats:', error);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Unknown error')
      }));
    }
  }, [pubkey]);
  
  // Initial fetch
  useEffect(() => {
    if (pubkey) {
      fetchStats();
    }
  }, [pubkey, fetchStats]);
  
  // Set up refresh interval if specified
  useEffect(() => {
    if (refreshInterval > 0 && pubkey) {
      const intervalId = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, pubkey, fetchStats]);
  
  // Return stats and helper functions
  return {
    ...stats,
    refresh: fetchStats,
    lastRefreshed
  };
}
