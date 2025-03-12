// lib/stores/ndk.ts
import 'react-native-get-random-values';
import { create } from 'zustand';
import NDK, { 
  NDKEvent, 
  NDKUser,
  NDKRelay,
  NDKPrivateKeySigner
} from '@nostr-dev-kit/ndk-mobile';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import * as SecureStore from 'expo-secure-store';
import { RelayService } from '@/lib/db/services/RelayService';

// Constants for SecureStore
const PRIVATE_KEY_STORAGE_KEY = 'nostr_privkey';

// Default relays
const DEFAULT_RELAYS = [
  'wss://powr.duckdns.org',
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  'wss://nos.lol'
];

type NDKStoreState = {
  ndk: NDK | null;
  currentUser: NDKUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  relayStatus: Record<string, 'connected' | 'connecting' | 'disconnected'>;
};

type NDKStoreActions = {
  init: () => Promise<void>;
  login: (privateKey?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  generateKeys: () => { privateKey: string; publicKey: string; nsec: string; npub: string };
  publishEvent: (kind: number, content: string, tags: string[][]) => Promise<NDKEvent | null>;
  fetchUserProfile: (pubkey: string) => Promise<NDKUser | null>;
  fetchEventsByFilter: (filter: any) => Promise<NDKEvent[]>;
};

// Helper to convert byte array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert hex string to byte array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export const useNDKStore = create<NDKStoreState & NDKStoreActions>((set, get) => ({
  ndk: null,
  currentUser: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  relayStatus: {},

  init: async () => {
    try {
      console.log('[NDK] Initializing...');
      set({ isLoading: true, error: null });

      // Initialize NDK with relays
      const ndk = new NDK({
        explicitRelayUrls: DEFAULT_RELAYS
      });
      
      // Setup relay status tracking
      const relayStatus: Record<string, 'connected' | 'connecting' | 'disconnected'> = {};
      DEFAULT_RELAYS.forEach(url => {
        relayStatus[url] = 'connecting';
      });
      
      // Monitor relay connections
      ndk.pool.on('relay:connect', (relay: NDKRelay) => {
        console.log(`[NDK] Relay connected: ${relay.url}`);
        set(state => ({
          relayStatus: {
            ...state.relayStatus,
            [relay.url]: 'connected'
          }
        }));
      });
      
      ndk.pool.on('relay:disconnect', (relay: NDKRelay) => {
        console.log(`[NDK] Relay disconnected: ${relay.url}`);
        set(state => ({
          relayStatus: {
            ...state.relayStatus,
            [relay.url]: 'disconnected'
          }
        }));
      });
      
      await ndk.connect();
      set({ ndk, relayStatus });
      
      // Check for saved private key
      const privateKeyHex = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      if (privateKeyHex) {
        console.log('[NDK] Found saved private key, initializing signer');
        
        try {
          await get().login(privateKeyHex);
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
  
  login: async (privateKeyInput?: string) => {
    set({ isLoading: true, error: null });
    console.log('[NDK] Login attempt starting');
    
    try {
      const { ndk } = get();
      if (!ndk) {
        console.log('[NDK] Error: NDK not initialized');
        throw new Error('NDK not initialized');
      }
      
      console.log('[NDK] Processing private key input');
      
      // If no private key is provided, generate one
      let privateKeyHex = privateKeyInput;
      if (!privateKeyHex) {
        console.log('[NDK] No key provided, generating new key');
        const { privateKey } = get().generateKeys();
        privateKeyHex = privateKey;
      } else {
        console.log('[NDK] Using provided key, format:', 
          privateKeyHex.startsWith('nsec') ? 'nsec' : 'hex',
          'length:', privateKeyHex.length);
      }
      
      // Handle nsec format
      if (privateKeyHex.startsWith('nsec')) {
        try {
          console.log('[NDK] Decoding nsec format key');
          const decoded = nip19.decode(privateKeyHex);
          console.log('[NDK] Decoded type:', decoded.type);
          if (decoded.type === 'nsec') {
            // Get the data as hex
            privateKeyHex = bytesToHex(decoded.data as any);
            console.log('[NDK] Converted to hex, new length:', privateKeyHex.length);
          }
        } catch (error) {
          console.error('[NDK] Error decoding nsec:', error);
          throw new Error('Invalid nsec format');
        }
      }
      
      console.log('[NDK] Creating signer with key length:', privateKeyHex.length);
      
      // Create signer with private key
      const signer = new NDKPrivateKeySigner(privateKeyHex);
      console.log('[NDK] Signer created, setting on NDK');
      ndk.signer = signer;
      
      // Get user
      console.log('[NDK] Getting user from signer');
      const user = await ndk.signer.user();
      if (!user) {
        console.log('[NDK] Error: Could not get user from signer');
        throw new Error('Could not get user from signer');
      }
      
      console.log('[NDK] User retrieved, pubkey:', user.pubkey ? user.pubkey.substring(0, 8) + '...' : 'undefined');
      
      // Fetch user profile
      console.log('[NDK] Fetching user profile');
      try {
        await user.fetchProfile();
        console.log('[NDK] Profile fetched successfully');
      } catch (profileError) {
        console.warn('[NDK] Warning: Could not fetch user profile:', profileError);
        // Continue even if profile fetch fails
      }
      
      // Process profile data to ensure image property is set
      if (user.profile) {
        console.log('[NDK] Profile data available');
        if (!user.profile.image && (user.profile as any).picture) {
          user.profile.image = (user.profile as any).picture;
          console.log('[NDK] Set image from picture property');
        }
        
        console.log('[NDK] User profile loaded:', 
          user.profile.name || user.profile.displayName || 'No name available');
      } else {
        console.log('[NDK] No profile data available');
      }
      
      // Save the private key hex string securely
      console.log('[NDK] Saving private key to secure storage');
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKeyHex);
      
      // After successful login, import user relay preferences
      try {
        console.log('[NDK] Creating RelayService to import user preferences');
        const relayService = new RelayService();
        
        // Set NDK on the relay service
        console.log('[NDK] Setting NDK on RelayService');
        relayService.setNDK(ndk as any); // Using type assertion
        
        // Import user relay preferences from metadata (kind:3 events)
        if (user.pubkey) {
          console.log('[NDK] Importing relay metadata for user:', user.pubkey.substring(0, 8) + '...');
          try {
            await relayService.importFromUserMetadata(user.pubkey, ndk);
            console.log('[NDK] Successfully imported user relay preferences');
          } catch (importError) {
            console.warn('[NDK] Could not import user relay preferences:', importError);
            // Continue even if import fails
          }
        } else {
          console.log('[NDK] Cannot import relay metadata: No pubkey available');
        }
      } catch (relayError) {
        console.error('[NDK] Error with RelayService:', relayError);
        // Continue with login even if relay import fails
      }
      
      console.log('[NDK] Login successful, updating state');
      set({ 
        currentUser: user,
        isAuthenticated: true,
        isLoading: false
      });
      
      console.log('[NDK] Login complete');
      return true;
    } catch (error) {
      console.error('[NDK] Login error detailed:', error);
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
      // Generate a new secret key (returns Uint8Array)
      const secretKeyBytes = generateSecretKey();
      
      // Convert to hex for storage
      const privateKey = bytesToHex(secretKeyBytes);
      
      // Get public key
      const publicKey = getPublicKey(secretKeyBytes);
      
      // Generate nsec and npub 
      const nsec = nip19.nsecEncode(secretKeyBytes);
      const npub = nip19.npubEncode(publicKey);
      
      return {
        privateKey,
        publicKey,
        nsec,
        npub
      };
    } catch (error) {
      console.error('[NDK] Error generating keys:', error);
      set({ error: error instanceof Error ? error : new Error('Failed to generate keys') });
      throw error;
    }
  },
  
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
      const event = new NDKEvent(ndk);
      event.kind = kind;
      event.content = content;
      event.tags = tags;
      
      // Sign and publish
      await event.sign();
      await event.publish();
      
      console.log('Event published successfully:', event.id);
      return event;
    } catch (error) {
      console.error('Error publishing event:', error);
      set({ error: error instanceof Error ? error : new Error('Failed to publish event') });
      return null;
    }
  },
  
  // Fetch profile for any user
  fetchUserProfile: async (pubkey: string) => {
    try {
      const { ndk } = get();
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      const user = ndk.getUser({ pubkey });
      await user.fetchProfile();
      
      return user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      set({ error: error instanceof Error ? error : new Error('Failed to fetch user profile') });
      return null;
    }
  },
  
  // Fetch events by filter
  fetchEventsByFilter: async (filter: any) => {
    try {
      const { ndk } = get();
      if (!ndk) {
        throw new Error('NDK not initialized');
      }
      
      // Fetch events using NDK
      const events = await ndk.fetchEvents(filter);
      
      return Array.from(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      set({ error: error instanceof Error ? error : new Error('Failed to fetch events') });
      return [];
    }
  }
}));

// Export hooks for using the store
export function useNDK() {
  return useNDKStore(state => ({
    ndk: state.ndk,
    isLoading: state.isLoading,
    error: state.error,
    init: state.init
  }));
}

export function useNDKCurrentUser() {
  return useNDKStore(state => ({
    currentUser: state.currentUser,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading
  }));
}

export function useNDKAuth() {
  return useNDKStore(state => ({
    login: state.login,
    logout: state.logout,
    generateKeys: state.generateKeys,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading
  }));
}

export function useNDKEvents() {
  return useNDKStore(state => ({
    publishEvent: state.publishEvent,
    fetchEventsByFilter: state.fetchEventsByFilter
  }));
}