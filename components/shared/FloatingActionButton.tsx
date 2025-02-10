// components/shared/FloatingActionButton.tsx
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LucideIcon, Dumbbell } from 'lucide-react-native';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  icon?: LucideIcon;
  onPress?: () => void;
  className?: string;
}

export function FloatingActionButton({ 
  icon: Icon = Dumbbell,
  onPress,
  className,
  style
}: FloatingActionButtonProps & { style?: ViewStyle }) {
  return (
    <View style={[{ 
      position: 'absolute', 
      right: 16, 
      bottom: 16, 
      zIndex: 50 
    }, style]}>
      <Button
        size="icon"
        className={`h-14 w-14 rounded-full shadow-lg bg-purple-500 ${className || ''}`}
        onPress={onPress}
      >
        <Icon size={24} color="white" />
      </Button>
    </View>
  );
}