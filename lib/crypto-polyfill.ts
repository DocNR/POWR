// lib/crypto-polyfill.ts
import 'react-native-get-random-values';
import * as Crypto from 'expo-crypto';

// Set up a more reliable polyfill
export function setupCryptoPolyfill() {
  console.log('Setting up crypto polyfill...');
  
  // Instead of using Object.defineProperty, let's use a different approach
  try {
    // First check if crypto exists and has getRandomValues
    if (typeof global.crypto === 'undefined') {
      (global as any).crypto = {};
    }
    
    // Only define getRandomValues if it doesn't exist or isn't working
    if (!global.crypto.getRandomValues) {
      console.log('Defining getRandomValues implementation');
      (global.crypto as any).getRandomValues = function(array: Uint8Array) {
        console.log('Custom getRandomValues called');
        try {
          return Crypto.getRandomBytes(array.length);
        } catch (e) {
          console.error('Error in getRandomValues:', e);
          throw e;
        }
      };
    }
    
    // Test if it works
    const testArray = new Uint8Array(8);
    try {
      const result = global.crypto.getRandomValues(testArray);
      console.log('Crypto polyfill test result:', !!result);
      return true;
    } catch (testError) {
      console.error('Crypto test failed:', testError);
      return false;
    }
  } catch (error) {
    console.error('Error setting up crypto polyfill:', error);
    return false;
  }
}

// Also expose a monkey-patching function for the specific libraries
export function monkeyPatchNostrLibraries() {
  try {
    console.log('Attempting to monkey-patch nostr libraries...');
    
    // Direct monkey patching of the randomBytes function in nostr libraries
    // This is an extreme approach but might be necessary
    const customRandomBytes = function(length: number): Uint8Array {
      console.log('Using custom randomBytes implementation');
      return Crypto.getRandomBytes(length);
    };
    
    // Try to locate and patch the randomBytes function
    try {
      // Try to access the module using require
      const nobleHashes = require('@noble/hashes/utils');
      if (nobleHashes && nobleHashes.randomBytes) {
        console.log('Patching @noble/hashes/utils randomBytes');
        (nobleHashes as any).randomBytes = customRandomBytes;
      }
    } catch (e) {
      console.log('Could not patch @noble/hashes/utils:', e);
    }
    
    // Also try to patch nostr-tools if available
    try {
      const nostrTools = require('nostr-tools');
      if (nostrTools && nostrTools.crypto && nostrTools.crypto.randomBytes) {
        console.log('Patching nostr-tools crypto.randomBytes');
        (nostrTools.crypto as any).randomBytes = customRandomBytes;
      }
    } catch (e) {
      console.log('Could not patch nostr-tools:', e);
    }
    
    return true;
  } catch (error) {
    console.error('Error in monkey patching:', error);
    return false;
  }
}

// Set up the polyfill
setupCryptoPolyfill();
// Try monkey patching as well
monkeyPatchNostrLibraries();