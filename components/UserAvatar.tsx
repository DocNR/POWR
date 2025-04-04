// components/UserAvatar.tsx
import React from 'react';
import { View } from 'react-native';
import { RobohashAvatar } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { getAvatarSeed } from '@/utils/avatar';
import { useProfileImage } from '@/lib/hooks/useProfileImage';

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
  // Get profile image with React Query integration and extract the refetch function
  const { data: cachedImage, isLoading, isError, error, refetch: refreshProfileImage } = useProfileImage(
    !uri && pubkey ? pubkey : undefined, 
    undefined
  );
  
  // Log any errors loading the profile image
  React.useEffect(() => {
    if (isError && error) {
      console.error(`Error loading profile image for ${pubkey?.substring(0, 8) || 'unknown'}: `, error);
    }
  }, [isError, error, pubkey]);
  
  // Get a consistent seed for Robohash using our utility function
  const seed = React.useMemo(() => {
    return getAvatarSeed(pubkey, name || 'anonymous-user');
  }, [pubkey, name]);
  
  // Use provided URI, cached image, or undefined
  // Convert null to undefined to maintain backwards compatibility with components expecting string | undefined
  const imageUrl = uri || (cachedImage === null ? undefined : cachedImage);
  
  return (
    <View 
      className={cn("items-center", className)}
      style={{ backgroundColor: 'transparent' }}
    >
      <RobohashAvatar 
        uri={imageUrl}
        seed={seed}
        size={size}
        onPress={onPress}
        isInteractive={Boolean(onPress)}
        style={{
          ...style,
          backgroundColor: 'transparent',
          shadowColor: 'transparent',
          borderColor: 'transparent',
          elevation: 0,
        }}
      />
      
      {showName && name && (
        <Text className="text-sm mt-1 text-center">
          {name}
        </Text>
      )}
    </View>
  );
}
