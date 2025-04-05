// app/(tabs)/profile/overview.tsx
import React, { useState, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import NostrProfileLogin from '@/components/social/NostrProfileLogin';
import ProfileFeed from '@/components/profile/ProfileFeed';
import { useProfilePageData } from '@/lib/hooks/useProfilePageData';
import type { AnyFeedEntry } from '@/types/feed';

/**
 * Profile overview screen - refactored for consistent hook ordering
 * This component now uses the useProfilePageData hook to handle all data fetching
 * and state management, avoiding hook ordering issues.
 */
export default function OverviewScreen() {
  // Use our custom hook for all data needs (always calls hooks in same order)
  const {
    isAuthenticated,
    currentUser,
    stats,
    bannerImage,
    feed,
    renderState,
    renderError,
    refreshAll,
    setRenderError
  } = useProfilePageData();
  
  // Track refreshing state
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAll]);
  
  // Handle post selection
  const handlePostPress = useCallback((entry: AnyFeedEntry) => {
    // Just log the entry info for now
    console.log(`Selected ${entry.type}:`, entry);
  }, []);
  
  // Render the login screen
  const renderLoginScreen = useCallback(() => {
    return (
      <NostrProfileLogin message="Login with your Nostr private key to view your profile and posts." />
    );
  }, []);
  
  // Render loading screen
  const renderLoadingScreen = useCallback(() => {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }, []);
  
  // Render error screen
  const renderErrorScreen = useCallback(() => {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-lg font-bold mb-2">Something went wrong</Text>
        <Text className="text-sm text-muted-foreground mb-4 text-center">
          {renderError?.message || "We had trouble loading your profile. Please try again."}
        </Text>
        <Button 
          onPress={() => {
            setRenderError(null);
            handleRefresh();
          }}
        >
          Retry
        </Button>
      </View>
    );
  }, [renderError, handleRefresh, setRenderError]);
  
  // Render the main content
  const renderMainContent = useCallback(() => {
    // Create a wrapper for the stats refresh function to match expected Promise<void> type
    const refreshStatsWrapper = async () => {
      if (stats.refresh) {
        try {
          await stats.refresh();
        } catch (error) {
          console.error('Error refreshing stats:', error);
        }
      }
    };
    
    return (
      <ProfileFeed 
        feedEntries={feed.entries}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onPostPress={handlePostPress}
        user={currentUser}
        bannerImageUrl={bannerImage.url || undefined}
        defaultBannerUrl={bannerImage.defaultUrl}
        followersCount={stats.followersCount}
        followingCount={stats.followingCount}
        refreshStats={refreshStatsWrapper}
        isStatsLoading={stats.isLoading}
      />
    );
  }, [
    feed.entries,
    isRefreshing,
    handleRefresh,
    handlePostPress,
    currentUser,
    bannerImage.url,
    bannerImage.defaultUrl,
    stats.followersCount,
    stats.followingCount,
    stats.refresh,
    stats.isLoading
  ]);
  
  // SINGLE RETURN STATEMENT with conditional rendering
  // This avoids hook ordering issues by ensuring all hooks are always called
  return (
    <View className="flex-1">
      {renderState === 'login' && renderLoginScreen()}
      {renderState === 'loading' && renderLoadingScreen()}
      {renderState === 'error' && renderErrorScreen()}
      {renderState === 'content' && renderMainContent()}
    </View>
  );
}
