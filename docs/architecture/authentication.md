# Authentication Architecture

**Last Updated:** 2025-03-25  
**Status:** Active  
**Related To:** Nostr Integration, State Management

## Purpose

This document describes the authentication architecture of the POWR app, focusing on Nostr-based authentication, key management, and the state machine implementation needed for the MVP.

## Overview

Authentication in POWR is built on the Nostr protocol, which uses public key cryptography. The system:

1. Manages user keypairs for Nostr authentication
2. Maintains clear login/logout state 
3. Securely stores private keys on device
4. Implements a proper state machine for auth transitions
5. Supports offline capabilities with cached authentication

## Component Architecture

### High-Level Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   UI Layer      │     │  Service Layer  │     │   Storage Layer │
│                 │     │                 │     │                 │
│ Login Prompt    │     │ Auth Manager    │     │ Secure Storage  │
│ Auth State UI   │◄───►│ State Machine   │◄───►│ NDK Signer      │
│ Profile Display │     │ Relay Manager   │     │ Session Storage │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Auth State Machine

The core of the authentication architecture is a state machine with these states:

1. **Unauthenticated**: No valid authentication exists
2. **Authenticating**: Authentication process in progress
3. **Authenticated**: User is fully authenticated
4. **Deauthenticating**: Logout process in progress

This state machine handles all transitions between these states, ensuring consistent authentication behavior.

### Implementation

The authentication system uses Zustand for state management:

```typescript
// Auth store implementation example
interface AuthState {
  // State
  state: 'unauthenticated' | 'authenticating' | 'authenticated' | 'deauthenticating';
  user: { pubkey: string; metadata?: any } | null;
  error: Error | null;
  
  // Actions
  login: (privateKeyOrNpub: string) => Promise<void>;
  createAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  state: 'unauthenticated',
  user: null,
  error: null,
  
  login: async (privateKeyOrNpub) => {
    try {
      set({ state: 'authenticating', error: null });
      
      // Implementation details for key import
      // NDK setup with signer
      // Profile fetching
      
      set({ state: 'authenticated', user: { pubkey: '...' } });
    } catch (error) {
      set({ state: 'unauthenticated', error });
    }
  },
  
  createAccount: async () => {
    try {
      set({ state: 'authenticating', error: null });
      
      // Generate new keypair
      // Save to secure storage
      // NDK setup with signer
      
      set({ state: 'authenticated', user: { pubkey: '...' } });
    } catch (error) {
      set({ state: 'unauthenticated', error });
    }
  },
  
  logout: async () => {
    try {
      set({ state: 'deauthenticating' });
      
      // Clean up connections
      // Clear sensitive data
      
      set({ state: 'unauthenticated', user: null });
    } catch (error) {
      // Even on error, force logout
      set({ state: 'unauthenticated', user: null, error });
    }
  }
}));
```

### Key Storage and Management

Private keys are stored using:

- **iOS**: Keychain Services
- **Android**: Android Keystore System
- **Both**: Expo SecureStore wrapper

The keys are never exposed directly to application code; instead, a signer interface is used that can perform cryptographic operations without exposing the private key.

### MVP Implementation Focus

For the MVP release, the authentication system focuses on:

1. **Robust State Management**
   - Clear state transitions
   - Error handling for each state
   - Proper event tracking

2. **Basic Auth Flows**
   - Login with npub or nsec (with security warnings)
   - Account creation
   - Reliable logout

3. **Key Security**
   - Secure storage of private keys
   - Zero exposure of private keys in app memory
   - Proper cleanup on logout

### Integration Points

The authentication system integrates with:

1. **NDK Instance**
   - Provides signer for NDK
   - Manages relay connections
   - Triggers cleanup on logout

2. **Profile Management**
   - Fetches user profile on login
   - Updates profile metadata
   - Handles associated data loading

3. **UI Components**
   - Login/create account prompt
   - Authentication state indicators
   - Profile display components

## Known Issues and Solutions

### Current Issues

1. **Inconsistent Auth State**
   - Problem: Multiple components updating auth state cause race conditions
   - Solution: Centralized state machine with explicit transitions

2. **Incomplete Logout**
   - Problem: Resources not properly cleaned up on logout
   - Solution: Comprehensive cleanup in deauthenticating state

3. **Subscription Cleanup**
   - Problem: Subscriptions not tied to auth lifecycle
   - Solution: Link subscription management to auth state changes

### State Transitions

Handling auth state transitions properly:

```
┌───────────────┐                              ┌───────────────┐
│               │                              │               │
│Unauthenticated│                              │ Authenticated │
│               │                              │               │
└───────┬───────┘                              └───────┬───────┘
        │                                              │
        │ login/                                       │ logout
        │ createAccount                                │
        ▼                                              ▼
┌───────────────┐                              ┌───────────────┐
│               │       success                │               │
│Authenticating │─────────────────────────────►│Deauthenticating│
│               │                              │               │
└───────────────┘                              └───────────────┘
        │                                              │
        │ error                                        │ always
        │                                              │
        ▼                                              ▼
┌───────────────┐                              ┌───────────────┐
│               │                              │               │
│Unauthenticated│◄─────────────────────────────┤Unauthenticated│
│   (with error)│                              │               │
└───────────────┘                              └───────────────┘
```

## Related Documentation

- [NDK Comprehensive Guide](../technical/ndk/comprehensive_guide.md) - NDK implementation
- [Subscription Analysis](../technical/ndk/subscription_analysis.md) - Subscription management
- [Profile Features](../features/profile/index.md) - Profile integration
- [MVP and Targeted Rebuild](../project/mvp_and_rebuild.md) - Overall MVP strategy
