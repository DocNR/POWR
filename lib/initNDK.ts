// lib/initNDK.ts
import 'react-native-get-random-values'; // This must be the first import
import NDK, { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseSync } from 'expo-sqlite';
import { RelayService, DEFAULT_RELAYS } from '@/lib/db/services/RelayService';
import { NDKCommon } from '@/types/ndk-common';
import { extendNDK } from '@/types/ndk-extensions';

/**
 * Initialize NDK with relays from database or defaults
 */
export async function initializeNDK() {
  console.log('[NDK] Initializing NDK with mobile adapter...');
  
  // Create a mobile-specific cache adapter
  const cacheAdapter = new NDKCacheAdapterSqlite('powr', 1000);
  
  // Initialize database and relay service
  const db = openDatabaseSync('powr.db');
  const relayService = new RelayService(db);
  
  // Load relays from database or use defaults
  console.log('[NDK] Loading relay configuration...');
  let relays: string[];
  
  try {
    // Try to initialize relays from database (will add defaults if none exist)
    relays = await relayService.initializeRelays();
    console.log(`[NDK] Loaded ${relays.length} relays from database:`, relays);
  } catch (error) {
    console.error('[NDK] Error loading relays from database:', error);
    console.log('[NDK] Falling back to default relays');
    relays = DEFAULT_RELAYS;
  }
  
  // Create settings store
  const settingsStore = {
    get: SecureStore.getItemAsync,
    set: SecureStore.setItemAsync,
    delete: SecureStore.deleteItemAsync,
    getSync: (key: string) => {
      // This is a synchronous wrapper - for mobile we need to handle this differently
      // since SecureStore is async-only
      console.log('[Settings] Warning: getSync called but returning null, not supported in this implementation');
      return null;
    }
  };
  
  // Initialize NDK with options
  console.log(`[NDK] Creating NDK instance with ${relays.length} relays`);
  let ndk = new NDK({
    cacheAdapter,
    explicitRelayUrls: relays,
    enableOutboxModel: true,
    autoConnectUserRelays: true,
    clientName: 'powr',
  });
  
  // Extend NDK with helper methods for better compatibility
  ndk = extendNDK(ndk);
  
  // Initialize cache adapter
  await cacheAdapter.initialize();
  
  // Set up the RelayService with the NDK instance for future use
  relayService.setNDK(ndk as unknown as NDKCommon);
  
  // Setup relay status tracking
  const relayStatus: Record<string, 'connected' | 'connecting' | 'disconnected' | 'error'> = {};
  relays.forEach(url => {
    relayStatus[url] = 'connecting';
  });
  
  // Set up listeners before connecting
  relays.forEach(url => {
    const relay = ndk.pool.getRelay(url);
    if (relay) {
      // Connection success
      relay.on('connect', () => {
        console.log(`[NDK] Relay connected: ${url}`);
        relayStatus[url] = 'connected';
      });
      
      // Connection closed
      relay.on('disconnect', () => {
        console.log(`[NDK] Relay disconnected: ${url}`);
        relayStatus[url] = 'disconnected';
      });
      
      // For errors, use the notice event which is used for errors in NDK
      relay.on('notice', (notice: string) => {
        console.error(`[NDK] Relay notice/error for ${url}:`, notice);
        relayStatus[url] = 'error';
      });
    }
  });
  
  try {
    // Connect to relays
    console.log('[NDK] Connecting to relays...');
    await ndk.connect();
    
    // Wait a moment for connections to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Count connected relays
    const connectedRelays = Object.entries(relayStatus)
      .filter(([_, status]) => status === 'connected')
      .map(([url]) => url);
    
    console.log(`[NDK] Connected to ${connectedRelays.length}/${relays.length} relays`);
    
    return { 
      ndk, 
      relayStatus,
      relayService,
      connectedRelayCount: connectedRelays.length,
      connectedRelays
    };
  } catch (error) {
    console.error('[NDK] Error during connection:', error);
    // Still return the NDK instance so the app can work offline
    return { 
      ndk, 
      relayStatus,
      relayService,
      connectedRelayCount: 0,
      connectedRelays: []
    };
  }
}