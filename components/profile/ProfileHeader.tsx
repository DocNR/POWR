// components/profile/ProfileHeader.tsx
import React, { useEffect } from 'react';
import { View, TouchableOpacity, ImageBackground, Platform, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { Copy, QrCode } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';
import { Alert, Clipboard } from 'react-native';
import { nip19 } from 'nostr-tools';
import UserAvatar from '@/components/UserAvatar';
import { NDKUser } from '@nostr-dev-kit/ndk';

interface ProfileHeaderProps {
  user: NDKUser | null;
  bannerImageUrl?: string;
  defaultBannerUrl?: string;
  followersCount: number;
  followingCount: number;
  refreshStats: () => Promise<void>;
  isStatsLoading: boolean;
}

/**
 * Profile header component displaying banner, avatar, user details, and stats
 * Pure presentational component (no hooks except for UI behavior)
 */
const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  bannerImageUrl,
  defaultBannerUrl,
  followersCount,
  followingCount,
  refreshStats,
  isStatsLoading,
}) => {
  const router = useRouter();
  const theme = useTheme() as CustomTheme;
  
  // Extract user profile data with fallbacks
  const profileImageUrl = user?.profile?.image || 
                         user?.profile?.picture || 
                         (user?.profile as any)?.avatar;
                         
  const displayName = (user?.profile?.displayName || user?.profile?.name || 'Nostr User');
  const username = (user?.profile?.nip05 || '@user');
  const aboutText = user?.profile?.about || (user?.profile as any)?.description;
  const pubkey = user?.pubkey;
  
  // Debug banner image loading
  useEffect(() => {
    console.log('Banner image state in ProfileHeader:', {
      bannerImageUrl,
      defaultBannerUrl,
      pubkey: pubkey?.substring(0, 8)
    });
  }, [bannerImageUrl, defaultBannerUrl, pubkey]);
  
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
  
  // Handle profile edit button press
  const handleEditProfilePress = () => {
    if (router) {
      router.push('/profile/settings');
    }
  };
  
  // Copy npub to clipboard
  const handleCopyButtonPress = () => {
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
  };
  
  // Show QR code alert (placeholder)
  const handleQrButtonPress = () => {
    Alert.alert('QR Code', 'QR Code functionality will be implemented soon', [
      { text: 'OK' }
    ]);
  };
  
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
          
          {/* Follower stats */}
          <ProfileStats 
            followersCount={followersCount}
            followingCount={followingCount}
            refreshStats={refreshStats}
            isLoading={isStatsLoading}
          />
          
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
};

// ProfileStats subcomponent
interface ProfileStatsProps {
  followersCount: number;
  followingCount: number;
  refreshStats: () => Promise<void>;
  isLoading: boolean;
}

const ProfileStats: React.FC<ProfileStatsProps> = ({
  followersCount,
  followingCount,
  refreshStats,
  isLoading
}) => {
  const [isManuallyRefreshing, setIsManuallyRefreshing] = React.useState(false);
  
  // Enhanced manual refresh function with visual feedback
  const triggerManualRefresh = React.useCallback(async () => {
    if (isManuallyRefreshing) return; // Prevent multiple simultaneous refreshes
    
    try {
      setIsManuallyRefreshing(true);
      console.log(`[${Platform.OS}] Manual refresh triggered by user tap`);
      await refreshStats();
    } catch (error) {
      console.error(`[${Platform.OS}] Error during manual refresh:`, error);
    } finally {
      // Short delay before removing loading indicator for better UX
      setTimeout(() => setIsManuallyRefreshing(false), 500);
    }
  }, [isManuallyRefreshing, refreshStats]);
  
  // Always show actual values when available, regardless of loading state
  // Only show dots when we have no values at all
  const followingDisplay = followingCount > 0 ? 
    followingCount.toLocaleString() : 
    (isLoading || isManuallyRefreshing ? '...' : '0');
    
  const followersDisplay = followersCount > 0 ? 
    followersCount.toLocaleString() : 
    (isLoading || isManuallyRefreshing ? '...' : '0');
  
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

export default ProfileHeader;
