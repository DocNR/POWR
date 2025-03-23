// app/(tabs)/profile/overview.tsx
import React, { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl, Pressable, TouchableOpacity, ImageBackground } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import EmptyFeed from '@/components/social/EmptyFeed';
import { useUserActivityFeed } from '@/lib/hooks/useFeedHooks';
import { AnyFeedEntry } from '@/types/feed';
import UserAvatar from '@/components/UserAvatar';
import { useRouter } from 'expo-router';
import { QrCode, Mail, Copy } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';
import { Alert } from 'react-native';

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
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  const { 
    entries, 
    loading, 
    resetFeed,
    hasContent
  } = useUserActivityFeed();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Profile data
  const profileImageUrl = currentUser?.profile?.image || 
                         currentUser?.profile?.picture || 
                         (currentUser?.profile as any)?.avatar;
                         
  const bannerImageUrl = currentUser?.profile?.banner ||
                        (currentUser?.profile as any)?.background;
                         
  const displayName = isAuthenticated 
    ? (currentUser?.profile?.displayName || currentUser?.profile?.name || 'Nostr User') 
    : 'Guest User';
    
  const username = isAuthenticated 
    ? (currentUser?.profile?.nip05 || '@user') 
    : '@guest';
    
  const aboutText = currentUser?.profile?.about || 
                   (currentUser?.profile as any)?.description;
                   
  const pubkey = currentUser?.pubkey;
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await resetFeed();
      // Add a slight delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [resetFeed]);
  
  // Handle post selection
  const handlePostPress = useCallback((entry: AnyFeedEntry) => {
    // Just log the entry info for now
    console.log(`Selected ${entry.type}:`, entry);
  }, []);
  
  // Copy pubkey to clipboard
  const copyPubkey = useCallback(() => {
    if (pubkey) {
      // Simple alert instead of clipboard functionality
      Alert.alert('Pubkey', pubkey, [
        { text: 'OK' }
      ]);
      console.log('Pubkey shown to user');
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
  
  // Show different UI when not authenticated
  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-muted-foreground mb-8">
          Login with your Nostr private key to view your profile and posts.
        </Text>
        <Button 
          onPress={() => setIsLoginSheetOpen(true)}
          className="px-6"
        >
          <Text className="text-white">Login with Nostr</Text>
        </Button>
        
        {/* NostrLoginSheet */}
        <NostrLoginSheet 
          open={isLoginSheetOpen} 
          onClose={() => setIsLoginSheetOpen(false)} 
        />
      </View>
    );
  }
  
  // Profile header component
  const ProfileHeader = useCallback(() => (
    <View>
      {/* Banner Image */}
      <View className="w-full h-40 relative">
        {bannerImageUrl ? (
          <ImageBackground 
            source={{ uri: bannerImageUrl }} 
            className="w-full h-full"
            resizeMode="cover"
          >
            <View className="absolute inset-0 bg-black/20" />
          </ImageBackground>
        ) : (
          <View className="w-full h-full bg-gradient-to-b from-primary/80 to-primary/30" />
        )}
      </View>
      
      <View className="px-4 -mt-16 pb-2">
        <View className="flex-row items-end mb-4">
          {/* Left side - Avatar */}
          <UserAvatar
            size="xl"
            uri={profileImageUrl}
            fallback={displayName.charAt(0)}
            className="mr-4 border-4 border-background"
            isInteractive={false}
            style={{ width: 90, height: 90 }}
          />
          
          {/* Action buttons - positioned to the right */}
          <View className="flex-row ml-auto mb-2">
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center rounded-md bg-muted mr-2"
              onPress={showQRCode}
            >
              <QrCode size={18} color={theme.colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="w-10 h-10 items-center justify-center rounded-md bg-muted mr-2"
              onPress={copyPubkey}
            >
              <Copy size={18} color={theme.colors.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="px-4 h-10 items-center justify-center rounded-md bg-muted"
              onPress={() => router.push('/profile/settings')}
            >
              <Text className="font-medium">Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Profile info */}
        <View>
          <Text className="text-xl font-bold">{displayName}</Text>
          <Text className="text-muted-foreground mb-2">{username}</Text>
          
          {/* Follower stats */}
          <View className="flex-row mb-2">
            <TouchableOpacity className="mr-4">
              <Text>
                <Text className="font-bold">2,003</Text>
                <Text className="text-muted-foreground"> following</Text>
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity>
              <Text>
                <Text className="font-bold">4,764</Text>
                <Text className="text-muted-foreground"> followers</Text>
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* About text */}
          {aboutText && (
            <Text className="mb-3">{aboutText}</Text>
          )}
        </View>
        
        {/* Divider */}
        <View className="h-px bg-border w-full mt-2" />
      </View>
    </View>
  ), [displayName, username, profileImageUrl, aboutText, pubkey, theme.colors.text, router, showQRCode, copyPubkey]);
  
  if (loading && entries.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  
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
}
