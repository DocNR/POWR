import NDK, { NDKUser, NDKEvent, NDKSigner } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk-mobile';
import { NDKAmberSigner } from '../signers/NDKAmberSigner';
import { generateId, generateDTag } from '@/utils/ids';
import { v4 as uuidv4 } from 'uuid'; 
import { AuthMethod } from './types';

/**
 * Auth Service for managing authentication with NDK and React Query
 * 
 * Provides functionality for:
 * - Login with private key
 * - Login with Amber external signer
 * - Ephemeral key generation
 * - Secure credential storage
 * - Logout and cleanup
 */
export class AuthService {
  private ndk: NDK;
  private initialized: boolean = false;

  constructor(ndk: NDK) {
    this.ndk = ndk;
  }

  /**
   * Initialize the auth service
   * This is called automatically by the ReactQueryAuthProvider
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Check if we have credentials stored
      const privateKey = await SecureStore.getItemAsync('powr.private_key');
      const externalSignerJson = await SecureStore.getItemAsync('nostr_external_signer');

      // Login with stored credentials if available
      if (privateKey) {
        await this.loginWithPrivateKey(privateKey);
      } else if (externalSignerJson) {
        const { method, data } = JSON.parse(externalSignerJson);
        if (method === 'amber') {
          await this.restoreAmberSigner(data);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('[AuthService] Error initializing auth service:', error);
      throw error;
    }
  }

  /**
   * Login with a private key
   * @param privateKey hex private key
   * @returns NDK user
   */
  async loginWithPrivateKey(privateKey: string): Promise<NDKUser> {
    try {
      // Create signer
      const signer = new NDKPrivateKeySigner(privateKey);
      this.ndk.signer = signer;
      
      // Get user
      await this.ndk.connect();
      if (!this.ndk.activeUser) {
        throw new Error('Failed to set active user after login');
      }

      // Persist the key securely
      await SecureStore.setItemAsync('powr.private_key', privateKey);

      return this.ndk.activeUser;
    } catch (error) {
      console.error('[AuthService] Error logging in with private key:', error);
      throw error;
    }
  }

  /**
   * Login with Amber external signer
   * @returns NDK user
   */
  async loginWithAmber(): Promise<NDKUser> {
    try {
      // Request public key from Amber
      const { pubkey, packageName } = await NDKAmberSigner.requestPublicKey();
      
      // Create Amber signer
      const amberSigner = new NDKAmberSigner(pubkey, packageName);
      
      // Set as NDK signer
      this.ndk.signer = amberSigner;
      
      // Connect and get user
      await this.ndk.connect();
      if (!this.ndk.activeUser) {
        throw new Error('Failed to set active user after amber login');
      }
      
      // Store the signer info
      const signerData = { 
        pubkey: pubkey,
        packageName: packageName
      };
      const externalSignerInfo = JSON.stringify({
        method: 'amber',
        data: signerData
      });
      
      await SecureStore.setItemAsync('nostr_external_signer', externalSignerInfo);
      await SecureStore.deleteItemAsync('powr.private_key'); // Clear any stored private key
      
      return this.ndk.activeUser;
    } catch (error) {
      console.error('[AuthService] Error logging in with Amber:', error);
      throw error;
    }
  }
  
  /**
   * Restore an Amber signer session
   * @param signerData Previous signer data
   * @returns NDK user
   */
  private async restoreAmberSigner(signerData: any): Promise<NDKUser> {
    try {
      // Create Amber signer with existing data
      const amberSigner = new NDKAmberSigner(signerData.pubkey, signerData.packageName);
      
      // Set as NDK signer
      this.ndk.signer = amberSigner;
      
      // Connect and get user
      await this.ndk.connect();
      if (!this.ndk.activeUser) {
        throw new Error('Failed to set active user after amber signer restore');
      }
      
      return this.ndk.activeUser;
    } catch (error) {
      console.error('[AuthService] Error restoring Amber signer:', error);
      throw error;
    }
  }

  /**
   * Create an ephemeral key for temporary use
   * @returns NDK user
   */
  async createEphemeralKey(): Promise<NDKUser> {
    try {
      // Generate a random key (not persisted)
      // This creates a hex string of 64 characters (32 bytes)
      // Use uuidv4 to generate random bytes
      const randomId = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
      const privateKey = randomId.substring(0, 64); // Ensure exactly 64 hex chars (32 bytes)
      const signer = new NDKPrivateKeySigner(privateKey);
      
      // Set as NDK signer
      this.ndk.signer = signer;
      
      // Connect and get user
      await this.ndk.connect();
      if (!this.ndk.activeUser) {
        throw new Error('Failed to set active user after ephemeral key creation');
      }
      
      // Clear any stored credentials
      await SecureStore.deleteItemAsync('powr.private_key');
      await SecureStore.deleteItemAsync('nostr_external_signer');
      
      return this.ndk.activeUser;
    } catch (error) {
      console.error('[AuthService] Error creating ephemeral key:', error);
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      // Clear stored credentials
      await SecureStore.deleteItemAsync('powr.private_key');
      await SecureStore.deleteItemAsync('nostr_external_signer');
      
      // Reset NDK
      this.ndk.signer = undefined;
      
      // Simple cleanup for NDK instance
      // NDK doesn't have a formal disconnect method
      try {
        // Clean up relay connections if they exist
        if (this.ndk.pool) {
          // Cast to any to bypass TypeScript errors with internal NDK API
          const pool = this.ndk.pool as any;
          if (pool.relayByUrl) {
            Object.values(pool.relayByUrl).forEach((relay: any) => {
              try {
                if (relay && relay.close) relay.close();
              } catch (e) {
                console.warn('Error closing relay:', e);
              }
            });
          }
        }
      } catch (e) {
        console.warn('Error during NDK resource cleanup:', e);
      }
      
      console.log('[AuthService] Logged out successfully');
    } catch (error) {
      console.error('[AuthService] Error during logout:', error);
      throw error;
    }
  }

  /**
   * Get the current authentication method
   * @returns Auth method or undefined if not authenticated
   */
  async getCurrentAuthMethod(): Promise<AuthMethod | undefined> {
    try {
      if (await SecureStore.getItemAsync('powr.private_key')) {
        return 'private_key';
      }
      
      const externalSignerJson = await SecureStore.getItemAsync('nostr_external_signer');
      if (externalSignerJson) {
        const { method } = JSON.parse(externalSignerJson);
        return method === 'amber' ? 'amber' : undefined;
      }
      
      return undefined;
    } catch (error) {
      console.error('[AuthService] Error getting current auth method:', error);
      return undefined;
    }
  }
}
