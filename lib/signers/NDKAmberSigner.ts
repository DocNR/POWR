import NDK, { type NDKSigner, type NDKUser, type NDKEncryptionScheme } from '@nostr-dev-kit/ndk-mobile';
import { Platform } from 'react-native';
import type { NostrEvent } from 'nostr-tools';
import ExternalSignerUtils, { NIP55Permission } from '@/utils/ExternalSignerUtils';
import { nip19 } from 'nostr-tools';

/**
 * NDK Signer implementation for Amber (NIP-55 compatible external signer)
 *
 * This signer delegates signing operations to the Amber app on Android
 * through the use of Intent-based communication as defined in NIP-55.
 *
 * Note: This is Android-specific and requires the AmberSignerModule native module.
 */
export class NDKAmberSigner implements NDKSigner {
  /**
   * The public key of the user in hex format
   */
  private pubkey: string;

  /**
   * The package name of the Amber app
   */
  private packageName: string;

  /**
   * Whether this signer can sign events
   */
  private canSign: boolean = false;

  /**
   * Constructor
   *
   * @param pubkey The user's public key (hex)
   * @param packageName Optional Amber package name (default: com.greenart7c3.nostrsigner)
   */
  constructor(pubkey: string, packageName: string = 'com.greenart7c3.nostrsigner') {
    this.pubkey = pubkey;
    this.packageName = packageName;
    this.canSign = Platform.OS === 'android';
  }

  /**
   * Implement blockUntilReady required by NDKSigner interface
   * Amber signer is always ready once initialized
   *
   * @returns The user this signer represents
   */
  async blockUntilReady(): Promise<NDKUser> {
    // Return the user since the method requires it
    return this.user();
  }

  /**
   * Get user's NDK user object
   *
   * @returns An NDKUser representing this user
   */
  async user(): Promise<NDKUser> {
    // Create a new NDK instance for getting the user object
    const ndk = new NDK();
    const user = ndk.getUser({ pubkey: this.pubkey });
    return user;
  }

  /**
   * Get user's public key
   *
   * @returns The user's public key in hex format
   */
  async getPublicKey(): Promise<string> {
    return this.pubkey;
  }

  /**
   * Sign an event using Amber
   *
   * Uses the native module to send an intent to Amber for signing.
   *
   * @param event The event to sign
   * @returns The signature for the event
   * @throws Error if not on Android or signing fails
   */
  async sign(event: NostrEvent): Promise<string> {
    if (!this.canSign) {
      throw new Error('NDKAmberSigner is only available on Android');
    }

    try {
      // Get the npub representation of the hex pubkey
      const npub = nip19.npubEncode(this.pubkey);

      // Use ExternalSignerUtils to sign the event
      const response = await ExternalSignerUtils.signEvent(event, npub);

      if (!response.signature) {
        throw new Error('No signature returned from Amber');
      }

      return response.signature;
    } catch (e: unknown) {
      console.error('Error signing with Amber:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      throw new Error(`Failed to sign event with Amber: ${errorMessage}`);
    }
  }

  /**
   * Check if this signer is capable of creating encrypted direct messages
   *
   * @returns Always returns false as NIP-04/NIP-44 encryption needs to be implemented separately
   */
  get supportsEncryption(): boolean {
    return false;
  }

  /**
   * Placeholder for NIP-04/NIP-44 encryption
   * This would need to be implemented with Amber support
   */
  async encrypt(recipient: NDKUser, value: string, scheme?: NDKEncryptionScheme): Promise<string> {
    throw new Error('Encryption not implemented');
  }

  /**
   * Placeholder for NIP-04/NIP-44 decryption
   * This would need to be implemented with Amber support
   */
  async decrypt(sender: NDKUser, value: string, scheme?: NDKEncryptionScheme): Promise<string> {
    throw new Error('Decryption not implemented');
  }

  /**
   * Static method to request public key from Amber
   * Uses the ExternalSignerUtils to communicate with Amber.
   *
   * @param permissions Optional array of permissions to request
   * @returns Promise with public key (hex) and package name
   */
  static async requestPublicKey(
    permissions: NIP55Permission[] = []
  ): Promise<{pubkey: string, packageName: string}> {
    if (Platform.OS !== 'android') {
      throw new Error('NDKAmberSigner is only available on Android');
    }

    try {
      // Request public key from Amber
      console.log('[NDKAmberSigner] Requesting public key from Amber');
      const result = await ExternalSignerUtils.requestPublicKey(permissions);
      console.log('[NDKAmberSigner] Received result from ExternalSignerUtils:', result);

      // Convert npub to hex if needed
      let pubkeyHex = result.pubkey;
      if (pubkeyHex.startsWith('npub')) {
        try {
          // Decode the npub to get the hex pubkey
          const decoded = nip19.decode(pubkeyHex);
          if (decoded.type === 'npub') {
            pubkeyHex = decoded.data as string;
          }
        } catch (e) {
          console.error('Error decoding npub:', e);
          throw new Error('Invalid npub returned from Amber');
        }
      }

      return {
        pubkey: pubkeyHex,
        packageName: result.packageName
      };
    } catch (e: unknown) {
      console.error('Error requesting public key from Amber:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      throw new Error(`Failed to get public key from Amber: ${errorMessage}`);
    }
  }
}

export default NDKAmberSigner;
