// types/ndk-common.ts

/**
 * This file provides common interfaces that work with both
 * @nostr-dev-kit/ndk and @nostr-dev-kit/ndk-mobile
 * to solve TypeScript conflicts between the two packages
 */

// Define a universal NDK interface that works with both packages
export interface NDKCommon {
    pool: {
      relays: Map<string, any>;
      getRelay: (url: string) => any;
    };
    connect: () => Promise<void>;
    disconnect: () => void;
    fetchEvents: (filter: any) => Promise<Set<any>>;
    signer?: any;
  }
  
  // Define a universal NDKRelay interface
  export interface NDKRelayCommon {
    url: string;
    status: number;
    connect: () => Promise<void>;
    disconnect: () => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
  }
  
  // Safe utility function to add a relay to NDK
  export function safeAddRelay(ndk: NDKCommon, url: string, opts?: { read?: boolean; write?: boolean }): any {
    try {
      // Try using native addRelay if it exists
      if ((ndk as any).addRelay) {
        return (ndk as any).addRelay(url, opts, undefined); // Add undefined for authPolicy
      }
      
      // Fallback implementation
      let relay = ndk.pool.getRelay(url);
      
      if (!relay) {
        // Safe relay creation that works with both NDK implementations
        const NDKRelay = getRelayClass();
        relay = new NDKRelay(url);
        ndk.pool.relays.set(url, relay);
      }
      
      // Set read/write permissions if provided
      if (opts) {
        if (opts.read !== undefined) {
          (relay as any).read = opts.read;
        }
        if (opts.write !== undefined) {
          (relay as any).write = opts.write;
        }
      }
      
      return relay;
    } catch (error) {
      console.error('[NDK-Common] Error adding relay:', error);
      return null;
    }
  }
  
  // Safe utility function to remove a relay from NDK
  export function safeRemoveRelay(ndk: NDKCommon, url: string): void {
    try {
      // Try using native removeRelay if it exists
      if ((ndk as any).removeRelay) {
        (ndk as any).removeRelay(url);
        return;
      }
      
      // Fallback implementation
      ndk.pool.relays.delete(url);
    } catch (error) {
      console.error('[NDK-Common] Error removing relay:', error);
    }
  }
  
  // Helper to get the NDKRelay class from either package
  function getRelayClass(): any {
    try {
      // Try to get the NDKRelay class from ndk-mobile first
      const ndkMobile = require('@nostr-dev-kit/ndk-mobile');
      if (ndkMobile.NDKRelay) {
        return ndkMobile.NDKRelay;
      }
      
      // Fallback to ndk
      const ndk = require('@nostr-dev-kit/ndk');
      if (ndk.NDKRelay) {
        return ndk.NDKRelay;
      }
      
      throw new Error('NDKRelay class not found');
    } catch (error) {
      console.error('[NDK-Common] Error getting NDKRelay class:', error);
      
      // Return a minimal NDKRelay implementation as last resort
      return class MinimalNDKRelay {
        url: string;
        status: number = 0;
        read: boolean = true;
        write: boolean = true;
        
        constructor(url: string) {
          this.url = url;
        }
        
        connect() {
          console.warn(`[NDK-Common] Minimal relay implementation can't connect to ${this.url}`);
          return Promise.resolve();
        }
        
        disconnect() {
          // No-op
        }
        
        on(event: string, listener: (...args: any[]) => void) {
          // No-op
        }
      };
    }
  }