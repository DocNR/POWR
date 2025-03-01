// components/social/EmptyFeed.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Users } from 'lucide-react-native';

interface EmptyFeedProps {
  message: string;
}

export default function EmptyFeed({ message }: EmptyFeedProps) {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center p-10 mt-10">
        <Users size={48} className="text-muted-foreground mb-4" />
        <Text className="text-lg font-semibold mb-2 text-center">
          No posts yet
        </Text>
        <Text className="text-center text-muted-foreground">
          {message}
        </Text>
      </View>
    </ScrollView>
  );
}