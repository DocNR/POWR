// components/profile/ProfileFeed.tsx
import React, { useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyFeed from '@/components/social/EmptyFeed';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import { convertToLegacyFeedItem } from '@/lib/hooks/useProfilePageData';
import type { AnyFeedEntry } from '@/types/feed';
import ProfileHeader from './ProfileHeader';
import { NDKUser } from '@nostr-dev-kit/ndk';

interface ProfileFeedProps {
  feedEntries: AnyFeedEntry[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onPostPress: (entry: AnyFeedEntry) => void;
  user: NDKUser | null;
  bannerImageUrl?: string;
  defaultBannerUrl?: string;
  followersCount: number;
  followingCount: number;
  refreshStats: () => Promise<void>;
  isStatsLoading: boolean;
}

/**
 * Profile feed component that displays the user's posts
 * Pure presentational component with performance optimizations
 */
const ProfileFeed: React.FC<ProfileFeedProps> = ({
  feedEntries,
  isRefreshing,
  onRefresh,
  onPostPress,
  user,
  bannerImageUrl,
  defaultBannerUrl,
  followersCount,
  followingCount,
  refreshStats,
  isStatsLoading,
}) => {
  const insets = useSafeAreaInsets();
  
  // Performance optimization: memoize item renderer
  const renderItem = useCallback(({ item }: { item: AnyFeedEntry }) => (
    <EnhancedSocialPost 
      item={convertToLegacyFeedItem(item)}
      onPress={() => onPostPress(item)}
    />
  ), [onPostPress]);
  
  // Performance optimization: memoize key extractor
  const keyExtractor = useCallback((item: AnyFeedEntry) => item.id, []);
  
  // Performance optimization: memoize header component
  const ListHeaderComponent = useMemo(() => (
    <ProfileHeader 
      user={user}
      bannerImageUrl={bannerImageUrl}
      defaultBannerUrl={defaultBannerUrl}
      followersCount={followersCount}
      followingCount={followingCount}
      refreshStats={refreshStats}
      isStatsLoading={isStatsLoading}
    />
  ), [user, bannerImageUrl, defaultBannerUrl, followersCount, followingCount, refreshStats, isStatsLoading]);
  
  // Performance optimization: memoize empty component
  const ListEmptyComponent = useMemo(() => (
    <View className="px-4 py-8">
      <EmptyFeed message="No posts yet. Share your workouts or create posts to see them here." />
    </View>
  ), []);
  
  // Performance optimization: memoize content container style
  const contentContainerStyle = useMemo(() => ({ 
    paddingBottom: insets.bottom + 20,
    flexGrow: feedEntries.length === 0 ? 1 : undefined
  }), [insets.bottom, feedEntries.length]);
  
  return (
    <FlatList
      data={feedEntries}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={onRefresh}
        />
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      
      // Performance optimizations for FlatList
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      initialNumToRender={8}
      windowSize={5}
      updateCellsBatchingPeriod={50}
    />
  );
};

export default ProfileFeed;
