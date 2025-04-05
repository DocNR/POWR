// lib/hooks/useProfilePageData.tsx
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { useProfileStats } from '@/lib/hooks/useProfileStats';
import { useBannerImage } from '@/lib/hooks/useBannerImage';
import { useSocialFeed } from '@/lib/hooks/useSocialFeed';
import type { AnyFeedEntry, WorkoutFeedEntry, SocialFeedEntry, TemplateFeedEntry, ExerciseFeedEntry, ArticleFeedEntry } from '@/types/feed';

// Helper function to convert feed entries for social posts component
export function convertToLegacyFeedItem(entry: AnyFeedEntry) {
  return {
    id: entry.eventId,
    type: entry.type,
    originalEvent: entry.event!,
    parsedContent: entry.content!,
    createdAt: (entry.timestamp || Date.now()) / 1000
  };
}

// Define possible render states
type RenderState = 'login' | 'loading' | 'content' | 'error';

/**
 * Custom hook for managing profile page data and state
 * Centralizes all data fetching logic in one place
 */
export function useProfilePageData() {
  // Authentication state (always call this hook)
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  
  // Initialize all state hooks at the top
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [entries, setEntries] = useState<AnyFeedEntry[]>([]);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  // Current pubkey (or empty string if not authenticated)
  const pubkey = currentUser?.pubkey || '';
  
  // Always call all hooks regardless of auth state
  // For unauthorized state, we pass empty pubkey or arrays
  
  // Profile stats (with empty pubkey fallback)
  const stats = useProfileStats({ 
    pubkey, 
    refreshInterval: 10000 
  });
  
  // Banner image (with empty pubkey fallback)
  const defaultBannerUrl = currentUser?.profile?.banner ||
                         (currentUser?.profile as any)?.background;
  
  const { data: bannerImageUrl, refetch: refetchBanner } = useBannerImage(
    pubkey,
    defaultBannerUrl
  );
  
  // Social feed (with empty authors array fallback for unauthenticated state)
  const socialFeed = useSocialFeed({
    feedType: 'profile',
    authors: isAuthenticated && pubkey ? [pubkey] : [],
    limit: 30
  });
  
  // Extract values from socialFeed with fallbacks
  const loading = socialFeed?.loading || feedLoading;
  const refresh = socialFeed?.refresh || (() => Promise.resolve());
  
  // Performance optimization: Start loading data immediately without waiting for full load
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let progressTimerId: NodeJS.Timeout | null = null;
    let ultraEarlyTimerId: NodeJS.Timeout | null = null;
    
    if (isAuthenticated && loading) {
      // Ultra-early timeout - show content after just 500ms if we have ANY data at all
      ultraEarlyTimerId = setTimeout(() => {
        if (entries.length > 0 || stats.followersCount > 0 || stats.followingCount > 0) {
          console.log(`[${Platform.OS}] Ultra-early content display with partial data`);
          setFeedLoading(false);
        }
      }, 500);
      
      // Very early timeout - after 1s, force content to display if we have any data
      progressTimerId = setTimeout(() => {
        console.log(`[${Platform.OS}] Early timeout: Forcing content display after 1s`);
        setFeedLoading(false);
      }, 1000);
      
      // Final safety timeout - much shorter than before
      const timeoutDuration = Platform.OS === 'ios' ? 3000 : 4000; // 3s for iOS, 4s for Android
      
      timeoutId = setTimeout(() => {
        console.log(`[${Platform.OS}] Final safety timeout triggered after ${timeoutDuration}ms`);
        setLoadAttempts(prev => prev + 1);
        setFeedLoading(false);
        
        // Try refreshing in parallel for faster results
        Promise.all([
          refresh().catch(e => console.error(`[${Platform.OS}] Feed refresh error:`, e)),
          refetchBanner().catch(e => console.error(`[${Platform.OS}] Banner refresh error:`, e)),
          stats.refresh?.().catch(e => console.error(`[${Platform.OS}] Stats refresh error:`, e))
        ]).catch(e => {
          console.error(`[${Platform.OS}] Refresh error:`, e);
        });
      }, timeoutDuration);
    }
    
    return () => {
      if (ultraEarlyTimerId) clearTimeout(ultraEarlyTimerId);
      if (progressTimerId) clearTimeout(progressTimerId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, loading, refresh, entries.length, stats, refetchBanner]);
  
  // Update feedItems when socialFeed.feedItems changes
  useEffect(() => {
    if (isAuthenticated && socialFeed) {
      setFeedItems(socialFeed.feedItems);
      setIsOffline(socialFeed.isOffline);
    } else {
      // Clear feed items when logged out
      setFeedItems([]);
    }
  }, [isAuthenticated, socialFeed?.feedItems, socialFeed?.isOffline]);
  
  // Process feedItems into entries when feedItems changes
  useEffect(() => {
    if (!feedItems || !Array.isArray(feedItems)) {
      setEntries([]);
      return;
    }
    
    // Map items and filter out any nulls
    const mappedItems = feedItems.map(item => {
      if (!item) return null;
      
      // Create a properly typed AnyFeedEntry based on the item type
      // with null safety for all item properties
      const baseEntry = {
        id: item.id || `temp-${Date.now()}-${Math.random()}`,
        eventId: item.id || `temp-${Date.now()}-${Math.random()}`,
        event: item.originalEvent || {},
        timestamp: ((item.createdAt || Math.floor(Date.now() / 1000)) * 1000),
      };
      
      // Add type-specific properties
      switch (item.type) {
        case 'workout':
          return {
            ...baseEntry,
            type: 'workout',
            content: item.parsedContent || {}
          } as WorkoutFeedEntry;
        
        case 'exercise':
          return {
            ...baseEntry,
            type: 'exercise',
            content: item.parsedContent || {}
          } as ExerciseFeedEntry;
          
        case 'template':
          return {
            ...baseEntry,
            type: 'template',
            content: item.parsedContent || {}
          } as TemplateFeedEntry;
          
        case 'social':
          return {
            ...baseEntry,
            type: 'social',
            content: item.parsedContent || {}
          } as SocialFeedEntry;
          
        case 'article':
          return {
            ...baseEntry,
            type: 'article',
            content: item.parsedContent || {}
          } as ArticleFeedEntry;
          
        default:
          // Fallback to social type if unknown
          return {
            ...baseEntry,
            type: 'social',
            content: item.parsedContent || {}
          } as SocialFeedEntry;
      }
    });
    
    // Filter out nulls to satisfy TypeScript
    const filteredEntries = mappedItems.filter((item): item is AnyFeedEntry => item !== null);
    setEntries(filteredEntries);
  }, [feedItems]);
  
  // Determine current render state - even more aggressive about showing content early
  const renderState: RenderState = !isAuthenticated
    ? 'login'
    : renderError ? 'error'
    : (entries.length > 0 || stats.followersCount > 0 || stats.followingCount > 0) ? 'content' // Show content as soon as ANY data is available
    : (loading && loadAttempts < 2) ? 'loading' 
    : 'content'; // Fallback to content even if loading to avoid stuck loading screen
  
  // Combined refresh function for refreshing all data
  const refreshAll = useCallback(async () => {
    console.log(`[${Platform.OS}] Starting full profile refresh...`);
    try {
      // Create an array of refresh promises to run in parallel
      const refreshPromises = [];
      
      // Refresh feed content
      if (refresh) {
        refreshPromises.push(
          refresh()
            .catch(error => console.error(`[${Platform.OS}] Error refreshing feed:`, error))
        );
      }
      
      // Refresh profile stats
      if (stats.refresh) {
        refreshPromises.push(
          stats.refresh()
            .catch(error => console.error(`[${Platform.OS}] Error refreshing profile stats:`, error))
        );
      }
      
      // Refresh banner image
      if (refetchBanner) {
        refreshPromises.push(
          refetchBanner()
            .catch(error => console.error(`[${Platform.OS}] Error refreshing banner image:`, error))
        );
      }
      
      // Wait for all refresh operations to complete
      await Promise.all(refreshPromises);
      
      console.log(`[${Platform.OS}] Profile refresh completed successfully`);
    } catch (error) {
      console.error(`[${Platform.OS}] Error during profile refresh:`, error);
    }
  }, [refresh, stats.refresh, refetchBanner]);
  
  // Return all the data and functions needed by the profile screen
  return {
    isAuthenticated,
    currentUser,
    stats: {
      followersCount: stats.followersCount,
      followingCount: stats.followingCount,
      refresh: stats.refresh,
      isLoading: stats.isLoading,
    },
    bannerImage: {
      url: bannerImageUrl,
      defaultUrl: defaultBannerUrl,
      refetch: refetchBanner,
    },
    feed: {
      entries,
      loading,
      isOffline,
      refresh,
    },
    renderState,
    renderError,
    refreshAll,
    loadAttempts,
    setRenderError,
  };
}
