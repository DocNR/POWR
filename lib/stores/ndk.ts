// lib/stores/ndk.ts
// IMPORTANT: 'react-native-get-random-values' must be the first import to ensure
// proper crypto polyfill application before other libraries are loaded
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { create } from 'zustand';
// Using standard NDK types but importing NDKEvent from ndk-mobile for compatibility
import NDK, { NDKFilter } from '@nostr-dev-kit/ndk';
import { NDKEvent, NDKUser } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { NDKMobilePrivateKeySigner, generateKeyPair } from '@/lib/mobile-signer';

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

      // IMPORTANT: Due to the lack of an Expo config plugin for ndk-mobile,
      // we're using a standard NDK initialization approach rather than trying to use
      // ndk-mobile's native modules, which require a custom build.
      //
      // When an Expo plugin becomes available for ndk-mobile, we can remove this
      // fallback approach and use the initializeNDK() function directly.
      console.log('[NDK] Using standard NDK initialization');
      
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
  
  // IMPORTANT: This method uses monkey patching to make event signing work
  // in React Native environment. This is necessary because the underlying
  // Nostr libraries expect Web Crypto API to be available.
  //
  // When ndk-mobile gets proper Expo support, this function can be simplified to:
  // 1. Create the event
  // 2. Call event.sign() directly
  // 3. Call event.publish()
  // without the monkey patching code.
  publishEvent: async (kind: number, content: string, tags: string[][]) => {
    try {
      const { ndk, isAuthenticated, currentUser } = get();
      
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      if (!isAuthenticated || !currentUser) {
        throw new Error('Not authenticated');
      }
      
      // Create event
      console.log('Creating event...');
      const event = new NDKEvent(ndk);
      event.kind = kind;
      event.content = content;
      event.tags = tags;
      
      // MONKEY PATCHING APPROACH:
      // This is needed because the standard NDK doesn't properly work with
      // React Native's crypto implementation. When ndk-mobile adds proper Expo
      // support, this can be removed.
      try {
        // Define custom function for random bytes generation
        const customRandomBytes = (length: number): Uint8Array => {
          console.log('Using custom randomBytes in event signing');
          return (Crypto as any).getRandomBytes(length);
        };
        
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