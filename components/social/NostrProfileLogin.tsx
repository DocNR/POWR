import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';

interface NostrProfileLoginProps {
  message?: string;
}

export default function NostrProfileLogin({ 
  message = "Login with your Nostr private key to access your profile data."
}: NostrProfileLoginProps) {
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-center text-muted-foreground mb-8">
        {message}
      </Text>
      <Button
        variant="purple"
        onPress={() => setIsLoginSheetOpen(true)}
        className="px-6 py-3"
      >
        <Text className="text-white font-medium">Login with Nostr</Text>
      </Button>
      
      {/* NostrLoginSheet */}
      <NostrLoginSheet 
        open={isLoginSheetOpen} 
        onClose={() => setIsLoginSheetOpen(false)} 
      />
    </View>
  );
}
