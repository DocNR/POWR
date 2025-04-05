/**
 * Auth-related constants used throughout the authentication system
 */

/**
 * SecureStore keys for storing authentication-related data
 * Using constants ensures consistent keys across the app
 */
export const SECURE_STORE_KEYS = {
  PRIVATE_KEY: 'nostr_privkey', // Changed to match ndk.ts store key
  EXTERNAL_SIGNER: 'nostr_external_signer',
  PUBKEY: 'nostr_pubkey'
};

/**
 * Authentication methods supported by the app
 */
export type AuthMethod = 'private_key' | 'amber' | 'ephemeral';
