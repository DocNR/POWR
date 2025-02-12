// components/Header.tsx
import React from 'react';
import { View, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title: string;
  rightElement?: React.ReactNode;
  children?: React.ReactNode;
}

export default function Header({ title, rightElement, children }: HeaderProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <View 
      className="flex-row items-center justify-between bg-card border-b border-border"
      style={{
        paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
      }}
    >
      <View className="flex-1">
        <Text className="text-2xl font-bold">{title}</Text>
        {children}
      </View>
      {rightElement && (
        <View className="ml-4">
          {rightElement}
        </View>
      )}
    </View>
  );
}