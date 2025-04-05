# Authentication Persistence Fixes

This document summarizes the improvements made to fix authentication persistence issues in the POWR app.

## Overview

The authentication system was enhanced to ensure reliable persistence of user credentials across app restarts. Previously, users needed to re-authenticate each time they restarted the app, even though their credentials were being stored in SecureStore.

## Key Improvements

### 1. Enhanced AuthService

- **Improved initialization process**: Added promise caching for concurrent calls to prevent race conditions
- **More robust credential restoration**: Better error handling when restoring stored private keys or external signers
- **SecureStore key constants**: Added constants for all SecureStore keys to avoid inconsistencies
- **Public key caching**: Added storage of public key alongside private key for faster access
- **Clean credential handling**: Automatic cleanup of invalid credentials when restoration fails
- **Enhanced logging**: Comprehensive logging throughout the authentication flow

### 2. Improved ReactQueryAuthProvider

- **Better NDK initialization**: Enhanced initialization with credential pre-checking
- **Initialization tracking**: Added tracking of initialization attempts to prevent duplicates
- **State management**: Improved state updates to ensure they only occur for the most recent initialization
- **Auth state invalidation**: Force refresh of auth state after initialization
- **Error resilience**: Better error handling throughout the provider

### 3. Fixed useAuthQuery Hook

- **Pre-initialization**: Added pre-initialization of auth service when the hook is first used
- **Query configuration**: Adjusted query settings for better reliability (staleTime, refetchOnWindowFocus, etc.)
- **Type safety**: Fixed TypeScript errors to ensure proper type checking
- **Initialization reference**: Added reference tracking to prevent memory leaks
- **Better error handling**: Enhanced error management throughout the hook

## Implementation Details

### AuthService Changes

- Added promise caching with `initPromise` to handle concurrent initialization calls
- Split initialization into public `initialize()` and private `_doInitialize()` methods
- Improved error handling with try/catch blocks and proper cleanup
- Added constants for secure storage keys (`POWR.PRIVATE_KEY`, etc.)
- Enhanced login methods with optional `saveKey` parameter
- Added public key storage for faster reference

### ReactQueryAuthProvider Changes

- Added initialization attempt tracking to prevent race conditions
- Added pre-checking of credentials before NDK initialization
- Enhanced state management to only update for the most recent initialization attempt
- Improved error resilience to ensure app works even if initialization fails
- Added forced query invalidation after successful initialization

### useAuthQuery Changes

- Added initialization state tracking with useRef
- Pre-initializes auth service when hook is first used
- Improved mutation error handling with better cleanup
- Fixed TypeScript errors with proper type assertions
- Enhanced query settings for better reliability and performance

## Testing

The authentication persistence has been thoroughly tested across various scenarios:

1. App restart with private key authentication
2. App restart with external signer (Amber) authentication
3. Logout and login within the same session
4. Network disconnection and reconnection scenarios
5. Force quit and restart of the application

## Future Considerations

- Consider adding a periodic auth token refresh mechanism
- Explore background token validation to prevent session timeout
- Implement token expiration handling if needed in the future
- Potentially add multi-account support with secure credential switching
