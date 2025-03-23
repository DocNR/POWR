// components/RelayInitializer.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRelayStore } from '@/lib/stores/relayStore';
import { useNDKStore } from '@/lib/stores/ndk';
import { useConnectivity } from '@/lib/db/services/ConnectivityService';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';

/**
 * A component to initialize and load relay data when the app starts
 * This should be placed high in the component tree, ideally in _layout.tsx
 */
export default function RelayInitializer() {
  const { loadRelays } = useRelayStore();
  const { ndk } = useNDKStore();
  const { isOnline } = useConnectivity();

  // Load relays when NDK is initialized and network is available
  useEffect(() => {
    if (ndk && isOnline) {
      console.log('[RelayInitializer] NDK available and online, loading relays...');
      loadRelays().catch(error => 
        console.error('[RelayInitializer] Error loading relays:', error)
      );
    } else if (ndk) {
      console.log('[RelayInitializer] NDK available but offline, skipping relay loading');
    }
  }, [ndk, isOnline]);
  
  // Register for connectivity restoration events
  useEffect(() => {
    if (!ndk) return;
    
    // Add sync listener to retry when connectivity is restored
    const removeListener = ConnectivityService.getInstance().addSyncListener(() => {
      if (ndk) {
        console.log('[RelayInitializer] Network connectivity restored, attempting to load relays');
        loadRelays().catch(error => 
          console.error('[RelayInitializer] Error loading relays on reconnect:', error)
        );
      }
    });
    
    return removeListener;
  }, [ndk, loadRelays]);

  // This component doesn't render anything
  return null;
}
