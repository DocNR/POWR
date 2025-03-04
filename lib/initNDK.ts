// lib/initNDK.ts
import 'react-native-get-random-values'; // This must be the first import
import NDK, { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { NDKMobilePrivateKeySigner } from './mobile-signer';

// Constants for SecureStore
const PRIVATE_KEY_STORAGE_KEY = 'nostr_privkey';

// Default relays
const DEFAULT_RELAYS = [
  'wss://powr.duckdns.org',
  'wss://relay.damus.io', 
  'wss://relay.nostr.band',
  'wss://nos.lol'
];

export async function initializeNDK() {
  console.log('Initializing NDK with mobile adapter...');
  
  // Create a mobile-specific cache adapter with a valid maxSize
  // The error shows maxSize must be greater than 0
  const cacheAdapter = new NDKCacheAdapterSqlite('powr', 1000); // Use 1000 as maxSize
  
  // Initialize NDK with mobile-specific options
  const ndk = new NDK({
    cacheAdapter,
    explicitRelayUrls: DEFAULT_RELAYS,
    enableOutboxModel: true,
    clientName: 'powr',
  });
  
  // Initialize cache adapter
  await cacheAdapter.initialize();
  
  // Connect to relays
  await ndk.connect();
  
  // Set up relay status tracking
  const relayStatus: Record<string, 'connected' | 'connecting' | 'disconnected' | 'error'> = {};
  DEFAULT_RELAYS.forEach(url => {
    relayStatus[url] = 'connecting';
    
    const relay = ndk.pool.getRelay(url);
    if (relay) {
      relay.on('connect', () => {
        console.log(`Connected to relay: ${url}`);
        relayStatus[url] = 'connected';
      });
      
      relay.on('disconnect', () => {
        console.log(`Disconnected from relay: ${url}`);
        relayStatus[url] = 'disconnected';
      });
    }
  });
  
  // Check for saved private key
  try {
    const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
    if (privateKey) {
      console.log('[NDK] Found saved private key, initializing signer');
      
      // Create mobile-specific signer with private key
      const signer = new NDKMobilePrivateKeySigner(privateKey);
      ndk.signer = signer;
      
      // Log success
      console.log('[NDK] Signer initialized successfully');
    }
  } catch (error) {
    console.error('[NDK] Error initializing with saved key:', error);
    // Remove invalid key
    await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
  }
  
  return { ndk, relayStatus };
}