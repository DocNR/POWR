// stores/ndk.ts
import '@/lib/crypto-polyfill'; // Import crypto polyfill first
import { create } from 'zustand';
import NDK, { NDKFilter, NDKEvent as NDKEventBase } from '@nostr-dev-kit/ndk';
import { NDKUser } from '@nostr-dev-kit/ndk-mobile';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { NDKMobilePrivateKeySigner, generateKeyPair } from '@/lib/mobile-signer';
import { setupCryptoPolyfill } from '@/lib/crypto-polyfill';

// Constants for SecureStore
const PRIVATE_KEY_STORAGE_KEY = 'nostr_privkey';

// Default relays
const DEFAULT_RELAYS = [
  'wss://powr.duckdns.org',  // Your primary relay
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol'
];

type NDKStoreState = {
  ndk: NDK | null;
  currentUser: NDKUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  relayStatus: Record<string, 'connected' | 'connecting' | 'disconnected' | 'error'>;
};

type NDKStoreActions = {
  init: () => Promise<void>;
  login: (privateKey?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  generateKeys: () => { privateKey: string; publicKey: string; nsec: string; npub: string };
  publishEvent: (kind: number, content: string, tags: string[][]) => Promise<NDKEvent | null>;
  fetchEventsByFilter: (filter: NDKFilter) => Promise<NDKEvent[]>;
};

export const useNDKStore = create<NDKStoreState & NDKStoreActions>((set, get) => ({
  // State properties
  ndk: null,
  currentUser: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  relayStatus: {},

  // Initialize NDK
  init: async () => {
    try {
      console.log('[NDK] Initializing...');
      console.log('NDK init crypto polyfill check:', {
        cryptoDefined: typeof global.crypto !== 'undefined',
        getRandomValuesDefined: typeof global.crypto?.getRandomValues !== 'undefined'
      });
      
      set({ isLoading: true, error: null });

      // Initialize relay status tracking
      const relayStatus: Record<string, 'connected' | 'connecting' | 'disconnected' | 'error'> = {};
      DEFAULT_RELAYS.forEach(r => {
        relayStatus[r] = 'connecting';
      });
      set({ relayStatus });

      // Initialize NDK with relays
      const ndk = new NDK({
        explicitRelayUrls: DEFAULT_RELAYS
      });
      
      // Connect to relays
      await ndk.connect();
      
      // Setup relay status updates
      DEFAULT_RELAYS.forEach(url => {
        const relay = ndk.pool.getRelay(url);
        if (relay) {
          relay.on('connect', () => {
            set(state => ({
              relayStatus: {
                ...state.relayStatus,
                [url]: 'connected'
              }
            }));
          });
          
          relay.on('disconnect', () => {
            set(state => ({
              relayStatus: {
                ...state.relayStatus,
                [url]: 'disconnected'
              }
            }));
          });
          
          // Set error status if not connected within timeout
          setTimeout(() => {
            set(state => {
              if (state.relayStatus[url] === 'connecting') {
                return {
                  relayStatus: {
                    ...state.relayStatus,
                    [url]: 'error'
                  }
                };
              }
              return state;
            });
          }, 10000);
        }
      });
      
      set({ ndk });
      
      // Check for saved private key
      const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      if (privateKey) {
        console.log('[NDK] Found saved private key, initializing signer');
        
        try {
          // Create mobile-specific signer with private key
          const signer = new NDKMobilePrivateKeySigner(privateKey);
          ndk.signer = signer;
          
          // Get user and profile
          const user = await ndk.signer.user();
          
          if (user) {
            console.log('[NDK] User authenticated:', user.pubkey);
            await user.fetchProfile();
            set({ 
              currentUser: user,
              isAuthenticated: true 
            });
          }
        } catch (error) {
          console.error('[NDK] Error initializing with saved key:', error);
          // Remove invalid key
          await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('[NDK] Initialization error:', error);
      set({ 
        error: error instanceof Error ? error : new Error('Failed to initialize NDK'),
        isLoading: false
      });
    }
  },
  
  login: async (privateKey?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { ndk } = get();
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      // If no private key is provided, generate one
      let userPrivateKey = privateKey;
      if (!userPrivateKey) {
        const { privateKey: generatedKey } = get().generateKeys();
        userPrivateKey = generatedKey;
      }
      
      // Create mobile-specific signer with private key
      const signer = new NDKMobilePrivateKeySigner(userPrivateKey);
      ndk.signer = signer;
      
      // Get user
      const user = await ndk.signer.user();
      if (!user) {
        throw new Error('Could not get user from signer');
      }
      
      // Fetch user profile
      console.log('[NDK] Fetching user profile');
      await user.fetchProfile();
      
      // Process profile data to ensure image property is set
      if (user.profile) {
        if (!user.profile.image && (user.profile as any).picture) {
          user.profile.image = (user.profile as any).picture;
        }
        
        console.log('[NDK] User profile loaded:', user.profile);
      }
      
      // Save the private key securely
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, userPrivateKey);
      
      set({ 
        currentUser: user,
        isAuthenticated: true,
        isLoading: false
      });
      
      return true;
    } catch (error) {
      console.error('[NDK] Login error:', error);
      set({
        error: error instanceof Error ? error : new Error('Failed to login'),
        isLoading: false
      });
      return false;
    }
  },
  
  logout: async () => {
    try {
      // Remove private key from secure storage
      await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
      
      // Reset NDK state
      const { ndk } = get();
      if (ndk) {
        ndk.signer = undefined;
      }
      
      // Reset the user state
      set({ 
        currentUser: null,
        isAuthenticated: false 
      });
      
      console.log('[NDK] User logged out successfully');
    } catch (error) {
      console.error('[NDK] Logout error:', error);
    }
  },
  
  generateKeys: () => {
    try {
      return generateKeyPair();
    } catch (error) {
      console.error('[NDK] Error generating keys:', error);
      set({ error: error instanceof Error ? error : new Error('Failed to generate keys') });
      throw error;
    }
  },
  
  // In your publishEvent function in ndk.ts:
  publishEvent: async (kind: number, content: string, tags: string[][]) => {
    try {
      const { ndk, isAuthenticated, currentUser } = get();
      
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      if (!isAuthenticated || !currentUser) {
        throw new Error('Not authenticated');
      }
      
      // Define custom functions we'll use to override crypto
      const customRandomBytes = (length: number): Uint8Array => {
        console.log('Using custom randomBytes in event signing');
        // Use type assertion to avoid TypeScript error
        return (Crypto as any).getRandomBytes(length);
      };
      
      // Create event
      const event = new NDKEvent(ndk);
      event.kind = kind;
      event.content = content;
      event.tags = tags;
      
      // Direct monkey-patching approach
      try {
        // Try to find and override the randomBytes function
        const nostrTools = require('nostr-tools');
        const nobleHashes = require('@noble/hashes/utils');
        
        // Backup original functions
        const originalNobleRandomBytes = nobleHashes.randomBytes;
        
        // Override with our implementation
        (nobleHashes as any).randomBytes = customRandomBytes;
        
        // Sign event
        console.log('Signing event with patched libraries...');
        await event.sign();
        
        // Restore original functions
        (nobleHashes as any).randomBytes = originalNobleRandomBytes;
        
        console.log('Event signed successfully');
      } catch (signError) {
        console.error('Error signing event:', signError);
        throw signError;
      }
      
      // Publish the event
      console.log('Publishing event...');
      await event.publish();
      
      console.log('Event published successfully:', event.id);
      return event;
    } catch (error) {
      console.error('Error publishing event:', error);
      console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
      set({ error: error instanceof Error ? error : new Error('Failed to publish event') });
      return null;
    }
  },

  fetchEventsByFilter: async (filter: NDKFilter) => {
    try {
      const { ndk } = get();
      
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      // Fetch events
      const events = await ndk.fetchEvents(filter);
      
      // Convert Set to Array
      return Array.from(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ error: error instanceof Error ? error : new Error('Failed to fetch events') });
      return [];
    }
  }
}));