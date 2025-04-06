# Authentication Persistence Debugging Guide

## Overview

This guide explains the authentication persistence system in the POWR app and how to debug issues related to user authentication state not being properly restored after app restarts.

## Background

The app uses several authentication mechanisms:

1. **Zustand-based Auth System** - The default authentication system using a state machine pattern
2. **React Query-based Auth System** - Alternative auth system toggled via feature flag
3. **XState Auth System** - Partially implemented auth system (not fully deployed)

## Authentication Storage

Credentials are stored securely using `expo-secure-store` with the following key architecture:

| Key Name | Storage Location | Description |
|----------|-----------------|-------------|
| `nostr_privkey` | Standard Key | The primary location for private keys (from constants.ts) |
| `nostr_pubkey` | Standard Key | User's public key |
| `nostr_external_signer` | Standard Key | External signer configuration (e.g., Amber) |
| `powr.private_key` | Legacy Key | Legacy location for private keys |

## Common Issues

### 1. Inconsistent Storage Keys

One of the most common issues was inconsistent storage key usage across different parts of the app. This has been fixed by:

- Centralizing key definitions in `lib/auth/constants.ts`
- Creating a migration utility in `lib/auth/persistence/secureStorage.ts`
- Ensuring all parts of the auth system use the same keys

### 2. Race Conditions During Init

Another common issue was race conditions during app initialization:

- NDK initialization happening before credentials are loaded
- Auth state checks happening before provider initialization completes
- Multiple competing auth systems trying to initialize simultaneously

## Implemented Solutions

We've implemented the following solutions to address these issues:

1. **Storage Key Migration**
   - The app now automatically migrates keys from legacy locations to the standardized ones
   - This happens automatically during app initialization
   - The migration occurs only once and tracks its completion state

2. **Improved Initialization Sequence**
   - Added proper sequencing in `app/_layout.tsx`
   - Key migration now runs before NDK initialization
   - Auth providers wait for NDK to be ready before initializing
   - Implemented proper waiting for relay connections

3. **AuthProvider Enhancements**
   - Enhanced error handling and logging
   - Added state inconsistency detection and recovery
   - Improved external signer handling

## Debugging Tools

### Auth Persistence Test Screen

A dedicated test screen is available at `app/test/auth-persistence-test.tsx` for debugging auth persistence issues. It provides:

- Current auth state visualization
- SecureStore key inspection
- Manual migration triggers
- Test key creation for simulating scenarios
- Key clearing functionality

### How to Debug Persistence Issues

If a user reports auth persistence problems:

1. Check if credentials exist in any storage location
   - Use the Auth Persistence Test screen
   - Check both standard and legacy locations

2. Verify migration status
   - The `auth_migration_v1_completed` key indicates if migration has run
   - If not, you can trigger it manually from the test screen

3. Test with a fresh key
   - Clear all keys
   - Create a test key in the legacy location
   - Force restart the app
   - Check if migration and auth restoration work properly

4. Check logs for initialization sequence
   - Look for `[Auth]` and `[AuthProvider]` prefixed logs
   - Verify that key migration runs before NDK initialization
   - Ensure there are no initialization errors

## Implementation Details

### Key Migration Utility

The key migration utility in `lib/auth/persistence/secureStorage.ts` handles:

- One-time migration from legacy to standard locations
- Migration status tracking
- Graceful handling of missing keys
- Migration priority rules (preserve existing keys)

### Configuration

Feature flags in `lib/stores/ndk.ts` control which auth system is active:

```typescript
export const FLAGS = {
  useReactQueryAuth: false, // When true, use React Query auth; when false, use legacy auth
};
```

## Troubleshooting Steps

If a user's authentication is not persisting:

1. **Check Storage Keys**: Use the Auth Persistence Test screen to see if credentials exist
2. **Run Migration**: Try manual migration if storage shows keys in legacy locations
3. **Test Restart Flow**: Clear keys, create test keys, and force restart the app
4. **Toggle Auth Systems**: As a last resort, try toggling the feature flag to use the other auth system
5. **Clear App Data**: If all else fails, have the user clear app data and re-authenticate

## Future Improvements

Planned improvements to the auth persistence system:

1. Phasing out the legacy key locations completely
2. Further unifying the auth providers into a single consistent system
3. Adding more robust error recovery mechanisms
4. Improving the initialization sequence to be more resilient to timing issues
