# External Signer Integration for POWR (NIP-55)

This document outlines the implementation of external Nostr signer support in POWR, particularly focusing on [Amber](https://github.com/greenart7c3/Amber), a popular NIP-55 compliant signer for Android.

## Overview

External signers provide a secure way for users to sign Nostr events without exposing their private keys to applications. This follows the [NIP-55 specification](https://github.com/nostr-protocol/nips/blob/master/55.md), which defines a standard protocol for delegating signing operations to a separate application.

Key advantages:
- **Enhanced security**: Private keys never leave the signer app
- **Better key management**: Users can use the same identity across multiple applications
- **Reduced risk**: Applications don't need to handle sensitive key material

## Implementation Components

### 1. Android Manifest Configuration

In `app.json`, we've added the necessary configuration to:
- Allow our app to communicate with external signers using the `nostrsigner` scheme
- Expose our app to external signers using the `powr` scheme

```json
"android": {
  // Existing configuration...
  "intentFilters": [
    {
      "autoVerify": true,
      "action": "VIEW",
      "data": [{ "scheme": "powr" }],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ],
  "queries": {
    "intent": {
      "action": "VIEW",
      "data": [{ "scheme": "nostrsigner" }],
      "category": ["BROWSABLE"]
    }
  }
}
```

### 2. Utility Functions

Created `utils/ExternalSignerUtils.ts` to provide helpers for:
- Detecting if compatible external signers are installed
- Formatting permissions for NIP-55 requests
- Creating intent parameters for communication with external signers

```typescript
// Key functions:
isExternalSignerInstalled(): Promise<boolean>
formatPermissions(permissions: NIP55Permission[]): string
createIntentParams(params: NIP55Params): { [key: string]: string }
```

### 3. NDK Signer Implementation

Created `lib/signers/NDKAmberSigner.ts` which implements the `NDKSigner` interface, including:

```typescript
export default class NDKAmberSigner implements NDKSigner {
  private pubkey: string;
  private packageName: string;

  constructor(pubkey: string, packageName: string) {
    this.pubkey = pubkey;
    this.packageName = packageName;
  }

  static async requestPublicKey(): Promise<{ pubkey: string, packageName: string }> {
    // Implementation to request a public key from the Amber signer
    // through Android Intent mechanism
  }

  async sign(event: NostrEvent): Promise<SignedEvent> {
    // Implementation to sign an event using the Amber signer
    // through Android Intent mechanism
    
    // Returns the signed event with a valid signature
  }

  getPublicKey(): string {
    return this.pubkey;
  }
}
```

### 4. UI Integration

Updated `components/sheets/NostrLoginSheet.tsx` to:
- Add a "Sign with Amber" button on Android
- Check if external signers are available before showing the button
- Implement the login flow using external signers

```typescript
// Key components:
const [isExternalSignerAvailable, setIsExternalSignerAvailable] = useState<boolean>(false);

// Check for signer availability on component mount
useEffect(() => {
  async function checkExternalSigner() {
    if (Platform.OS === 'android') {
      const available = await ExternalSignerUtils.isExternalSignerInstalled();
      setIsExternalSignerAvailable(available);
    }
  }
  
  checkExternalSigner();
}, []);

// Handler for Amber login
const handleAmberLogin = async () => {
  try {
    const { pubkey, packageName } = await NDKAmberSigner.requestPublicKey();
    // Create an NDKAmberSigner with the public key and package name
    // Set this signer on the NDK instance
    // Update authentication state
  } catch (err) {
    // Error handling
  }
};
```

## Technical Flow

1. **Detection**: App checks if external signers are installed on the device
2. **Login Initiation**: User taps "Sign with Amber" button
3. **Public Key Request**: App creates an Android Intent with `action=VIEW` and `scheme=nostrsigner`
4. **Signer Response**: Amber responds with the user's public key via a deep link back to the app
5. **Event Signing**: For each event that needs signing:
   - App creates an Intent with the event data
   - Amber presents signing request to user
   - Upon approval, Amber signs the event and returns it to the app
   - App processes the signed event and sends it to relays

## Security Considerations

- Always verify signatures on returned events
- Set appropriate permissions when requesting signing capabilities
- Implement proper error handling for cases when the external signer is unavailable
- Clear cached signing references when a user logs out

## Testing

To test external signer integration:
1. Install Amber from the Google Play Store
2. Create a Nostr identity in Amber
3. Launch POWR and select "Sign with Amber" on the login screen
4. Verify that Amber opens and requests authorization
5. Confirm that events created in POWR are properly signed by Amber

## Future Improvements

- Support for additional NIP-55 compliant signers
- iOS support when NIP-55 compliant signers become available
- Enhanced permission management for different event kinds
- Improved error handling and fallback mechanisms

## References

- [NIP-55 Specification](https://github.com/nostr-protocol/nips/blob/master/55.md)
- [Amber Project](https://github.com/greenart7c3/Amber)
- [Android Intent Documentation](https://developer.android.com/reference/android/content/Intent)
