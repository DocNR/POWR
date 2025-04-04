// lib/initNDK.ts
import 'react-native-get-random-values'; // This must be the first import
import NDK, { NDKCacheAdapterSqlite } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { RelayService, DEFAULT_RELAYS } from '@/lib/db/services/RelayService';
import { extendNDK } from '@/types/ndk-extensions';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';
import { profileImageCache } from '@/lib/db/services/ProfileImageCache';

// Connection timeout in milliseconds
const CONNECTION_TIMEOUT = 5000;

/**
 * Initialize NDK with relays
 * @param initContext Optional string indicating which system is initializing NDK
 */
export async function initializeNDK(initContext?: string) {
  console.log(`[NDK] Initializing NDK with mobile adapter... (context: ${initContext || 'unknown'})`);
  
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
  console.log(`[NDK] Creating NDK instance with default relays (context: ${initContext || 'unknown'})`);
  let ndk = new NDK({
    cacheAdapter,
    explicitRelayUrls: DEFAULT_RELAYS,
    enableOutboxModel: true,
    autoConnectUserRelays: true,
    clientName: 'powr',
  });
  
  // Extend NDK with helper methods for better compatibility
  ndk = extendNDK(ndk);
  
  // Set the NDK instance in services
  relayService.setNDK(ndk);
  profileImageCache.setNDK(ndk);
  
  // Check network connectivity before attempting to connect
  const connectivityService = ConnectivityService.getInstance();
  const isOnline = await connectivityService.checkNetworkStatus();
  
  if (!isOnline) {
    console.log(`[NDK] No network connectivity detected, skipping relay connections (context: ${initContext || 'unknown'})`);
    return { 
      ndk, 
      relayService,
      connectedRelayCount: 0,
      connectedRelays: [],
      offlineMode: true,
      initContext
    };
  }
  
  try {
    console.log(`[NDK] Connecting to relays with timeout... (context: ${initContext || 'unknown'})`);
    
    // Create a promise that will reject after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), CONNECTION_TIMEOUT);
    });
    
    // Race the connect operation against the timeout
    await Promise.race([
      ndk.connect(),
      timeoutPromise
    ]).catch(error => {
      if (error.message === 'Connection timeout') {
        console.warn(`[NDK] Connection timeout reached, continuing in offline mode (context: ${initContext || 'unknown'})`);
        throw error; // Re-throw to be caught by outer try/catch
      }
      throw error;
    });
    
    // Wait a moment for connections to establish (but with a shorter timeout)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get updated relay statuses
    const relaysWithStatus = await relayService.getAllRelaysWithStatus();
    
    // Count connected relays
    const connectedRelays = relaysWithStatus
      .filter(relay => relay.status === 'connected')
      .map(relay => relay.url);
    
    console.log(`[NDK] Connected to ${connectedRelays.length}/${relaysWithStatus.length} relays (context: ${initContext || 'unknown'})`);
    
    // Log detailed relay status
    console.log(`[NDK] Detailed relay status (context: ${initContext || 'unknown'}):`);
    relaysWithStatus.forEach(relay => {
      console.log(`  - ${relay.url}: ${relay.status}`);
    });
    
    return { 
      ndk, 
      relayService,
      connectedRelayCount: connectedRelays.length,
      connectedRelays,
      offlineMode: connectedRelays.length === 0,
      initContext
    };
  } catch (error) {
    console.error(`[NDK] Error during connection (context: ${initContext || 'unknown'}):`, error);
    // Still return the NDK instance so the app can work offline
    return { 
      ndk, 
      relayService,
      connectedRelayCount: 0,
      connectedRelays: [],
      offlineMode: true,
      initContext
    };
  }
}
