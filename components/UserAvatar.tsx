// components/UserAvatar.tsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, TouchableOpacityProps, GestureResponderEvent } from 'react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { profileImageCache } from '@/lib/db/services/ProfileImageCache';

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
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2; // Maximum number of retry attempts
  
  // Load cached image when uri changes
  useEffect(() => {
    let isMounted = true;
    
    // Reset retry count and error state when URI changes
    setRetryCount(0);
    setImageError(false);
    
    const loadCachedImage = async () => {
      if (!uri) {
        setImageUri(undefined);
        return;
      }
      
      try {
        // Try to extract pubkey from URI
        const pubkey = profileImageCache.extractPubkeyFromUri(uri);
        
        if (pubkey) {
          // If we have a pubkey, try to get cached image
          const cachedUri = await profileImageCache.getProfileImageUri(pubkey, uri);
          
          if (isMounted) {
            setImageUri(cachedUri);
            setImageError(false);
          }
        } else {
          // If no pubkey, just use the original URI
          if (isMounted) {
            setImageUri(uri);
            setImageError(false);
          }
        }
      } catch (error) {
        console.error('Error loading cached image:', error);
        if (isMounted) {
          setImageUri(uri);
          setImageError(false);
        }
      }
    };
    
    loadCachedImage();
    
    return () => {
      isMounted = false;
    };
  }, [uri]);
  
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
    
    if (retryCount < maxRetries) {
      // Try again after a short delay
      console.log(`Retrying image load (attempt ${retryCount + 1}/${maxRetries})`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        // Force reload by setting a new URI with cache buster
        if (imageUri) {
          const cacheBuster = `?retry=${Date.now()}`;
          const newUri = imageUri.includes('?') 
            ? `${imageUri}&cb=${Date.now()}` 
            : `${imageUri}${cacheBuster}`;
          setImageUri(newUri);
          setImageError(false);
        }
      }, 1000);
    } else {
      console.log(`Max retries (${maxRetries}) reached, showing fallback`);
      setImageError(true);
    }
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
