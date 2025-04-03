import * as AvatarPrimitive from '@rn-primitives/avatar';
import * as React from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Image, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { getRobohashUrl } from '@/utils/avatar';

const AvatarPrimitiveRoot = AvatarPrimitive.Root;
const AvatarPrimitiveImage = AvatarPrimitive.Image;
const AvatarPrimitiveFallback = AvatarPrimitive.Fallback;

const Avatar = React.forwardRef<AvatarPrimitive.RootRef, AvatarPrimitive.RootProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitiveRoot
      ref={ref}
      className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  )
);
Avatar.displayName = AvatarPrimitiveRoot.displayName;

const AvatarImage = React.forwardRef<AvatarPrimitive.ImageRef, AvatarPrimitive.ImageProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitiveImage
      ref={ref}
      className={cn('aspect-square h-full w-full', className)}
      {...props}
    />
  )
);
AvatarImage.displayName = AvatarPrimitiveImage.displayName;

const AvatarFallback = React.forwardRef<AvatarPrimitive.FallbackRef, AvatarPrimitive.FallbackProps>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitiveFallback
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        className
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = AvatarPrimitiveFallback.displayName;

// RobohashFallback: A specialized fallback that uses Robohash for avatars
interface RobohashFallbackProps extends AvatarPrimitive.FallbackProps {
  seed?: string;
  size?: string;
}

const RobohashFallback = React.forwardRef<AvatarPrimitive.FallbackRef, RobohashFallbackProps>(
  ({ className, seed = 'anonymous', size = '150x150', ...props }, ref) => (
    <AvatarPrimitiveFallback
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted p-0 overflow-hidden',
        className
      )}
      {...props}
    >
      <Image 
        source={{ uri: getRobohashUrl(seed, 'anonymous', size) }}
        accessibilityLabel="Robohash avatar"
        style={{ width: '100%', height: '100%' }}
      />
    </AvatarPrimitiveFallback>
  )
);
RobohashFallback.displayName = 'RobohashFallback';

// RobohashAvatar: A complete avatar component with Robohash fallback
interface RobohashAvatarProps extends TouchableOpacityProps {
  uri?: string;
  seed?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isInteractive?: boolean;
  className?: string;
  onImageError?: () => void;
}

const RobohashAvatar: React.FC<RobohashAvatarProps> = ({
  uri,
  seed,
  size = 'md',
  isInteractive = true,
  className,
  onPress,
  onImageError,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Ensure we always have a valid seed value
  const safeSeed = React.useMemo(() => {
    // If an explicit seed is provided, use it
    if (seed) return seed;
    // If no seed but we have a URI, use that as fallback
    if (uri) return uri;
    // Default fallback that will always work
    return 'anonymous-user';
  }, [seed, uri]);
  
  const containerStyles = cn(
    {
      'w-8 h-8': size === 'sm',
      'w-10 h-10': size === 'md',
      'w-12 h-12': size === 'lg',
      'w-24 h-24': size === 'xl',
    },
    className
  );
  
  const handleImageError = () => {
    setImageError(true);
    if (onImageError) {
      onImageError();
    }
  };
  
  const avatarContent = (
    <Avatar 
      className={containerStyles}
      alt="User avatar"
    >
      {uri && !imageError ? (
        <AvatarImage 
          source={{ uri }} 
          onError={handleImageError}
        />
      ) : (
        <RobohashFallback seed={safeSeed} />
      )}
    </Avatar>
  );
  
  if (!isInteractive) return avatarContent;
  
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="User avatar"
      {...props}
    >
      {avatarContent}
    </TouchableOpacity>
  );
};

export { Avatar, AvatarFallback, AvatarImage, RobohashFallback, RobohashAvatar };
