import NDK, { NDKUser, NDKEvent, NDKSigner } from '@nostr-dev-kit/ndk-mobile';
import * as SecureStore from 'expo-secure-store';
import { NDKPrivateKeySigner } from '@nostr-dev-kit/ndk-mobile';
import { NDKAmberSigner } from '../signers/NDKAmberSigner';
import { generateId, generateDTag } from '@/utils/ids';
import { v4 as uuidv4 } from 'uuid'; 
import { AuthMethod } from './types';
import { createLogger, enableModule } from '@/lib/utils/logger';
import { SECURE_STORE_KEYS } from './constants';
import { Platform } from 'react-native';

// Create auth-specific logger with extended logging
enableModule('AuthService');
const logger = createLogger('AuthService');
const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';

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
  private initPromise: Promise<void> | null = null;

  constructor(ndk: NDK) {
    this.ndk = ndk;
  }

  /**
   * Initialize the auth service - with improved error handling
   * This is called automatically by the ReactQueryAuthProvider
   */
  async initialize(): Promise<void> {
    // Single initialization pattern with promise caching
    if (this.initPromise) {
      logger.debug("Initialization already in progress, waiting for completion");
      return this.initPromise;
    }
    
    if (this.initialized) {
      logger.debug("Already initialized, skipping");
      return;
    }

    // Create a promise we can return for concurrent calls
    this.initPromise = this._doInitialize();
    try {
      await this.initPromise;
      this.initialized = true;
    } catch (error) {
      logger.error("Initialization failed:", error);
      // Reset promise so we can try again later
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Internal method that does the actual initialization work
   */
  private async _doInitialize(): Promise<void> {
    try {
      logger.info(`[${platform}] Starting initialization...`);
      
      // Check if we have credentials stored
      const privateKey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
      const externalSignerJson = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
      const storedPubkey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PUBKEY);
      
      // Check both storage keys for compatibility with legacy storage
      const legacyPrivateKey = await SecureStore.getItemAsync('nostr_privkey');
      const newPrivateKey = await SecureStore.getItemAsync('powr.private_key');
      
      logger.debug(`[${platform}] Found stored credentials:`, { 
        hasPrivateKey: !!privateKey, 
        hasExternalSigner: !!externalSignerJson,
        storedPubkey: storedPubkey ? storedPubkey.substring(0, 8) + '...' : null,
        hasLegacyPrivateKey: !!legacyPrivateKey,
        hasNewPrivateKey: !!newPrivateKey,
        storageKeyUsed: SECURE_STORE_KEYS.PRIVATE_KEY
      });

      // Login with stored credentials if available
      if (privateKey) {
        logger.info(`[${platform}] Restoring from private key`);
        try {
          // Try to normalize the key if needed (some platforms may add extra characters)
          let normalizedKey = privateKey.trim();
          // If key is longer than 64 chars, truncate it to the standard length
          if (normalizedKey.length > 64) {
            logger.warn(`[${platform}] Trimming private key from ${normalizedKey.length} chars to 64 chars`);
            normalizedKey = normalizedKey.substring(0, 64);
          }
          
          await this.loginWithPrivateKey(normalizedKey, false); // false = don't save again
          logger.info(`[${platform}] Successfully restored private key auth`);
          
          // Double-check that pubkey was saved
          const currentPubkey = this.ndk.activeUser?.pubkey;
          if (currentPubkey && (!storedPubkey || storedPubkey !== currentPubkey)) {
            logger.info(`[${platform}] Updating stored pubkey to match current user`);
            await SecureStore.setItemAsync(SECURE_STORE_KEYS.PUBKEY, currentPubkey);
          }
        } catch (e) {
          logger.error(`[${platform}] Error restoring private key auth:`, e);
          // If we failed to restore, delete the stored key to avoid persistent errors
          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
          throw e;
        }
      } else if (externalSignerJson) {
        try {
          logger.info("Restoring from external signer");
          const { method, data } = JSON.parse(externalSignerJson);
          if (method === 'amber') {
            await this.restoreAmberSigner(data);
            logger.info("Successfully restored Amber signer");
          }
        } catch (e) {
          logger.error("Error restoring external signer:", e);
          // If we failed to restore, delete the stored data to avoid persistent errors
          await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
          throw e;
        }
      } else {
        logger.debug("No stored credentials found");
      }

      logger.info("Initialization complete");
    } catch (error) {
      logger.error("Initialization error:", error);
      throw error;
    }
  }

  /**
   * Login with a private key - with improved logging and error handling
   * @param privateKey hex private key
   * @param saveKey whether to save the key to SecureStore (default true)
   * @returns NDK user
   */
  async loginWithPrivateKey(privateKey: string, saveKey: boolean = true): Promise<NDKUser> {
    try {
      logger.debug(`[${platform}] Creating private key signer, key length: ${privateKey.length}`);
      
      // Debug verification for the key format
      if (privateKey.length !== 64) {
        logger.warn(`[${platform}] Private key has unusual length: ${privateKey.length}, expected 64 chars`);
        // But we'll still try to use it
      }
      
      // Log a small fragment of the key for debugging
      if (privateKey.length > 0) {
        const keyPrefix = privateKey.substring(0, 4);
        logger.debug(`[${platform}] Private key starts with: ${keyPrefix}...`);
      }
      
      // Create signer
      const signer = new NDKPrivateKeySigner(privateKey);
      this.ndk.signer = signer;
      
      // Make sure we're connected
      logger.debug(`[${platform}] Connecting to NDK with private key signer`);
      await this.ndk.connect();
      
      if (!this.ndk.activeUser) {
        logger.error(`[${platform}] NDK connect succeeded but activeUser is null`);
        throw new Error('Failed to set active user after login');
      }

      const pubkeyFragment = this.ndk.activeUser.pubkey.substring(0, 8);
      logger.info(`[${platform}] Successfully logged in with private key for user: ${pubkeyFragment}...`);
      
      // Persist the key securely if requested
      if (saveKey) {
        logger.debug(`[${platform}] Saving private key to SecureStore`);
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY, privateKey);
        
        // Also save the public key for faster reference
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.PUBKEY, this.ndk.activeUser.pubkey);
        
        logger.debug(`[${platform}] Credentials saved successfully`);
      }

      return this.ndk.activeUser;
    } catch (error) {
      logger.error("Error logging in with private key:", error);
      throw error;
    }
  }

  /**
   * Login with Amber external signer - enhanced error handling
   * @returns NDK user
   */
  async loginWithAmber(): Promise<NDKUser> {
    try {
      logger.info("Requesting public key from Amber");
      // Request public key from Amber
      const { pubkey, packageName } = await NDKAmberSigner.requestPublicKey();
      
      logger.debug("Creating Amber signer with pubkey:", pubkey);
      // Create Amber signer
      const amberSigner = new NDKAmberSigner(pubkey, packageName);
      
      // Set as NDK signer
      this.ndk.signer = amberSigner;
      
      // Connect and get user
      logger.debug("Connecting to NDK with Amber signer");
      await this.ndk.connect();
      if (!this.ndk.activeUser) {
        logger.error("NDK connect succeeded but activeUser is null for Amber signer");
        throw new Error('Failed to set active user after amber login');
      }
      
      logger.info("Successfully logged in with Amber for user:", pubkey);
      
      // Store the signer info
      const signerData = { 
        pubkey: pubkey,
        packageName: packageName
      };
      const externalSignerInfo = JSON.stringify({
        method: 'amber',
        data: signerData
      });
      
      logger.debug("Saving Amber signer data to SecureStore");
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER, externalSignerInfo);
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.PUBKEY, pubkey);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY); // Clear any stored private key
      
      return this.ndk.activeUser;
    } catch (error) {
      logger.error("Error logging in with Amber:", error);
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
      logger.debug("Restoring Amber signer with data:", signerData);
      // Create Amber signer with existing data
      const amberSigner = new NDKAmberSigner(signerData.pubkey, signerData.packageName);
      
      // Set as NDK signer
      this.ndk.signer = amberSigner;
      
      // Connect and get user
      logger.debug("Connecting to NDK with restored Amber signer");
      await this.ndk.connect();
      if (!this.ndk.activeUser) {
        logger.error("NDK connect succeeded but activeUser is null for restored Amber signer");
        throw new Error('Failed to set active user after amber signer restore');
      }
      
      logger.info("Successfully restored Amber signer for user:", signerData.pubkey);
      
      return this.ndk.activeUser;
    } catch (error) {
      logger.error("Error restoring Amber signer:", error);
      throw error;
    }
  }

  /**
   * Create an ephemeral key for temporary use
   * @returns NDK user
   */
  async createEphemeralKey(): Promise<NDKUser> {
    try {
      logger.info("Creating ephemeral key");
      // Generate a random key (not persisted)
      // This creates a hex string of 64 characters (32 bytes)
      // Use uuidv4 to generate random bytes
      const randomId = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
      const privateKey = randomId.substring(0, 64); // Ensure exactly 64 hex chars (32 bytes)
      const signer = new NDKPrivateKeySigner(privateKey);
      
      // Set as NDK signer
      this.ndk.signer = signer;
      
      // Connect and get user
      logger.debug("Connecting to NDK with ephemeral key");
      await this.ndk.connect();
      if (!this.ndk.activeUser) {
        logger.error("NDK connect succeeded but activeUser is null for ephemeral key");
        throw new Error('Failed to set active user after ephemeral key creation');
      }
      
      logger.info("Successfully created ephemeral key for user:", this.ndk.activeUser.pubkey);
      
      // Clear any stored credentials
      logger.debug("Clearing stored credentials for ephemeral key");
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PUBKEY);
      
      return this.ndk.activeUser;
    } catch (error) {
      logger.error("Error creating ephemeral key:", error);
      throw error;
    }
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      logger.info("Logging out user");
      
      // Clear stored credentials
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PUBKEY);
      
      // Reset NDK
      this.ndk.signer = undefined;
      
      // Clean up relay connections if they exist
      try {
        if (this.ndk.pool) {
          logger.debug("Cleaning up relay connections");
          // Cast to any to bypass TypeScript errors with internal NDK API
          const pool = this.ndk.pool as any;
          if (pool.relayByUrl) {
            Object.values(pool.relayByUrl).forEach((relay: any) => {
              try {
                if (relay && relay.close) relay.close();
              } catch (e) {
                logger.warn("Error closing relay:", e);
              }
            });
          }
        }
      } catch (e) {
        logger.warn("Error during NDK resource cleanup:", e);
      }
      
      logger.info("Logged out successfully");
    } catch (error) {
      logger.error("Error during logout:", error);
      throw error;
    }
  }

  /**
   * Get the current authentication method
   * @returns Auth method or undefined if not authenticated
   */
  async getCurrentAuthMethod(): Promise<AuthMethod | undefined> {
    try {
      logger.debug("Getting current auth method");
      if (await SecureStore.getItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY)) {
        logger.debug("Found private key authentication");
        return 'private_key';
      }
      
      const externalSignerJson = await SecureStore.getItemAsync(SECURE_STORE_KEYS.EXTERNAL_SIGNER);
      if (externalSignerJson) {
        const { method } = JSON.parse(externalSignerJson);
        logger.debug(`Found external signer authentication: ${method}`);
        return method === 'amber' ? 'amber' : undefined;
      }
      
      logger.debug("No authentication method found");
      return undefined;
    } catch (error) {
      logger.error("Error getting current auth method:", error);
      return undefined;
    }
  }
}
