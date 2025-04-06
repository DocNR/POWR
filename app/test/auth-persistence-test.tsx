import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '@/lib/auth/constants';
import { useAuthStore } from '@/lib/auth/AuthStateManager';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { migrateKeysIfNeeded, resetMigration } from '@/lib/auth/persistence/secureStorage';

/**
 * Test screen for debugging authentication persistence issues
 * This component shows the current state of authentication and stored credentials
 */
export default function AuthPersistenceTest() {
  const [storageInfo, setStorageInfo] = useState({
    standardPrivateKey: 'Checking...',
    legacyPrivateKey: 'Checking...',
    ndkStoreKey: 'Checking...',
    pubkey: 'Checking...',
    externalSigner: 'Checking...',
    migrationStatus: 'Checking...'
  });
  
  // Get auth states from both stores (legacy and React Query)
  const authState = useAuthStore((state) => state);
  const { isAuthenticated, currentUser } = useNDKCurrentUser();
  const router = useRouter();
  
  const checkStorage = async () => {
    try {
      // Check all possible storage keys
      const standardPrivateKey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
      const legacyPrivateKey = await SecureStore.getItemAsync('powr.private_key');
      const ndkStoreKey = await SecureStore.getItemAsync('nostr_privkey');
      const pubkey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PUBKEY);
      const externalSigner = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
      const migrationStatus = await SecureStore.getItemAsync('auth_migration_v1_completed');
      
      // Update state with results
      setStorageInfo({
        standardPrivateKey: standardPrivateKey 
          ? `Found (${standardPrivateKey.length} chars)`
          : 'Not found',
        legacyPrivateKey: legacyPrivateKey
          ? `Found (${legacyPrivateKey.length} chars)`
          : 'Not found',
        ndkStoreKey: ndkStoreKey
          ? `Found (${ndkStoreKey.length} chars)`
          : 'Not found',
        pubkey: pubkey 
          ? `Found (${pubkey.substring(0, 8)}...)`
          : 'Not found',
        externalSigner: externalSigner
          ? 'Found'
          : 'Not found',
        migrationStatus: migrationStatus === 'true' 
          ? 'Completed'
          : 'Not run'
      });
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      console.error('Error checking storage:', errorMsg);
      setStorageInfo({
        standardPrivateKey: `Error: ${errorMsg}`,
        legacyPrivateKey: `Error: ${errorMsg}`,
        ndkStoreKey: `Error: ${errorMsg}`,
        pubkey: `Error: ${errorMsg}`,
        externalSigner: `Error: ${errorMsg}`,
        migrationStatus: `Error: ${errorMsg}`
      });
    }
  };
  
  // Check storage when component mounts
  useEffect(() => {
    checkStorage();
  }, []);
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Auth Persistence Test',
          headerLeft: () => Platform.OS === 'ios' ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 15 }}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          ) : undefined,
          headerRight: () => Platform.OS !== 'ios' ? (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          ) : undefined,
        }} 
      />
      
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Auth Persistence Debugger</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zustand Auth State</Text>
          <Text>Status: {authState.status}</Text>
          {authState.status === 'authenticated' && (
            <>
              <Text>User: {authState.user?.pubkey?.substring(0, 8)}...</Text>
              <Text>Method: {authState.method || 'Unknown'}</Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>React Query Auth State</Text>
          <Text>Status: {isAuthenticated ? 'authenticated' : 'unauthenticated'}</Text>
          {isAuthenticated && currentUser?.pubkey && (
            <Text>User: {currentUser.pubkey.substring(0, 8)}...</Text>
          )}
          <Text>User Profile: {currentUser?.profile?.name || 'Not loaded'}</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Secure Storage Status</Text>
          <Text>Standard Key ({SECURE_STORE_KEYS.PRIVATE_KEY}):</Text>
          <Text style={styles.value}>{storageInfo.standardPrivateKey}</Text>
          
          <Text>Legacy Key (powr.private_key):</Text>
          <Text style={styles.value}>{storageInfo.legacyPrivateKey}</Text>
          
          <Text>NDK Store Key (nostr_privkey):</Text>
          <Text style={styles.value}>{storageInfo.ndkStoreKey}</Text>
          
          <Text>Public Key:</Text>
          <Text style={styles.value}>{storageInfo.pubkey}</Text>
          
          <Text>External Signer:</Text>
          <Text style={styles.value}>{storageInfo.externalSigner}</Text>
          
          <Text>Migration Status:</Text>
          <Text style={styles.value}>{storageInfo.migrationStatus}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Refresh Storage Info"
            onPress={checkStorage}
          />
          
          <View style={{ height: 10 }} />
          
          <Button
            title="Run Key Migration Manually"
            onPress={async () => {
              try {
                await migrateKeysIfNeeded();
                console.log('Migration completed successfully');
                checkStorage();
              } catch (e) {
                console.error('Migration failed:', e);
              }
            }}
          />
          
          <View style={{ height: 10 }} />
          
          <Button
            title="Reset Migration Status (DEV)"
            onPress={async () => {
              try {
                await resetMigration();
                console.log('Migration status reset');
                checkStorage();
              } catch (e) {
                console.error('Reset failed:', e);
              }
            }}
          />
          
          <View style={{ height: 10 }} />
          
          <Button
            title="Create Test Keys"
            color="#4CAF50"
            onPress={async () => {
              try {
                // Generate a simple test key
                const testKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
                
                // Store in legacy location for testing migration
                await SecureStore.setItemAsync('powr.private_key', testKey);
                console.log('Test key created in legacy location');
                checkStorage();
              } catch (e) {
                console.error('Failed to create test key:', e);
              }
            }}
          />
          
          <View style={{ height: 10 }} />
          
          <Button
            title="Clear All Auth Keys"
            color="#F44336"
            onPress={async () => {
              try {
                await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
                await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PUBKEY);
                await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
                await SecureStore.deleteItemAsync('powr.private_key');
                await SecureStore.deleteItemAsync('nostr_privkey');
                await SecureStore.deleteItemAsync('auth_migration_v1_completed');
                console.log('All keys cleared');
                checkStorage();
              } catch (e) {
                console.error('Failed to clear keys:', e);
              }
            }}
          />
        </View>
        
        <View style={styles.instructions}>
          <Text style={styles.sectionTitle}>Testing Instructions</Text>
          <Text>1. Click "Clear All Auth Keys" to start fresh</Text>
          <Text>2. Click "Create Test Keys" to add a key in the legacy location</Text>
          <Text>3. Force close and restart the app</Text>
          <Text>4. Return to this screen and check if auth persisted</Text>
          <Text>5. Check "Migration Status" to see if keys were migrated</Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  value: {
    marginBottom: 8,
    paddingLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  instructions: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 30,
  }
});
