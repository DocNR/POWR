// app/(tabs)/profile/overview.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, RefreshControl, Pressable, TouchableOpacity, ImageBackground, Clipboard, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBannerImage } from '@/lib/hooks/useBannerImage';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import NostrProfileLogin from '@/components/social/NostrProfileLogin';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import EmptyFeed from '@/components/social/EmptyFeed';
import { useSocialFeed } from '@/lib/hooks/useSocialFeed';
import { useProfileStats } from '@/lib/hooks/useProfileStats';
import { 
  AnyFeedEntry, 
  WorkoutFeedEntry, 
  ExerciseFeedEntry, 
  TemplateFeedEntry, 
  SocialFeedEntry, 
  ArticleFeedEntry 
} from '@/types/feed';
import UserAvatar from '@/components/UserAvatar';
import { useRouter } from 'expo-router';
import { QrCode, Mail, Copy } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';
import { Alert } from 'react-native';
import { nip19 } from 'nostr-tools';

// Define the conversion function for feed items
function convertToLegacyFeedItem(entry: AnyFeedEntry) {
  return {
    id: entry.eventId,
    type: entry.type,
    originalEvent: entry.event!,
    parsedContent: entry.content!,
    createdAt: (entry.timestamp || Date.now()) / 1000
  };
}

export default function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme() as CustomTheme;
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  
  // Initialize all state hooks at the top to maintain consistent ordering
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [entries, setEntries] = useState<AnyFeedEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // IMPORTANT: Always call hooks in the same order on every render to comply with React's Rules of Hooks
  // Instead of conditionally calling the hook based on authentication state,
  // we always call it but pass empty/default parameters when not authenticated
  // This ensures consistent hook ordering between authenticated and non-authenticated states
  const socialFeed = useSocialFeed({
    feedType: 'profile',
    authors: isAuthenticated && currentUser?.pubkey ? [currentUser.pubkey] : [],
    limit: 30
  });
  
  // Extract values from socialFeed - available regardless of auth state
  // Use nullish coalescing to safely access values from the hook
  const loading = socialFeed?.loading || feedLoading;
  const refresh = socialFeed?.refresh || (() => Promise.resolve());
  
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
  // This needs to be a separate effect to avoid breaking hook order during logout
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
  
  const resetFeed = refresh;
  const hasContent = entries.length > 0;
  
  // Profile data
  const profileImageUrl = currentUser?.profile?.image || 
                         currentUser?.profile?.picture || 
                         (currentUser?.profile as any)?.avatar;
   
  // Use our React Query hook for banner images
  const defaultBannerUrl = currentUser?.profile?.banner ||
                         (currentUser?.profile as any)?.background;

  const { data: bannerImageUrl, refetch: refetchBannerImage } = useBannerImage(
    currentUser?.pubkey,
    defaultBannerUrl
  );
                         
  const displayName = isAuthenticated 
    ? (currentUser?.profile?.displayName || currentUser?.profile?.name || 'Nostr User') 
    : 'Guest User';
    
  const username = isAuthenticated 
    ? (currentUser?.profile?.nip05 || '@user') 
    : '@guest';
    
  const aboutText = currentUser?.profile?.about || 
                   (currentUser?.profile as any)?.description;
                   
  const pubkey = currentUser?.pubkey;
  
  // Profile follower stats component - always call useProfileStats hook 
  // even if isAuthenticated is false (passing empty pubkey)
  // This ensures consistent hook ordering regardless of authentication state
  const { 
    followersCount, 
    followingCount, 
    isLoading: statsLoading, 
    refresh: refreshStats,
    lastRefreshed: statsLastRefreshed
  } = useProfileStats({ 
    pubkey: pubkey || '', 
    refreshInterval: 10000 // 10 second refresh interval for real-time updates
  });
  
  // Track last fetch time to force component updates
  const [lastStatsFetch, setLastStatsFetch] = useState<number>(Date.now());
  
  // Update the lastStatsFetch whenever stats are refreshed
  useEffect(() => {
    if (statsLastRefreshed) {
      setLastStatsFetch(statsLastRefreshed);
    }
  }, [statsLastRefreshed]);
  
  // Manual refresh function with visual feedback
  const manualRefreshStats = useCallback(async () => {
    console.log(`[${Platform.OS}] Manually refreshing follower stats...`);
    if (refreshStats) {
      try {
        await refreshStats();
        console.log(`[${Platform.OS}] Follower stats refreshed successfully`);
        // Force update even if the values didn't change
        setLastStatsFetch(Date.now());
      } catch (error) {
        console.error(`[${Platform.OS}] Error refreshing follower stats:`, error);
      }
    }
  }, [refreshStats]);
  
  // Use a separate component to avoid conditionally rendered hooks
  // Do NOT use React.memo here - we need to re-render this even when props don't change
  const ProfileFollowerStats = () => {
    // Add local state to track if a manual refresh is happening
    const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
    
    // This will run on every render to ensure we're showing fresh data
    useEffect(() => {
      console.log(`[${Platform.OS}] Rendering ProfileFollowerStats with:`, { 
        followersCount, 
        followingCount, 
        statsLoading,
        isManuallyRefreshing,
        lastRefreshed: new Date(lastStatsFetch).toISOString()
      });
    }, [followersCount, followingCount, statsLoading, lastStatsFetch, isManuallyRefreshing]);
    
    // Enhanced manual refresh function with visual feedback
    const triggerManualRefresh = useCallback(async () => {
      if (isManuallyRefreshing) return; // Prevent multiple simultaneous refreshes
      
      try {
        setIsManuallyRefreshing(true);
        console.log(`[${Platform.OS}] Manual refresh triggered by user tap`);
        await manualRefreshStats();
      } catch (error) {
        console.error(`[${Platform.OS}] Error during manual refresh:`, error);
      } finally {
        // Short delay before removing loading indicator for better UX
        setTimeout(() => setIsManuallyRefreshing(false), 500);
      }
    }, [isManuallyRefreshing, manualRefreshStats]);
    
    // Always show actual values when available, regardless of loading state
    // Only show dots when we have no values at all
    // This ensures Android doesn't get stuck showing loading indicators
    const followingDisplay = followingCount > 0 ? 
      followingCount.toLocaleString() : 
      (statsLoading || isManuallyRefreshing ? '...' : '0');
      
    const followersDisplay = followersCount > 0 ? 
      followersCount.toLocaleString() : 
      (statsLoading || isManuallyRefreshing ? '...' : '0');
    
    return (
      <View className="flex-row items-center mb-2">
        <TouchableOpacity 
          className="mr-4 py-1 flex-row items-center" 
          onPress={triggerManualRefresh}
          disabled={isManuallyRefreshing}
          accessibilityLabel="Refresh follower stats"
        >
          <Text>
            <Text className="font-bold">{followingDisplay}</Text>
            <Text className="text-muted-foreground"> following</Text>
          </Text>
          {isManuallyRefreshing && (
            <ActivityIndicator size="small" style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="py-1 flex-row items-center"
          onPress={triggerManualRefresh}
          disabled={isManuallyRefreshing}
          accessibilityLabel="Refresh follower stats"
        >
          <Text>
            <Text className="font-bold">{followersDisplay}</Text>
            <Text className="text-muted-foreground"> followers</Text>
          </Text>
          {isManuallyRefreshing && (
            <ActivityIndicator size="small" style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  // Generate npub format for display
  const npubFormat = React.useMemo(() => {
    if (!pubkey) return '';
    try {
      const npub = nip19.npubEncode(pubkey);
      return npub;
    } catch (error) {
      console.error('Error encoding npub:', error);
      return '';
    }
  }, [pubkey]);
  
  // Get shortened npub display version
  const shortenedNpub = React.useMemo(() => {
    if (!npubFormat) return '';
    return `${npubFormat.substring(0, 8)}...${npubFormat.substring(npubFormat.length - 5)}`;
  }, [npubFormat]);
  
  // Handle refresh - now also refreshes banner image and forces state updates
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log(`[${Platform.OS}] Starting full profile refresh...`);
      
      // Create an array of refresh promises to run in parallel
      const refreshPromises = [];
      
      // Refresh feed content
      refreshPromises.push(resetFeed());
      
      // Refresh profile stats from nostr.band
      if (refreshStats) {
        refreshPromises.push(
          refreshStats()
            .then(() => {
              console.log(`[${Platform.OS}] Profile stats refreshed successfully:`);
              // Force component update even if values didn't change
              setLastStatsFetch(Date.now());
            })
            .catch(error => console.error(`[${Platform.OS}] Error refreshing profile stats:`, error))
        );
      }
      
      // Refresh banner image
      if (refetchBannerImage) {
        refreshPromises.push(
          refetchBannerImage()
            .then(() => console.log(`[${Platform.OS}] Banner image refreshed successfully`))
            .catch(error => console.error(`[${Platform.OS}] Error refreshing banner image:`, error))
        );
      }
      
      // Wait for all refresh operations to complete
      await Promise.all(refreshPromises);
      
      // Log the current values after refresh
      console.log(`[${Platform.OS}] Profile refresh completed successfully. Current stats:`, {
        followersCount,
        followingCount
      });
    } catch (error) {
      console.error(`[${Platform.OS}] Error during profile refresh:`, error);
    } finally {
      setIsRefreshing(false);
    }
  }, [resetFeed, refreshStats, refetchBannerImage, followersCount, followingCount, setLastStatsFetch]);
  
  // Handle post selection
  const handlePostPress = useCallback((entry: AnyFeedEntry) => {
    // Just log the entry info for now
    console.log(`Selected ${entry.type}:`, entry);
  }, []);
  
  // Copy npub to clipboard
  const copyPubkey = useCallback(() => {
    if (pubkey) {
      try {
        const npub = nip19.npubEncode(pubkey);
        Clipboard.setString(npub);
        Alert.alert('Copied', 'Public key copied to clipboard in npub format');
        console.log('npub copied to clipboard:', npub);
      } catch (error) {
        console.error('Error copying npub:', error);
        Alert.alert('Error', 'Failed to copy public key');
      }
    }
  }, [pubkey]);
  
  // Show QR code alert
  const showQRCode = useCallback(() => {
    Alert.alert('QR Code', 'QR Code functionality will be implemented soon', [
      { text: 'OK' }
    ]);
  }, []);
  
  // Memoize render item function
  const renderItem = useCallback(({ item }: { item: AnyFeedEntry }) => (
    <EnhancedSocialPost 
      item={convertToLegacyFeedItem(item)}
      onPress={() => handlePostPress(item)}
    />
  ), [handlePostPress]);
  
  // IMPORTANT: All callback hooks must be defined before any conditional returns
  // to ensure consistent hook ordering across renders
  
  // Define all the callbacks at the same level, regardless of authentication state
  const handleEditProfilePress = useCallback(() => {
    if (router && isAuthenticated) {
      router.push('/profile/settings');
    }
  }, [router, isAuthenticated]);
  
  const handleCopyButtonPress = useCallback(() => {
    if (pubkey) {
      copyPubkey();
    }
  }, [pubkey, copyPubkey]);
  
  const handleQrButtonPress = useCallback(() => {
    showQRCode();
  }, [showQRCode]);
  
  // Profile header component - making sure we have the same hooks 
  // regardless of authentication state to avoid hook ordering issues
  const ProfileHeader = useCallback(() => {
    // Using callbacks defined at the parent level
    // This prevents inconsistent hook counts during render
    
    // Debugging banner image loading
    useEffect(() => {
      console.log('Banner image state in ProfileHeader:', {
        bannerImageUrl,
        defaultBannerUrl,
        pubkey: pubkey?.substring(0, 8)
      });
    }, [bannerImageUrl, defaultBannerUrl]);
    
    return (
    <View>
      {/* Banner Image */}
      <View className="w-full h-40 relative">
        {bannerImageUrl ? (
          <ImageBackground 
            source={{ uri: bannerImageUrl }} 
            className="w-full h-full"
            resizeMode="cover"
            onError={(e) => {
              console.error(`Banner image loading error: ${JSON.stringify(e.nativeEvent)}`);
              console.error(`Failed URL: ${bannerImageUrl}`);
              
              // Force a re-render of the gradient fallback on error
              if (refetchBannerImage) {
                console.log('Attempting to refetch banner image after error...');
                refetchBannerImage().catch(err => 
                  console.error('Failed to refetch banner image:', err)
                );
              }
            }}
            onLoad={() => {
              console.log(`Banner image loaded successfully: ${bannerImageUrl}`);
            }}
          >
            <View className="absolute inset-0 bg-black/20" />
          </ImageBackground>
        ) : (
          <View className="w-full h-40 bg-gradient-to-b from-primary/80 to-primary/30">
            <Text className="text-center text-white pt-16 opacity-50">
              {defaultBannerUrl ? 'Loading banner...' : 'No banner image'}
            </Text>
          </View>
        )}
      </View>
      
      <View className="px-4 -mt-16 pb-2">
        <View className="flex-row items-end mb-4">
          {/* Left side - Avatar */}
          <UserAvatar
            size="xl"
            uri={profileImageUrl}
            pubkey={pubkey}
            name={displayName}
            className="mr-4"
            style={{ 
              width: 90, 
              height: 90,
              backgroundColor: 'transparent',
              overflow: 'hidden',
              borderWidth: 0,
              shadowOpacity: 0,
              elevation: 0
            }}
          />
          
          {/* Edit Profile button - positioned to the right */}
          <View className="ml-auto mb-2">
            <TouchableOpacity 
              className="px-4 h-10 items-center justify-center rounded-md bg-muted"
              onPress={handleEditProfilePress}
            >
              <Text className="font-medium">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Profile info */}
        <View>
          <Text className="text-xl font-bold">{displayName}</Text>
          <Text className="text-muted-foreground">{username}</Text>
          
          {/* Display npub below username with sharing options */}
          {npubFormat && (
            <View className="flex-row items-center mt-1 mb-2">
              <Text className="text-xs text-muted-foreground font-mono">
                {shortenedNpub}
              </Text>
              <TouchableOpacity 
                className="ml-2 p-1"
                onPress={handleCopyButtonPress}
                accessibilityLabel="Copy public key"
                accessibilityHint="Copies your Nostr public key to clipboard"
              >
                <Copy size={12} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity 
                className="ml-2 p-1"
                onPress={handleQrButtonPress}
                accessibilityLabel="Show QR Code"
                accessibilityHint="Shows a QR code with your Nostr public key"
              >
                <QrCode size={12} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Follower stats - render the separated component to avoid hook ordering issues */}
          <ProfileFollowerStats />
          
          {/* About text */}
          {aboutText && (
            <Text className="mb-3">{aboutText}</Text>
          )}
        </View>
        
        {/* Divider */}
        <View className="h-px bg-border w-full mt-2" />
      </View>
    </View>
    );
  }, [
    displayName, 
    username, 
    profileImageUrl, 
    aboutText, 
    pubkey, 
    npubFormat, 
    shortenedNpub, 
    theme.colors.text, 
    router, 
    showQRCode, 
    copyPubkey, 
    isAuthenticated,
    bannerImageUrl,
    defaultBannerUrl,
    refetchBannerImage
  ]);
  
  // Render functions for different app states
  const renderLoginScreen = useCallback(() => {
    return (
      <NostrProfileLogin message="Login with your Nostr private key to view your profile and posts." />
    );
  }, []);
  
  const renderLoadingScreen = useCallback(() => {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }, []);
  
  const renderMainContent = useCallback(() => {
    return (
    <View className="flex-1">
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={<ProfileHeader />}
        ListEmptyComponent={
          <View className="px-4 py-8">
            <EmptyFeed message="No posts yet. Share your workouts or create posts to see them here." />
          </View>
        }
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20,
          flexGrow: entries.length === 0 ? 1 : undefined
        }}
      />
    </View>
    );
  }, [entries, renderItem, isRefreshing, handleRefresh, ProfileHeader, insets.bottom]);
  
  // Final conditional return after all hooks have been called
  // This ensures consistent hook ordering across renders
  if (!isAuthenticated) {
    return renderLoginScreen();
  }
  
  if (loading && entries.length === 0) {
    return renderLoadingScreen();
  }
  
  return renderMainContent();
}
