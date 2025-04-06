// components/AuthDebugScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@/lib/auth/constants';
import { useAuthStore } from '@/lib/auth/AuthStateManager';

export default function AuthDebugScreen() {
  const [storageInfo, setStorageInfo] = useState({
    privateKey: 'Checking...',
    pubkey: 'Checking...',
    externalSigner: 'Checking...'
  });
  const authState = useAuthStore((state) => state);

  const checkStorage = async () => {
    try {
      // Check using the defined constants
      const privateKey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
      const pubkey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PUBKEY);
      const externalSigner = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
      
      // Also check the legacy key
      const legacyKey = await SecureStore.getItemAsync('powr.private_key');
      
      setStorageInfo({
        privateKey: privateKey 
          ? `Found (${privateKey.length} chars)${legacyKey ? ' [also in legacy]' : ''}`
          : 'Not found',
        pubkey: pubkey 
          ? `Found (${pubkey.substring(0, 8)}...)`
          : 'Not found',
        externalSigner: externalSigner
          ? 'Found'
          : 'Not found'
      });
    } catch (error: any) {
      console.error('Error checking storage:', error);
      const errorMessage = error && error.message ? error.message : 'Unknown error';
      setStorageInfo({
        privateKey: `Error: ${errorMessage}`,
        pubkey: `Error: ${errorMessage}`,
        externalSigner: `Error: ${errorMessage}`
      });
    }
  };
  
  useEffect(() => {
    checkStorage();
  }, []);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Debug</Text>
      
      <View style={styles.stateContainer}>
        <Text style={styles.sectionTitle}>Auth State</Text>
        <Text>Status: {authState.status}</Text>
        {authState.status === 'authenticated' && (
          <>
            <Text>User: {authState.user.pubkey.substring(0, 8)}...</Text>
            <Text>Method: {authState.method}</Text>
          </>
        )}
      </View>
      
      <View style={styles.storageContainer}>
        <Text style={styles.sectionTitle}>Secure Storage</Text>
        <Text>Private Key: {storageInfo.privateKey}</Text>
        <Text>Public Key: {storageInfo.pubkey}</Text>
        <Text>External Signer: {storageInfo.externalSigner}</Text>
      </View>
      
      <Button title="Refresh Storage Info" onPress={checkStorage} />
      
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Debug Actions</Text>
        <Button 
          title="Move Keys from Legacy to Current" 
          onPress={async () => {
            const legacyKey = await SecureStore.getItemAsync('powr.private_key');
            if (legacyKey) {
              await SecureStore.setItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY, legacyKey);
              console.log('Moved key from legacy to current');
              checkStorage();
            } else {
              console.log('No legacy key found');
            }
          }} 
        />
        <Button 
          title="Clear All Keys" 
          onPress={async () => {
            await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
            await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PUBKEY);
            await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
            await SecureStore.deleteItemAsync('powr.private_key');
            console.log('Cleared all keys');
            checkStorage();
          }} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stateContainer: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  storageContainer: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  actionsContainer: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  }
});
