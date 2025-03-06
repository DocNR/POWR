// lib/initNDK.ts
import 'react-native-get-random-values'; // This must be the first import
import NDK, { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';

// Use the same default relays you have in your current implementation
const DEFAULT_RELAYS = [
  'wss://powr.duckdns.org',
  'wss://relay.damus.io', 
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://nos.lol'
];

export async function initializeNDK() {
  console.log('Initializing NDK with mobile adapter...');
  
  // Create a mobile-specific cache adapter
  const cacheAdapter = new NDKCacheAdapterSqlite('powr', 1000);
  
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
  
  return { ndk };
}