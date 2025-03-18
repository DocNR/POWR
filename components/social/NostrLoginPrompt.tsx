// components/social/NostrLoginPrompt.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Zap, Key } from 'lucide-react-native';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';

interface NostrLoginPromptProps {
  message: string;
}

export default function NostrLoginPrompt({ message }: NostrLoginPromptProps) {
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  
  return (
    <View className="flex-1 items-center justify-center p-6">
      <View className="items-center mb-8">
        <Zap size={48} className="text-primary mb-4" />
        <Text className="text-xl font-semibold mb-4 text-center">Connect with Nostr</Text>
        <Text className="text-center text-muted-foreground mb-8">
          {message}
        </Text>
        <Button 
          onPress={() => setIsLoginSheetOpen(true)}
          className="px-6"
        >
          <Text>Login with Nostr</Text>
        </Button>
      </View>
      
      {/* NostrLoginSheet */}
      <NostrLoginSheet 
        open={isLoginSheetOpen} 
        onClose={() => setIsLoginSheetOpen(false)} 
      />
    </View>
  );
}