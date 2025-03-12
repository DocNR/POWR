// components/sheets/NostrLoginSheet.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Info } from 'lucide-react-native';
import { useNDKAuth } from '@/lib/hooks/useNDK';
import { useColorScheme } from '@/lib/theme/useColorScheme';

interface NostrLoginSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function NostrLoginSheet({ open, onClose }: NostrLoginSheetProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, generateKeys, isLoading } = useNDKAuth();
  const { isDarkColorScheme } = useColorScheme();

  // Handle key generation
  const handleGenerateKeys = async () => {
    try {
      const { nsec } = generateKeys();
      setPrivateKey(nsec);
      setError(null);
    } catch (err) {
      setError('Failed to generate keys');
      console.error('Key generation error:', err);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!privateKey.trim()) {
      setError('Please enter your private key or generate a new one');
      return;
    }

    setError(null);
    try {
      const success = await login(privateKey);
      
      if (success) {
        setPrivateKey('');
        onClose();
      } else {
        setError('Failed to login with the provided key');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View className={`bg-background ${isDarkColorScheme ? 'bg-card border border-border' : ''} rounded-lg w-[90%] max-w-md p-6 shadow-xl`}>
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold">Login with Nostr</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          <View className="space-y-4">
            <Text className="text-base">Enter your Nostr private key (nsec)</Text>
            <Input
              placeholder="nsec1..."
              value={privateKey}
              onChangeText={setPrivateKey}
              secureTextEntry
              autoCapitalize="none"
              className="mb-2"
              style={{ paddingVertical: 12 }}
            />
            
            {error && (
              <View className="p-4 mb-2 bg-destructive/10 rounded-md border border-destructive">
                <Text className="text-destructive">{error}</Text>
              </View>
            )}
            
            <View className="flex-row gap-4 mt-4 mb-2">
              <Button 
                variant="outline"
                onPress={handleGenerateKeys}
                disabled={isLoading}
                className="flex-1 py-3"
              >
                <Text>Generate Key</Text>
              </Button>
              
              <Button
                onPress={handleLogin}
                disabled={isLoading}
                className="flex-1 py-3"
                style={{ backgroundColor: 'hsl(261, 90%, 66%)' }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-medium">Login</Text>
                )}
              </Button>
            </View>
            
            <View className={`${isDarkColorScheme ? 'bg-background/50' : 'bg-secondary/30'} p-4 rounded-md mt-4 border border-border`}>
              <View className="flex-row items-center mb-2">
                <Info size={18} className="mr-2 text-muted-foreground" />
                <Text className="font-semibold text-base">What is a Nostr Key?</Text>
              </View>
              <Text className="text-sm text-muted-foreground">
                Nostr is a decentralized protocol where your private key (nsec) is your identity and password.
                Your private key is securely stored on your device and is never sent to any servers.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}