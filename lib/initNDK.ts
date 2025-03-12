// lib/initNDK.ts
import 'react-native-get-random-values'; // This must be the first import
import NDK, { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { RelayService, DEFAULT_RELAYS } from '@/lib/db/services/RelayService';
import { extendNDK } from '@/types/ndk-extensions';

/**
 * Initialize NDK with relays
 */
export async function initializeNDK() {
  console.log('[NDK] Initializing NDK with mobile adapter...');
  
  // Create a mobile-specific cache adapter
  const cacheAdapter = new NDKCacheAdapterSqlite('powr', 1000);
  await cacheAdapter.initialize();
  
  // Initialize relay service
  const relayService = new RelayService();
  relayService.enableDebug();
  
  // Create settings store
  const settingsStore = {
    get: SecureStore.getItemAsync,
    set: SecureStore.setItemAsync,
    delete: SecureStore.deleteItemAsync,
    getSync: (key: string) => {
      console.log('[Settings] Warning: getSync called but returning null, not supported in this implementation');
      return null;
    }
  };
  
  // Initialize NDK with default relays first
  console.log(`[NDK] Creating NDK instance with default relays`);
  let ndk = new NDK({
    cacheAdapter,
    explicitRelayUrls: DEFAULT_RELAYS,
    enableOutboxModel: true,
    autoConnectUserRelays: true,
    clientName: 'powr',
  });
  
  // Extend NDK with helper methods for better compatibility
  ndk = extendNDK(ndk);
  
  // Set the NDK instance in the RelayService
  relayService.setNDK(ndk);
  
  try {
    console.log('[NDK] Connecting to relays...');
    await ndk.connect();
    
    // Wait a moment for connections to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get updated relay statuses
    const relaysWithStatus = await relayService.getAllRelaysWithStatus();
    
    // Count connected relays
    const connectedRelays = relaysWithStatus
      .filter(relay => relay.status === 'connected')
      .map(relay => relay.url);
    
    console.log(`[NDK] Connected to ${connectedRelays.length}/${relaysWithStatus.length} relays`);
    
    // Log detailed relay status
    console.log('[NDK] Detailed relay status:');
    relaysWithStatus.forEach(relay => {
      console.log(`  - ${relay.url}: ${relay.status}`);
    });
    
    return { 
      ndk, 
      relayService,
      connectedRelayCount: connectedRelays.length,
      connectedRelays
    };
  } catch (error) {
    console.error('[NDK] Error during connection:', error);
    // Still return the NDK instance so the app can work offline
    return { 
      ndk, 
      relayService,
      connectedRelayCount: 0,
      connectedRelays: []
    };
  }
}