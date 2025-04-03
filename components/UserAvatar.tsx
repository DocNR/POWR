// components/UserAvatar.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { RobohashAvatar } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { profileImageCache } from '@/lib/db/services/ProfileImageCache';
import { getRobohashUrl, getAvatarSeed } from '@/utils/avatar';

interface UserAvatarProps {
  uri?: string;
  pubkey?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
  style?: any;
  onPress?: () => void;
}

/**
 * Enhanced UserAvatar component with improved robustness for Nostr identities
 * - Handles null/undefined pubkey and image gracefully
 * - Uses consistent fallback seeds during login/logout state changes
 * - Provides consistent avatar appearance across the app
 */
export default function UserAvatar({
  uri,
  pubkey,
  name,
  size = 'md',
  showName = false,
  className,
  style,
  onPress,
}: UserAvatarProps) {
  const [cachedImage, setCachedImage] = useState<string | null>(null);
  
  // Attempt to load cached profile image if available
  useEffect(() => {
    if (!uri && pubkey) {
      // Try to get cached image if URI is not provided
      profileImageCache.getProfileImageUri(pubkey)
        .then((cachedUri: string | undefined) => {
          if (cachedUri) {
            setCachedImage(cachedUri);
          }
        })
        .catch((error: Error) => {
          console.error('Error getting cached profile image:', error);
        });
    }
  }, [uri, pubkey]);
  
  // Get a consistent seed for Robohash using our utility function
  const seed = React.useMemo(() => {
    return getAvatarSeed(pubkey, name || 'anonymous-user');
  }, [pubkey, name]);
  
  // Use cached image if available, otherwise use provided URI
  const imageUrl = uri || cachedImage || undefined;
  
  return (
    <View className={cn("items-center", className)}>
      <RobohashAvatar 
        uri={imageUrl}
        seed={seed}
        size={size}
        onPress={onPress}
        isInteractive={Boolean(onPress)}
        style={style}
      />
      
      {showName && name && (
        <Text className="text-sm mt-1 text-center">
          {name}
        </Text>
      )}
    </View>
  );
}
