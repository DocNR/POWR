/**
 * Secure storage utilities for authentication
 * Handles credential storage, retrieval, and migration between key formats
 */

import * as SecureStore from 'expo-secure-store';
import { SECURE_STORE_KEYS } from '../constants';
import { Platform } from 'react-native';

// Unique key to track migration status
const MIGRATION_VERSION_KEY = 'auth_migration_v1_completed';

// Legacy storage keys that might contain credentials
const LEGACY_KEYS = {
  PRIVATE_KEY: 'powr.private_key',
  NOSTR_PRIVKEY: 'nostr_privkey', // Original key from ndk.ts
};

/**
 * Migrates credentials from legacy storage keys to the standardized keys
 * This is a one-time operation that runs at app startup
 * 
 * @returns Promise that resolves when migration is complete
 */
export async function migrateKeysIfNeeded(): Promise<void> {
  console.log(`[Auth] Starting key migration check (${Platform.OS})`);

  // Check if migration already happened
  const migrationDone = await SecureStore.getItemAsync(MIGRATION_VERSION_KEY);
  if (migrationDone === 'true') {
    console.log('[Auth] Migration already completed, skipping');
    return;
  }

  console.log('[Auth] Performing one-time key migration');
  
  // Get the current value from the standardized location (if any)
  const currentKey = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY);
  if (currentKey) {
    console.log('[Auth] Already have credentials in standard location');
  }

  // Check for credentials in legacy locations
  const legacyKey = await SecureStore.getItemAsync(LEGACY_KEYS.PRIVATE_KEY);
  const ndkStoreKey = await SecureStore.getItemAsync(LEGACY_KEYS.NOSTR_PRIVKEY);
  
  console.log('[Auth] Storage key status:', {
    hasCurrentKey: !!currentKey,
    hasLegacyKey: !!legacyKey,
    hasNdkStoreKey: !!ndkStoreKey
  });

  // Migration strategy: prioritize existing credentials if any
  if (!currentKey) {
    if (legacyKey) {
      console.log('[Auth] Found credentials in legacy location (powr.private_key), migrating');
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY, legacyKey);
      console.log('[Auth] Legacy key (powr.private_key) migrated successfully');
    } else if (ndkStoreKey) {
      console.log('[Auth] Found credentials in ndk store location (nostr_privkey), migrating');
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.PRIVATE_KEY, ndkStoreKey);
      console.log('[Auth] NDK store key (nostr_privkey) migrated successfully');
    }
  }

  // Mark migration as complete regardless of outcome
  // This prevents repeated migration attempts
  await SecureStore.setItemAsync(MIGRATION_VERSION_KEY, 'true');
  console.log('[Auth] Key migration process completed');
}

/**
 * Clear all authentication credentials from secure storage
 * Handles both current and legacy keys
 */
export async function clearAllCredentials(): Promise<void> {
  console.log('[Auth] Clearing all stored credentials');
  
  // Define all keys that might contain credentials
  const allKeys = [
    SECURE_STORE_KEYS.PRIVATE_KEY,
    SECURE_STORE_KEYS.EXTERNAL_SIGNER,
    SECURE_STORE_KEYS.PUBKEY,
    LEGACY_KEYS.PRIVATE_KEY,
    LEGACY_KEYS.NOSTR_PRIVKEY,
  ];
  
  // Delete all possible keys
  await Promise.all(allKeys.map(key => {
    console.log(`[Auth] Deleting key: ${key}`);
    return SecureStore.deleteItemAsync(key);
  }));
  
  console.log('[Auth] All credentials cleared');
}

/**
 * Gets a credential from secure storage with fallback to legacy locations
 * Useful during transition period when old keys might still be in use
 * 
 * @param key The main storage key to check
 * @param legacyKeys Array of legacy keys to check as fallbacks
 * @returns The credential value if found, null otherwise
 */
export async function getCredentialWithFallback(
  key: string,
  legacyKeys: string[] = []
): Promise<string | null> {
  // First try main key
  let value = await SecureStore.getItemAsync(key);
  
  // If not found, try legacy keys
  if (!value) {
    for (const legacyKey of legacyKeys) {
      console.log(`[Auth] Main key not found, trying legacy key: ${legacyKey}`);
      value = await SecureStore.getItemAsync(legacyKey);
      if (value) {
        console.log(`[Auth] Found credential in legacy location: ${legacyKey}`);
        break;
      }
    }
  }
  
  return value;
}

/**
 * Resets the migration flag for testing purposes
 * Only available in development builds
 */
export async function resetMigration(): Promise<void> {
  if (__DEV__) {
    console.log('[Auth] Resetting migration flag for testing');
    await SecureStore.deleteItemAsync(MIGRATION_VERSION_KEY);
  }
}
