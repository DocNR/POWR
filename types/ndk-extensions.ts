// types/ndk-extensions.ts

import { NDKCommon } from '@/types/ndk-common';

// Extend NDKRelay with missing properties
declare module '@nostr-dev-kit/ndk-mobile' {
  interface NDKRelay {
    read?: boolean;
    write?: boolean;
  }
  
  interface NDK {
    // Add missing methods
    removeRelay?(url: string): void;
    addRelay?(url: string, opts?: { read?: boolean; write?: boolean }, authPolicy?: any): NDKRelay | undefined;
  }
}

// Add methods to NDK prototype for backward compatibility
export function extendNDK(ndk: any): any {
  // Only add methods if they don't already exist
  if (!ndk.hasOwnProperty('removeRelay')) {
    ndk.removeRelay = function(url: string) {
      console.log(`[NDK Extension] Removing relay: ${url}`);
      if (this.pool && this.pool.relays) {
        this.pool.relays.delete(url);
      }
    };
  }
  
  if (!ndk.hasOwnProperty('addRelay')) {
    ndk.addRelay = function(url: string, opts?: { read?: boolean; write?: boolean }, authPolicy?: any) {
      console.log(`[NDK Extension] Adding relay: ${url}`);
      
      // Check if pool exists
      if (!this.pool) {
        console.error('[NDK Extension] NDK pool does not exist');
        return undefined;
      }
      
      // Check if relay already exists
      let relay = this.pool.getRelay ? this.pool.getRelay(url) : undefined;
      
      if (!relay) {
        try {
          // Try to create a relay with the constructor from this NDK instance
          const NDKRelay = this.constructor.NDKRelay;
          if (NDKRelay) {
            relay = new NDKRelay(url);
          } else {
            // Fallback to importing from ndk-mobile
            const { NDKRelay: ImportedNDKRelay } = require('@nostr-dev-kit/ndk-mobile');
            relay = new ImportedNDKRelay(url);
          }
          
          // Add to pool
          if (this.pool.relays && relay) {
            this.pool.relays.set(url, relay);
          }
        } catch (error) {
          console.error('[NDK Extension] Error creating relay:', error);
          return undefined;
        }
      }
      
      // Set read/write permissions if provided
      if (relay && opts) {
        if (opts.read !== undefined) {
          relay.read = opts.read;
        }
        if (opts.write !== undefined) {
          relay.write = opts.write;
        }
      }
      
      return relay;
    };
  }
  
  return ndk;
}