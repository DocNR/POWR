import { Platform, NativeModules } from 'react-native';

// Interface for NIP-55 permission
export interface NIP55Permission {
  type: string;
  kind?: number;
}

// Interface for the response from the native module
export interface AmberResponse {
  signature?: string;
  id?: string;
  event?: string;
  packageName?: string;
  results?: Array<{
    signature?: string;
    id?: string;
    packageName?: string;
  }>;
}

/**
 * Utility functions for interacting with external Nostr signers (Android only)
 * Implements NIP-55 for Android: https://github.com/nostr-protocol/nips/blob/master/55.md
 */
class ExternalSignerUtils {
  /**
   * Check if an external signer is installed (Amber)
   *
   * Uses the native Android module to check if Amber is installed.
   *
   * @returns {Promise<boolean>} True if an external signer is available
   */
  static async isExternalSignerInstalled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      const { AmberSignerModule } = NativeModules;
      if (AmberSignerModule) {
        return await AmberSignerModule.isExternalSignerInstalled();
      }
    } catch (e) {
      console.error('Error checking for external signer:', e);
    }

    return false;
  }

  /**
   * Request public key from external signer
   *
   * @param {Array<NIP55Permission>} permissions Default permissions to request
   * @returns {Promise<{pubkey: string, packageName: string}>} Public key and package name of the signer
   */
  static async requestPublicKey(
    permissions: Array<NIP55Permission> = []
  ): Promise<{pubkey: string, packageName: string}> {
    if (Platform.OS !== 'android') {
      throw new Error('External signers are only supported on Android');
    }

    try {
      const { AmberSignerModule } = NativeModules;
      if (!AmberSignerModule) {
        throw new Error('AmberSignerModule not available');
      }

      console.log('[ExternalSignerUtils] Calling AmberSignerModule.requestPublicKey');
      const response = await AmberSignerModule.requestPublicKey(permissions);
      console.log('[ExternalSignerUtils] Response from AmberSignerModule:', response);

      if (!response) {
        throw new Error('No response received from Amber');
      }

      if (!response.signature) {
        throw new Error(`Invalid response from Amber: ${JSON.stringify(response)}`);
      }

      return {
        pubkey: response.signature, // Amber returns npub in the signature field
        packageName: response.packageName || 'com.greenart7c3.nostrsigner'
      };
    } catch (e) {
      console.error('Error requesting public key:', e);
      throw e;
    }
  }

  /**
   * Sign an event using external signer
   *
   * @param {Object} event The event to sign
   * @param {string} currentUserPubkey The current user's public key
   * @param {string} eventId Optional ID for tracking the event
   * @returns {Promise<AmberResponse>} The response from Amber including signature
   */
  static async signEvent(
    event: any,
    currentUserPubkey: string,
    eventId?: string
  ): Promise<AmberResponse> {
    if (Platform.OS !== 'android') {
      throw new Error('External signers are only supported on Android');
    }

    try {
      const { AmberSignerModule } = NativeModules;
      if (!AmberSignerModule) {
        throw new Error('AmberSignerModule not available');
      }

      const eventJson = JSON.stringify(event);
      console.log('[ExternalSignerUtils] Calling AmberSignerModule.signEvent');
      const response = await AmberSignerModule.signEvent(
        eventJson,
        currentUserPubkey,
        eventId || event.id || `event-${Date.now()}`
      );
      console.log('[ExternalSignerUtils] Response from AmberSignerModule.signEvent:', response);

      return response;
    } catch (e) {
      console.error('Error signing event:', e);
      throw e;
    }
  }

  /**
   * Format permissions for external signer requests
   *
   * @param {Array<NIP55Permission>} permissions The permissions to request
   * @returns {string} JSON string of permissions
   */
  static formatPermissions(permissions: Array<NIP55Permission>): string {
    return JSON.stringify(permissions);
  }

  /**
   * Check if we're running on Android
   *
   * @returns {boolean} True if running on Android
   */
  static isAndroid(): boolean {
    return Platform.OS === 'android';
  }
}

export default ExternalSignerUtils;
