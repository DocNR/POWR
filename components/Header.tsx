// components/Header.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderProps {
  title: string;
  rightElement?: React.ReactNode;
}

export default function Header({ title, rightElement }: HeaderProps) {
  return (
    <View className="flex-row justify-between items-center px-4 pt-14 pb-4 bg-card">
      <Text className="text-2xl font-bold">{title}</Text>
      {rightElement || <ThemeToggle />}
    </View>
  );
}