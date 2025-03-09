// lib/stores/relayStore.ts
import { create } from 'zustand';
import { createSelectors } from '@/utils/createSelectors';
import type { NDKRelay } from '@nostr-dev-kit/ndk-mobile';
import { RelayWithStatus } from '@/lib/db/services/RelayService';
import { useNDKStore } from './ndk';
import { openDatabaseSync } from 'expo-sqlite';
import { RelayService } from '@/lib/db/services/RelayService';

interface RelayStoreState {
  relays: RelayWithStatus[];
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: Error | null;
}

interface RelayStoreActions {
  // Core actions
  loadRelays: () => Promise<void>;
  addRelay: (url: string, read?: boolean, write?: boolean) => Promise<void>;
  removeRelay: (url: string) => Promise<void>;
  updateRelay: (url: string, changes: Partial<RelayWithStatus>) => Promise<void>;
  applyChanges: () => Promise<boolean>;
  resetToDefaults: () => Promise<void>;
  
  // Advanced actions
  importFromMetadata: (pubkey: string) => Promise<void>;
  publishRelayList: () => Promise<boolean>;
}

const useRelayStoreBase = create<RelayStoreState & RelayStoreActions>((set, get) => {
  // Helper to get the relay service
  const getRelayService = () => {
    const db = openDatabaseSync('powr.db');
    return new RelayService(db);
  };
  
  return {
    // State
    relays: [],
    isLoading: true,
    isRefreshing: false,
    isSaving: false,
    error: null,
    
    // Actions
    loadRelays: async () => {
      try {
        set({ isRefreshing: true, error: null });
        
        const relayService = getRelayService();
        const { ndk } = useNDKStore.getState();
        
        if (ndk) {
          relayService.setNDK(ndk);
        }
        
        const relays = await relayService.getAllRelaysWithStatus();
        
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
        const relayService = getRelayService();
        await relayService.addRelay(url, read, write);
        
        // Reload relays to get the updated list with status
        await get().loadRelays();
      } catch (error) {
        console.error('[RelayStore] Error adding relay:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to add relay') });
        throw error;
      }
    },
    
    removeRelay: async (url) => {
      try {
        const relayService = getRelayService();
        await relayService.removeRelay(url);
        
        // Update local state without reload to avoid flicker
        set(state => ({
          relays: state.relays.filter(relay => relay.url !== url)
        }));
      } catch (error) {
        console.error('[RelayStore] Error removing relay:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to remove relay') });
        throw error;
      }
    },
    
    updateRelay: async (url, changes) => {
      try {
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
        set({ isSaving: true, error: null });
        
        const relayService = getRelayService();
        const { ndk } = useNDKStore.getState();
        
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
        const relayService = getRelayService();
        await relayService.resetToDefaults();
        
        // Reload relays to get the updated list
        await get().loadRelays();
      } catch (error) {
        console.error('[RelayStore] Error resetting relays:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to reset relays') });
        throw error;
      }
    },
    
    importFromMetadata: async (pubkey) => {
      try {
        set({ isRefreshing: true, error: null });
        
        const relayService = getRelayService();
        const { ndk } = useNDKStore.getState();
        
        if (!ndk) {
          throw new Error('NDK not initialized');
        }
        
        // Import relays from the user's metadata
        await relayService.importFromUserMetadata(pubkey, ndk);
        
        // Reload relays to get the updated list
        await get().loadRelays();
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
        const relayService = getRelayService();
        const { ndk } = useNDKStore.getState();
        
        if (!ndk) {
          throw new Error('NDK not initialized');
        }
        
        // Publish relay list to the network
        return await relayService.publishRelayList(ndk);
      } catch (error) {
        console.error('[RelayStore] Error publishing relay list:', error);
        set({ error: error instanceof Error ? error : new Error('Failed to publish relay list') });
        throw error;
      }
    }
  };
});

// Create selectors for better performance with React
export const useRelayStore = createSelectors(useRelayStoreBase);

// Export individual hooks for specific use cases
export function useLoadRelays() {
  const loadRelays = useRelayStore(state => state.loadRelays);
  const isLoading = useRelayStore(state => state.isLoading);
  const isRefreshing = useRelayStore(state => state.isRefreshing);
  
  return { loadRelays, isLoading, isRefreshing };
}