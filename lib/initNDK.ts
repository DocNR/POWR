// lib/initNDK.ts
import 'react-native-get-random-values'; // This must be the first import
import NDK, { NDKCacheAdapterSqlite, NDKEvent, NDKRelay } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { openDatabaseSync } from 'expo-sqlite';
import { RelayService, DEFAULT_RELAYS } from '@/lib/db/services/RelayService';

/**
 * Initialize NDK with relays from database or defaults
 */
export async function initializeNDK() {
  console.log('Initializing NDK with mobile adapter...');
  
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
    console.log(`[NDK] Loaded ${relays.length} relays from database`);
  } catch (error) {
    console.error('[NDK] Error loading relays from database:', error);
    console.log('[NDK] Falling back to default relays');
    relays = DEFAULT_RELAYS;
  }
  
  // Initialize NDK with options
  const ndk = new NDK({
    cacheAdapter,
    explicitRelayUrls: relays,
    enableOutboxModel: true,
    autoConnectUserRelays: true,
    clientName: 'powr',
  });
  
  // Initialize cache adapter
  await cacheAdapter.initialize();
  
  // Set up the RelayService with the NDK instance for future use
  relayService.setNDK(ndk);
  
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
  
  // Function to check relay connection status
  const checkRelayConnections = () => {
    const connected = Object.entries(relayStatus)
      .filter(([_, status]) => status === 'connected')
      .map(([url]) => url);
    
    console.log(`[NDK] Connected relays: ${connected.length}/${relays.length}`);
    return {
      connectedCount: connected.length,
      connectedRelays: connected
    };
  };
  
  try {
    // Connect to relays with a timeout
    console.log('[NDK] Connecting to relays...');
    
    // Create a promise that resolves when connected to at least one relay
    const connectionPromise = new Promise<void>((resolve, reject) => {
      // Function to check if we have at least one connection
      const checkConnection = () => {
        const { connectedCount } = checkRelayConnections();
        if (connectedCount > 0) {
          console.log('[NDK] Successfully connected to at least one relay');
          resolve();
        }
      };
      
      // Check immediately after connecting
      ndk.pool.on('relay:connect', checkConnection);
      
      // Set a timeout for connection
      setTimeout(() => {
        const { connectedCount } = checkRelayConnections();
        if (connectedCount === 0) {
          console.warn('[NDK] Connection timeout - no relays connected');
          // Don't reject, as we can still work offline
          resolve();
        }
      }, 5000);
    });
    
    // Initiate the connection
    await ndk.connect();
    
    // Wait for either connection or timeout
    await connectionPromise;
    
    // Final connection check
    const { connectedCount, connectedRelays } = checkRelayConnections();
    
    return { 
      ndk, 
      relayStatus,
      connectedRelayCount: connectedCount,
      connectedRelays
    };
  } catch (error) {
    console.error('[NDK] Error during connection:', error);
    // Still return the NDK instance so the app can work offline
    return { 
      ndk, 
      relayStatus,
      connectedRelayCount: 0,
      connectedRelays: []
    };
  }
}

/**
 * Helper function to test publishing to relays
 */
export async function testRelayPublishing(ndk: NDK): Promise<boolean> {
  try {
    console.log('[NDK] Testing relay publishing...');
    
    // Create a simple test event - use NDKEvent constructor instead of getEvent()
    const testEvent = new NDKEvent(ndk);
    testEvent.kind = 1;
    testEvent.content = 'Test message from POWR app';
    testEvent.tags = [['t', 'test']];
    
    // Try to sign and publish with timeout
    const publishPromise = Promise.race([
      testEvent.publish(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Publish timeout')), 5000)
      )
    ]);
    
    await publishPromise;
    console.log('[NDK] Test publish successful');
    return true;
  } catch (error) {
    console.error('[NDK] Test publish failed:', error);
    return false;
  }
}