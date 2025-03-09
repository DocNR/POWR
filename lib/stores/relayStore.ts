// lib/stores/relayStore.ts
import { create } from 'zustand';
import { openDatabaseSync } from 'expo-sqlite';
import type { RelayWithStatus } from '@/lib/db/services/RelayService';
import { RelayService } from '@/lib/db/services/RelayService';
import { useNDKStore } from './ndk';
import { NDKCommon } from '@/types/ndk-common';

// Create a singleton instance of RelayService
let relayServiceInstance: RelayService | null = null;

const getRelayService = (): RelayService => {
  if (!relayServiceInstance) {
    const db = openDatabaseSync('powr.db');
    relayServiceInstance = new RelayService(db);
    console.log('[RelayStore] Created RelayService instance');
  }
  return relayServiceInstance;
};

// Define state interface
interface RelayStoreState {
  relays: RelayWithStatus[];
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: Error | null;
}

// Define actions interface
interface RelayStoreActions {
  loadRelays: () => Promise<void>;
  addRelay: (url: string, read?: boolean, write?: boolean) => Promise<void>;
  removeRelay: (url: string) => Promise<void>;
  updateRelay: (url: string, changes: Partial<RelayWithStatus>) => Promise<void>;
  applyChanges: () => Promise<boolean>;
  resetToDefaults: () => Promise<void>;
  importFromMetadata: (pubkey: string) => Promise<void>;
  publishRelayList: () => Promise<boolean>;
}

// Create the relay store
export const useRelayStore = create<RelayStoreState & RelayStoreActions>((set, get) => {
  return {
    // Initial state
    relays: [],
    isLoading: true,
    isRefreshing: false,
    isSaving: false,
    error: null,
    
    // Action implementations
    loadRelays: async () => {
      try {
        console.log('[RelayStore] Loading relays...');
        set({ isRefreshing: true, error: null });
        
        const relayService = getRelayService();
        const ndkState = useNDKStore.getState();
        const ndk = ndkState.ndk as unknown as NDKCommon;
        
        if (ndk) {
          relayService.setNDK(ndk);
        }
        
        const relays = await relayService.getAllRelaysWithStatus();
        console.log(`[RelayStore] Loaded ${relays.length} relays with status`);
        
        set({ 
          relays,
          isLoading: false,
          isRefreshing: false
        });
      } catch (error) {
        console.error('[RelayStore] Error loading relays:', error);
        set({ 
          error: error instanceof Error ? error : new Error('Failed to load relays'),
          isLoading: false,
          isRefreshing: false
        });
      }
    },
    
    addRelay: async (url, read = true, write = true) => {
      try {
        console.log(`[RelayStore] Adding relay: ${url}`);
        const relayService = getRelayService();
        await relayService.addRelay(url, read, write);
        
        // Reload relays to get the updated list with status
        await get().loadRelays();
        console.log(`[RelayStore] Successfully added relay: ${url}`);
      } catch (error) {
        console.error('[RelayStore] Error adding relay:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to add relay') });
        throw error;
      }
    },
    
    removeRelay: async (url) => {
      try {
        console.log(`[RelayStore] Removing relay: ${url}`);
        const relayService = getRelayService();
        await relayService.removeRelay(url);
        
        // Update local state without reload to avoid flicker
        set(state => ({
          relays: state.relays.filter(relay => relay.url !== url)
        }));
        console.log(`[RelayStore] Successfully removed relay: ${url}`);
      } catch (error) {
        console.error('[RelayStore] Error removing relay:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to remove relay') });
        throw error;
      }
    },
    
    updateRelay: async (url, changes) => {
      try {
        console.log(`[RelayStore] Updating relay: ${url}`, changes);
        const relayService = getRelayService();
        
        // Extract only valid properties for the service
        const validChanges: Partial<RelayWithStatus> = {};
        if (changes.read !== undefined) validChanges.read = changes.read;
        if (changes.write !== undefined) validChanges.write = changes.write;
        if (changes.priority !== undefined) validChanges.priority = changes.priority;
        
        await relayService.updateRelay(url, validChanges);
        
        // Update local state to reflect the changes
        set(state => ({
          relays: state.relays.map(relay => 
            relay.url === url ? { ...relay, ...validChanges } : relay
          )
        }));
        console.log(`[RelayStore] Successfully updated relay: ${url}`);
      } catch (error) {
        console.error('[RelayStore] Error updating relay:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to update relay') });
        throw error;
      }
    },
    
    applyChanges: async () => {
      // Prevent multiple simultaneous calls
      if (get().isSaving) return false;
      
      try {
        console.log('[RelayStore] Applying relay changes...');
        set({ isSaving: true, error: null });
        
        const relayService = getRelayService();
        const ndkState = useNDKStore.getState();
        const ndk = ndkState.ndk as unknown as NDKCommon;
        
        if (!ndk) {
          throw new Error('NDK not initialized');
        }
        
        // Apply relay config changes to NDK
        const success = await relayService.applyRelayConfig(ndk);
        
        // Wait a moment before reloading to give connections time to establish
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reload relays to reflect updated connection status
        await get().loadRelays();
        
        set({ isSaving: false });
        console.log('[RelayStore] Successfully applied relay changes');
        return success;
      } catch (error) {
        console.error('[RelayStore] Error applying changes:', error);
        set({ 
          error: error instanceof Error ? error : new Error('Failed to apply changes'),
          isSaving: false 
        });
        return false;
      }
    },
    
    resetToDefaults: async () => {
      try {
        console.log('[RelayStore] Resetting relays to defaults...');
        const relayService = getRelayService();
        await relayService.resetToDefaults();
        
        // Reload relays to get the updated list
        await get().loadRelays();
        console.log('[RelayStore] Successfully reset relays to defaults');
      } catch (error) {
        console.error('[RelayStore] Error resetting relays:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to reset relays') });
        throw error;
      }
    },
    
    importFromMetadata: async (pubkey) => {
      try {
        console.log('[RelayStore] Importing relays from user metadata...');
        set({ isRefreshing: true, error: null });
        
        const relayService = getRelayService();
        const ndkState = useNDKStore.getState();
        const ndk = ndkState.ndk;
        
        if (!ndk) {
          throw new Error('NDK not initialized');
        }
        
        // Import relays from the user's metadata
        await relayService.importFromUserMetadata(pubkey, ndk);
        
        // Reload relays to get the updated list
        await get().loadRelays();
        console.log('[RelayStore] Successfully imported relays from metadata');
      } catch (error) {
        console.error('[RelayStore] Error importing from metadata:', error);
        set({ 
          error: error instanceof Error ? error : new Error('Failed to import from metadata'),
          isRefreshing: false
        });
        throw error;
      }
    },
    
    publishRelayList: async () => {
      try {
        console.log('[RelayStore] Publishing relay list...');
        const relayService = getRelayService();
        const ndkState = useNDKStore.getState();
        const ndk = ndkState.ndk;
        
        if (!ndk) {
          throw new Error('NDK not initialized');
        }
        
        // Publish relay list to the network
        const result = await relayService.publishRelayList(ndk);
        console.log('[RelayStore] Successfully published relay list');
        return result;
      } catch (error) {
        console.error('[RelayStore] Error publishing relay list:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to publish relay list') });
        throw error;
      }
    }
  };
});

// Export individual hooks for specific use cases
export function useLoadRelays() {
  return {
    loadRelays: useRelayStore(state => state.loadRelays),
    isLoading: useRelayStore(state => state.isLoading),
    isRefreshing: useRelayStore(state => state.isRefreshing)
  };
}