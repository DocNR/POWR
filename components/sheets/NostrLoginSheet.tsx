// components/sheets/NostrLoginSheet.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Info, ArrowRight } from 'lucide-react-native';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useNDKAuth } from '@/lib/hooks/useNDK';

interface NostrLoginSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function NostrLoginSheet({ open, onClose }: NostrLoginSheetProps) {
  const [privateKey, setPrivateKey] = useState('');
  const { login, isLoading } = useNDKAuth();

  const handleLogin = async () => {
    if (!privateKey.trim()) {
      Alert.alert('Error', 'Please enter your private key');
      return;
    }

    try {
      const success = await login(privateKey);
      
      if (success) {
        setPrivateKey('');
        onClose();
      } else {
        Alert.alert('Login Error', 'Failed to login with the provided private key');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  return (
    <Sheet 
      isOpen={open}
      onClose={onClose}
    >
      <SheetContent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <SheetHeader>
            <SheetTitle>Login with Nostr</SheetTitle>
            {/* Removed the X close button here */}
          </SheetHeader>
          
          <ScrollView style={styles.scrollView}>
            <View style={styles.content}>
              <Text className="mb-2">Enter your Nostr private key</Text>
              <Input
                placeholder="nsec1..."
                value={privateKey}
                onChangeText={setPrivateKey}
                secureTextEntry
                autoCapitalize="none"
                className="mb-4"
              />
              
              <Button 
                onPress={handleLogin} 
                disabled={isLoading}
                className="w-full mb-6"
              >
                <Text>{isLoading ? 'Logging in...' : 'Login'}</Text>
                {!isLoading}
              </Button>
              
              <Separator className="mb-4" />
              
              <View className="bg-secondary/30 p-3 rounded-md">
                <View className="flex-row items-center mb-2">
                  <Info size={16} className="mr-3 text-muted-foreground" />
                  <Text className="font-semibold">What is a Nostr Key?</Text>
                </View>
                <Text className="text-sm text-muted-foreground mb-2">
                  Nostr is a decentralized protocol where your private key (nsec) is your identity and password.
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Your private key is securely stored on your device and is never sent to any servers.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});