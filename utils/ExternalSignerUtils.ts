// utils/ExternalSignerUtils.ts
import { Platform } from 'react-native';

/**
 * Utility functions for interacting with external Nostr signers (Android only)
 * Implements NIP-55 for Android: https://github.com/nostr-protocol/nips/blob/master/55.md
 */
class ExternalSignerUtils {
  /**
   * Check if an external signer is installed (Amber)
   * 
   * Note: This needs to be implemented in native code since it requires
   * access to Android's PackageManager to query for activities that can
   * handle the nostrsigner: scheme. This is a placeholder for the TypeScript
   * interface.
   * 
   * @returns {Promise<boolean>} True if an external signer is available
   */
  static isExternalSignerInstalled(): Promise<boolean> {
    // This would need to be implemented with native modules
    // For now, we'll return false if not on Android
    if (Platform.OS !== 'android') {
      return Promise.resolve(false);
    }

    // TODO: Add actual implementation that calls native code:
    // In native Android code:
    // val intent = Intent().apply {
    //   action = Intent.ACTION_VIEW
    //   data = Uri.parse("nostrsigner:")
    // }
    // val infos = context.packageManager.queryIntentActivities(intent, 0)
    // return infos.size > 0

    // Placeholder implementation - this should be replaced with actual native code check
    return Promise.resolve(false);
  }

  /**
   * Format permissions for external signer requests
   * 
   * @param {Array<{type: string, kind?: number}>} permissions The permissions to request
   * @returns {string} JSON string of permissions
   */
  static formatPermissions(permissions: Array<{type: string, kind?: number}>): string {
    return JSON.stringify(permissions);
  }

  /**
   * Create intent parameters for getting public key from external signer
   * 
   * @param {Array<{type: string, kind?: number}>} permissions Default permissions to request
   * @returns {Object} Parameters for the intent
   */
  static createGetPublicKeyParams(permissions: Array<{type: string, kind?: number}> = []): any {
    return {
      type: 'get_public_key',
      permissions: this.formatPermissions(permissions)
    };
  }

  /**
   * Create intent parameters for signing an event
   * 
   * @param {Object} event The event to sign
   * @param {string} currentUserPubkey The current user's public key
   * @returns {Object} Parameters for the intent
   */
  static createSignEventParams(event: any, currentUserPubkey: string): any {
    return {
      type: 'sign_event',
      id: event.id || `event-${Date.now()}`,
      current_user: currentUserPubkey
    };
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
