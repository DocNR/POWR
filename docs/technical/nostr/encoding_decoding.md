# NIP-19 Encoding and Decoding

**Last Updated:** 2025-03-26  
**Status:** Active  
**Related To:** NDK, POWR Packs, Social Features

## Purpose

This document provides a comprehensive guide to working with NIP-19 encoding and decoding in NDK, focusing on practical examples and best practices for the POWR app. It covers how to handle various Nostr address formats (npub, note, naddr) and convert between hex and encoded representations.

## NIP-19 Overview

NIP-19 defines human-readable, Bech32-encoded identifiers for various Nostr entities:

- `npub`: Public keys (e.g., `npub1...`)
- `nsec`: Private keys (e.g., `nsec1...`)
- `note`: Event IDs (e.g., `note1...`)
- `nprofile`: Public key with relay information (e.g., `nprofile1...`)
- `nevent`: Event with relay information (e.g., `nevent1...`)
- `naddr`: Parameterized replaceable event coordinates (e.g., `naddr1...`)

## Core NIP-19 Functions

NDK implements NIP-19 functionality in the `events/nip19.ts` file. The key functions you'll need are:

### 1. Decoding NIP-19 Entities

```typescript
import { nip19 } from '@nostr-dev-kit/ndk';

// Decode any NIP-19 entity (naddr, npub, nsec, note, etc.)
function decodeNaddr(naddrString: string) {
  try {
    const decoded = nip19.decode(naddrString);
    
    // For naddr specifically, you'll get:
    if (decoded.type === 'naddr') {
      const { pubkey, kind, identifier } = decoded.data;
      
      // pubkey is the hex public key of the author
      // kind is the event kind (30004 for lists)
      // identifier is the 'd' tag value
      
      console.log('Hex pubkey:', pubkey);
      console.log('Event kind:', kind);
      console.log('Identifier:', identifier);
      
      return decoded.data;
    }
    
    return null;
  } catch (error) {
    console.error('Invalid NIP-19 format:', error);
    return null;
  }
}
```

### 2. Encoding to NIP-19 Formats

```typescript
// Create an naddr from components
function createNaddr(pubkey: string, kind: number, identifier: string) {
  return nip19.naddrEncode({
    pubkey,  // Hex pubkey
    kind,    // Event kind (number)
    identifier // The 'd' tag value
  });
}

// Create an npub from a hex public key
function hexToNpub(hexPubkey: string) {
  return nip19.npubEncode(hexPubkey);
}

// Create a note (event reference) from event ID
function eventIdToNote(eventId: string) {
  return nip19.noteEncode(eventId);
}
```

### 3. Utility Functions for Hex Keys

```typescript
// Convert npub to hex pubkey
function npubToHex(npub: string) {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === 'npub') {
      return decoded.data as string; // This is the hex pubkey
    }
    return null;
  } catch (error) {
    console.error('Invalid npub format:', error);
    return null;
  }
}

// Check if a string is a valid hex key (pubkey or event id)
function isValidHexKey(hexString: string) {
  return /^[0-9a-f]{64}$/i.test(hexString);
}
```

## Using NIP-19 Functions with NDK Filters

Here's how you would use these functions with NDK filters to fetch a POWR Pack from an naddr:

```typescript
async function fetchPackFromNaddr(naddr: string) {
  try {
    // Decode the naddr to get event coordinates
    const decoded = nip19.decode(naddr);
    
    if (decoded.type !== 'naddr') {
      throw new Error('Not an naddr');
    }
    
    const { pubkey, kind, identifier } = decoded.data;
    
    // Ensure it's a list (kind 30004)
    if (kind !== 30004) {
      throw new Error('Not a NIP-51 list');
    }
    
    // Create a filter to fetch the specific list event
    const filter = {
      kinds: [kind],
      authors: [pubkey], // Using the hex pubkey from the naddr
      '#d': identifier ? [identifier] : undefined, // Using the d-tag if available
    };
    
    // Fetch the event
    const events = await ndk.fetchEvents(filter);
    
    if (events.size === 0) {
      throw new Error('Pack not found');
    }
    
    // Get the first matching event
    return Array.from(events)[0];
  } catch (error) {
    console.error('Error fetching pack:', error);
    throw error;
  }
}
```

## Implementing the Complete naddr Workflow for POWR Packs

Here's a complete example for fetching and processing a POWR Pack from an naddr:

```typescript
import NDK, { NDKEvent, NDKFilter, nip19 } from '@nostr-dev-kit/ndk';

async function fetchAndProcessPOWRPack(naddr: string) {
  // 1. Initialize NDK
  const ndk = new NDK({ 
    explicitRelayUrls: [
      'wss://relay.damus.io', 
      'wss://relay.nostr.band'
    ] 
  });
  await ndk.connect();
  
  // 2. Decode the naddr
  const decoded = nip19.decode(naddr);
  if (decoded.type !== 'naddr') {
    throw new Error('Invalid naddr format');
  }
  
  const { pubkey, kind, identifier } = decoded.data;
  
  // 3. Create filter to fetch the pack event
  const packFilter: NDKFilter = {
    kinds: [kind],
    authors: [pubkey],
    '#d': identifier ? [identifier] : undefined
  };
  
  // 4. Fetch the pack event
  const packEvents = await ndk.fetchEvents(packFilter);
  if (packEvents.size === 0) {
    throw new Error('Pack not found');
  }
  
  const packEvent = Array.from(packEvents)[0];
  
  // 5. Extract template and exercise references
  const templateRefs: string[] = [];
  const exerciseRefs: string[] = [];
  
  for (const tag of packEvent.tags) {
    if (tag[0] === 'a') {
      const addressPointer = tag[1];
      // Format is kind:pubkey:d-tag
      if (addressPointer.startsWith('33402:')) { // Workout template
        templateRefs.push(addressPointer);
      } else if (addressPointer.startsWith('33401:')) { // Exercise
        exerciseRefs.push(addressPointer);
      }
    }
  }
  
  // 6. Fetch templates and exercises
  const templates = await fetchReferencedEvents(ndk, templateRefs);
  const exercises = await fetchReferencedEvents(ndk, exerciseRefs);
  
  // 7. Return the complete pack data
  return {
    pack: packEvent,
    templates,
    exercises
  };
}

// Helper function to fetch events from address pointers
async function fetchReferencedEvents(ndk: NDK, addressPointers: string[]) {
  const events: NDKEvent[] = [];
  
  for (const pointer of addressPointers) {
    // Parse the pointer (kind:pubkey:d-tag)
    const [kindStr, hexPubkey, dTag] = pointer.split(':');
    const kind = parseInt(kindStr);
    
    // Create a filter to find this specific event
    const filter: NDKFilter = {
      kinds: [kind],
      authors: [hexPubkey]
    };
    
    if (dTag) {
      filter['#d'] = [dTag];
    }
    
    // Fetch the events
    const fetchedEvents = await ndk.fetchEvents(filter);
    events.push(...Array.from(fetchedEvents));
  }
  
  return events;
}
```

## Creating naddr for Sharing Packs

If you want to generate an naddr that can be shared to allow others to import your POWR Pack:

```typescript
function createShareableNaddr(packEvent: NDKEvent) {
  // Extract the d-tag (identifier)
  const dTags = packEvent.getMatchingTags('d');
  const identifier = dTags[0]?.[1] || '';
  
  // Create the naddr
  const naddr = nip19.naddrEncode({
    pubkey: packEvent.pubkey,
    kind: packEvent.kind,
    identifier
  });
  
  return naddr;
}
```

## Integration with User Profile Functions

When displaying user information in the social feed or profile pages, you'll often need to convert between hex and NIP-19 formats:

```typescript
// Display a user's profile with proper npub format
function displayUserProfile(hexPubkey: string) {
  // Convert hex pubkey to npub for display
  const npub = nip19.npubEncode(hexPubkey);
  
  // Format for display (e.g., npub1abc...xyz)
  const shortNpub = `${npub.substring(0, 8)}...${npub.substring(npub.length - 3)}`;
  
  return {
    displayName: shortNpub,
    fullNpub: npub,
    hexPubkey: hexPubkey
  };
}

// Create nprofile for deep linking to a user profile
function createProfileLink(user: NDKUser) {
  // Get the relay URLs the user is known to use
  const relayUrls = user.relayUrls || [];
  
  // Create an nprofile (includes relays)
  const nprofile = nip19.nprofileEncode({
    pubkey: user.pubkey,
    relays: relayUrls
  });
  
  return nprofile;
}
```

## Best Practices for Working with NIP-19 Formats

1. **Always validate decoded values**: Check that the decoded data is of the expected type and has the necessary properties.

2. **Handle encoding/decoding errors**: These functions can throw exceptions if the input is malformed.

3. **Normalize hex keys**: Convert to lowercase for consistency in filters and comparisons.

4. **Check event kinds**: Verify that the decoded event kind matches what you expect (30004 for NIP-51 lists).

5. **Use strong typing**: TypeScript's type system can help catch errors with NIP-19 data.

6. **Centralize encoding/decoding logic**: Create utility functions rather than scattering encoding/decoding calls throughout your codebase.

7. **Cache decoded values**: If you're repeatedly working with the same NIP-19 strings, consider caching the decoded results.

## Common Pitfalls

1. **Confusing hex and encoded formats**: Always be clear about which format (hex or NIP-19 encoded) a function expects.

2. **Missing error handling**: NIP-19 functions can throw errors when inputs are invalid.

3. **Relay selection for naddrEncode**: When creating naddr or nevent, consider which relays to include for better discovery.

4. **Performance implications**: Encoding/decoding operations are relatively expensive, so avoid doing them in tight loops.

## Related Documentation

- [NDK Comprehensive Guide](../ndk/comprehensive_guide.md) - Complete guide to NDK functionality
- [NDK Subscription Analysis](../ndk/subscription_analysis.md) - Guide to NDK subscription system
- [Nostr Exercise NIP](./exercise_nip.md) - Specification for workout events
- [POWR Pack Implementation](../../features/powr_packs/implementation_plan.md) - POWR Pack implementation details
