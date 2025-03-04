// lib/mobile-signer.ts
import '../lib/crypto-polyfill'; // Import crypto polyfill first
import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import * as nostrTools from 'nostr-tools';
import { setupCryptoPolyfill } from './crypto-polyfill';

/**
 * A custom signer implementation for React Native
 * Extends NDKPrivateKeySigner to handle different key formats
 */
export class NDKMobilePrivateKeySigner extends NDKPrivateKeySigner {
  constructor(privateKey: string) {
    // Handle different private key formats
    let hexKey = privateKey;
    
    // Convert nsec to hex if needed
    if (privateKey.startsWith('nsec')) {
      try {
        const { type, data } = nostrTools.nip19.decode(privateKey);
        if (type === 'nsec') {
          // Handle the data as string (already in hex format)
          if (typeof data === 'string') {
            hexKey = data;
          } 
          // Handle if it's a Uint8Array
          else if (data instanceof Uint8Array) {
            hexKey = bytesToHex(data);
          }
        } else {
          throw new Error('Not an nsec key');
        }
      } catch (e) {
        console.error('Error processing nsec key:', e);
        throw new Error('Invalid private key format');
      }
    }
    
    // Call the parent constructor with the hex key
    super(hexKey);
  }
}

/**
 * Generate a new Nostr keypair
 * Uses Expo's crypto functions directly instead of relying on polyfills
 */
// Add this to your generateKeyPair function
export function generateKeyPair() {
  try {
    // Ensure crypto polyfill is set up
    if (typeof setupCryptoPolyfill === 'function') {
      setupCryptoPolyfill();
    }
    
    let privateKeyBytes;
    
    // Try expo-crypto first since expo-random is deprecated
    try {
      privateKeyBytes = Crypto.getRandomBytes(32);
    } catch (e) {
      console.warn('expo-crypto failed:', e);
      // Fallback to expo-random as last resort
      privateKeyBytes = Random.getRandomBytes(32);
    }
    
    const privateKey = bytesToHex(privateKeyBytes);
    
    // Get the public key from the private key using nostr-tools
    const publicKey = nostrTools.getPublicKey(privateKeyBytes);
    
    // Encode keys in bech32 format
    const nsec = nostrTools.nip19.nsecEncode(privateKeyBytes);
    const npub = nostrTools.nip19.npubEncode(publicKey);
    
    // Make sure we return the object with all properties
    return {
      privateKey,
      publicKey,
      nsec,
      npub
    };
  } catch (error) {
    console.error('[MobileSigner] Error generating key pair:', error);
    throw error; // Return the actual error for better debugging
  }
}