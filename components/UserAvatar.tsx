// components/UserAvatar.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, TouchableOpacityProps, GestureResponderEvent } from 'react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface UserAvatarProps extends TouchableOpacityProps {
  uri?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  isInteractive?: boolean;
  className?: string;
}

const UserAvatar = ({ 
  uri, 
  size = 'md', 
  fallback = 'U',
  isInteractive = true,
  className,
  onPress,
  ...props
}: UserAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageUri, setImageUri] = useState<string | undefined>(uri);
  
  // Update imageUri when uri prop changes
  useEffect(() => {
    setImageUri(uri);
    setImageError(false);
  }, [uri]);
  
  // Log the URI for debugging
  console.log("Avatar URI:", uri);
  
  const containerStyles = cn(
    {
      'w-8 h-8': size === 'sm',
      'w-10 h-10': size === 'md',
      'w-12 h-12': size === 'lg',
      'w-24 h-24': size === 'xl',
    },
    className
  );
  
  const handlePress = (event: GestureResponderEvent) => {
    if (onPress) {
      onPress(event);
    } else if (isInteractive) {
      // Default behavior if no onPress provided
      console.log('Avatar pressed');
    }
  };
  
  const handleImageError = () => {
    console.error("Failed to load image from URI:", imageUri);
    setImageError(true);
  };
  
  const avatarContent = (
    <Avatar 
      className={containerStyles}
      alt="User profile image"
    >
      {imageUri && !imageError ? (
        <AvatarImage 
          source={{ uri: imageUri }} 
          onError={handleImageError}
        />
      ) : (
        <AvatarFallback>
          <Text className="text-foreground">{fallback}</Text>
        </AvatarFallback>
      )}
    </Avatar>
  );
  
  if (!isInteractive) return avatarContent;
  
  return (
    <TouchableOpacity 
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="User profile"
      {...props}
    >
      {avatarContent}
    </TouchableOpacity>
  );
};

export default UserAvatar;