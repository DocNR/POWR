// lib/stores/ndk.ts
import { create } from 'zustand';
import NDK, { NDKEvent, NDKPrivateKeySigner, NDKUser } from '@nostr-dev-kit/ndk';
import * as SecureStore from 'expo-secure-store';
import { nip19 } from 'nostr-tools';

// Constants for SecureStore
const PRIVATE_KEY_STORAGE_KEY = 'nostr_privkey';

// Default relays
const DEFAULT_RELAYS = [
  'ws://localhost:8080',  // Add your local test relay
  //'wss://relay.damus.io',
  //'wss://relay.nostr.band',
  //'wss://purplepag.es',
  //'wss://nos.lol'
];

// Helper function to convert Array/Uint8Array to hex string
function arrayToHex(array: number[] | Uint8Array): string {
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

type NDKStoreState = {
  ndk: NDK | null;
  currentUser: NDKUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  init: () => Promise<void>;
  login: (privateKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getPublicKey: () => Promise<string | null>;
};

export const useNDKStore = create<NDKStoreState>((set, get) => ({
  ndk: null,
  currentUser: null,
  isLoading: true,
  isAuthenticated: false,
  
  init: async () => {
    try {
      console.log('[NDK] Initializing...');
      // Initialize NDK with relays
      const ndk = new NDK({
        explicitRelayUrls: DEFAULT_RELAYS
      });
      
      await ndk.connect();
      set({ ndk });
      
      // Check for saved private key
      const privateKey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      if (privateKey) {
        console.log('[NDK] Found saved private key, initializing signer');
        
        try {
          // Create signer with private key
          const signer = new NDKPrivateKeySigner(privateKey);
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
    } catch (error) {
      console.error('[NDK] Initialization error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
// lib/stores/ndk.ts - updated login method
login: async (privateKey: string) => {
    set({ isLoading: true });
    
    try {
      const { ndk } = get();
      if (!ndk) {
        console.error('[NDK] NDK not initialized');
        return false;
      }
      
      // Process the private key (handle nsec format)
      let hexKey = privateKey;
      
      if (privateKey.startsWith('nsec1')) {
        try {
          const { type, data } = nip19.decode(privateKey);
          if (type !== 'nsec') {
            throw new Error('Invalid nsec key');
          }
          
          // Handle different data types
          if (typeof data === 'string') {
            hexKey = data;
          } else if (Array.isArray(data)) {
            // Convert array to hex string
            hexKey = arrayToHex(data);
          } else if (data instanceof Uint8Array) {
            // Convert Uint8Array to hex string
            hexKey = arrayToHex(data);
          } else {
            throw new Error('Unsupported key format');
          }
        } catch (error) {
          console.error('[NDK] Key decode error:', error);
          throw new Error('Invalid private key format');
        }
      }
      
      // Create signer with hex key
      console.log('[NDK] Creating signer with key');
      const signer = new NDKPrivateKeySigner(hexKey);
      ndk.signer = signer;
      
      // Get user
      const user = await ndk.signer.user();
      if (!user) {
        throw new Error('Failed to get user from signer');
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
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, hexKey);
      
      set({ 
        currentUser: user,
        isAuthenticated: true 
      });
      
      return true;
    } catch (error) {
      console.error('[NDK] Login error:', error);
      return false;
    } finally {
      set({ isLoading: false });
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
      
      // Completely reset the user state
      set({ 
        currentUser: null,
        isAuthenticated: false 
      });
      
      console.log('[NDK] User logged out successfully');
    } catch (error) {
      console.error('[NDK] Logout error:', error);
    }
  },
  
  getPublicKey: async () => {
    const { currentUser } = get();
    if (currentUser) {
      return currentUser.pubkey;
    }
    return null;
  }
}));