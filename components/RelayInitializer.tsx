// components/RelayInitializer.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRelayStore } from '@/lib/stores/relayStore';
import { useNDKStore } from '@/lib/stores/ndk';

/**
 * A component to initialize and load relay data when the app starts
 * This should be placed high in the component tree, ideally in _layout.tsx
 */
export default function RelayInitializer() {
  const { loadRelays } = useRelayStore();
  const { ndk } = useNDKStore();

  // Load relays when NDK is initialized
  useEffect(() => {
    if (ndk) {
      console.log('[RelayInitializer] NDK available, loading relays...');
      loadRelays().catch(error => 
        console.error('[RelayInitializer] Error loading relays:', error)
      );
    }
  }, [ndk]);

  // This component doesn't render anything
  return null;
}