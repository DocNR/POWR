// components/sheets/NostrLoginSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Modal, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Info, ExternalLink } from 'lucide-react-native';
import { useNDKAuth } from '@/lib/hooks/useNDK';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import ExternalSignerUtils from '@/utils/ExternalSignerUtils';
import NDKAmberSigner from '@/lib/signers/NDKAmberSigner';

interface NostrLoginSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function NostrLoginSheet({ open, onClose }: NostrLoginSheetProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, loginWithExternalSigner, generateKeys, isLoading } = useNDKAuth();
  const { isDarkColorScheme } = useColorScheme();

  // State for external signer availability
  const [isExternalSignerAvailable, setIsExternalSignerAvailable] = useState<boolean>(false);
  
  // Check if external signer is available
  useEffect(() => {
    async function checkExternalSigner() {
      if (Platform.OS === 'android') {
        try {
          const available = await ExternalSignerUtils.isExternalSignerInstalled();
          setIsExternalSignerAvailable(available);
        } catch (err) {
          console.error('Error checking for external signer:', err);
          setIsExternalSignerAvailable(false);
        }
      }
    }
    
    checkExternalSigner();
  }, []);

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

  // Handle login with private key
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
  
  // Handle login with Amber (external signer)
  const handleAmberLogin = async () => {
    setError(null);
    
    try {
      console.log('Attempting to login with Amber...');
      
      try {
        // Request public key from Amber
        // This will throw an error because the native module isn't implemented
        // but the TypeScript interface is ready for when it is
        const { pubkey, packageName } = await NDKAmberSigner.requestPublicKey();
        
        // Login with the external signer
        const success = await loginWithExternalSigner(pubkey, packageName);
        
        if (success) {
          onClose();
        } else {
          setError('Failed to login with Amber');
        }
      } catch (requestError) {
        // Since the native implementation is not available yet,
        // we show a more user-friendly error message
        console.error('Amber requestPublicKey error:', requestError);
        setError("Amber signing requires a native module implementation. The interface is ready but the native code needs to be completed.");
      }
    } catch (err) {
      console.error('Amber login error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error with Amber');
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
            {/* External signer option (Android only) */}
            {Platform.OS === 'android' && (
              <Button
                onPress={handleAmberLogin}
                disabled={isLoading}
                className="mb-3 py-3"
                variant="outline"
                style={{ borderColor: 'hsl(261, 90%, 66%)' }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="hsl(261, 90%, 66%)" />
                ) : (
                  <View className="flex-row items-center">
                    <ExternalLink size={18} className="mr-2" color="hsl(261, 90%, 66%)" />
                    <Text className="font-medium" style={{ color: 'hsl(261, 90%, 66%)' }}>Sign with Amber</Text>
                  </View>
                )}
              </Button>
            )}
            
            <Text className="text-sm text-muted-foreground mb-3">- or -</Text>
            
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
