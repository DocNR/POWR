// components/sheets/NostrLoginSheet.tsx
import React, { useState } from 'react';
import { Modal, View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Info, X } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNDKAuth } from '@/lib/hooks/useNDK';

interface NostrLoginSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function NostrLoginSheet({ open, onClose }: NostrLoginSheetProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, generateKeys, isLoading } = useNDKAuth();

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

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Login with Nostr</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <ScrollView style={styles.scrollView}>
              <View style={styles.content}>
                <Text className="mb-2 text-base">Enter your Nostr private key (nsec)</Text>
                <Input
                  placeholder="nsec1..."
                  value={privateKey}
                  onChangeText={setPrivateKey}
                  secureTextEntry
                  autoCapitalize="none"
                  className="mb-4"
                />
                
                {error && (
                  <View className="mb-4 p-3 bg-destructive/10 rounded-md border border-destructive">
                    <Text className="text-destructive">{error}</Text>
                  </View>
                )}
                
                <View className="flex-row space-x-2 mb-6">
                  <Button 
                    variant="outline"
                    onPress={handleGenerateKeys} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Text>Generate New Keys</Text>
                  </Button>
                  
                  <Button 
                    onPress={handleLogin} 
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" style={styles.loader} />
                    ) : (
                      <Text>Login</Text>
                    )}
                  </Button>
                </View>
                
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: {
    maxHeight: '80%',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 10,
  },
  loader: {
    marginRight: 8,
  }
});