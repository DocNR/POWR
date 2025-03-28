# Nostr.band API Integration

**Last Updated:** 2025-03-28  
**Status:** Active  
**Related To:** Profile Stats, NostrBandService, useProfileStats

## Purpose

This document outlines the integration of the nostr.band API in the POWR app for retrieving profile statistics and other Nostr-related data.

## nostr.band API Overview

[Nostr.band](https://nostr.band) is a Nostr search engine and indexer that provides a comprehensive API for accessing aggregated statistics and data from the Nostr network. The API offers various endpoints for querying profile stats, events, and other Nostr-related information.

### API Base URL

```
https://api.nostr.band
```

### Authentication

The nostr.band API (as of March 2025) does not require authentication for basic profile statistics. It uses simple REST endpoints with path parameters.

## Available Endpoints

### Profile Statistics

Retrieve follower and following counts for a specific pubkey:

```
GET /v0/stats/profile/{pubkey}
```

Where `{pubkey}` is the hex-format Nostr public key.

#### Response Format

```json
{
  "stats": {
    "[pubkey]": {
      "pubkey": "[pubkey]",
      "followers_pubkey_count": 123,
      "pub_following_pubkey_count": 456,
      // Other stats may be available
    }
  }
}
```

## Implementation in POWR

Our implementation consists of two main components:

1. **NostrBandService**: A service class that handles API communication
2. **useProfileStats**: A React hook that provides the stats to components

### NostrBandService

Located at `lib/services/NostrBandService.ts`, this service:

- Provides methods to interact with the nostr.band API
- Handles error cases and edge conditions
- Converts between npub and hex formats as needed

```typescript
// Example usage:
import { nostrBandService } from '@/lib/services/NostrBandService';

// Fetch profile stats
const stats = await nostrBandService.fetchProfileStats('npub1...');
console.log(stats.followersCount); // Number of followers
console.log(stats.followingCount); // Number of accounts being followed
```

### useProfileStats Hook

Located at `lib/hooks/useProfileStats.ts`, this hook:

- Wraps the NostrBandService in a React hook
- Provides loading/error states
- Supports automatic refresh intervals
- Falls back to current user's pubkey if none provided

```typescript
// Example usage:
import { useProfileStats } from '@/lib/hooks/useProfileStats';

function MyComponent() {
  const { 
    followersCount, 
    followingCount, 
    isLoading, 
    error 
  } = useProfileStats({
    pubkey: 'npub1...', // Optional: defaults to current user
    refreshInterval: 60000 * 15 // Optional: refreshes every 15 minutes
  });

  if (isLoading) return <LoadingIndicator />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <Text>Followers: {followersCount}</Text>
      <Text>Following: {followingCount}</Text>
    </View>
  );
}
```

## How to Use the nostr.band API in POWR

### Step 1: Import the Required Dependencies

```typescript
import { useProfileStats } from '@/lib/hooks/useProfileStats';
// OR for direct API access:
import { nostrBandService } from '@/lib/services/NostrBandService';
```

### Step 2: Use the Hook in Your Component

```typescript
// With the hook (recommended for React components)
function ProfileComponent({ pubkey }) {
  const { 
    followersCount, 
    followingCount, 
    isLoading,
    refresh, // Function to manually refresh stats
    lastRefreshed // Timestamp of last refresh
  } = useProfileStats({
    pubkey,
    refreshInterval: 300000 // 5 minutes in milliseconds (optional)
  });

  // Now use the stats in your UI
}
```

### Step 3: Handle Loading and Error States

```typescript
if (isLoading) {
  return <Text>Loading stats...</Text>;
}

if (error) {
  return <Text>Error loading stats: {error.message}</Text>;
}
```

### Step 4: Display the Data

```typescript
<View className="flex-row mb-2">
  <Text>
    <Text className="font-bold">{followingCount.toLocaleString()}</Text>
    <Text className="text-muted-foreground"> following</Text>
  </Text>
  
  <Text className="ml-4">
    <Text className="font-bold">{followersCount.toLocaleString()}</Text>
    <Text className="text-muted-foreground"> followers</Text>
  </Text>
</View>
```

## API Rate Limiting

As of March 2025, the nostr.band API has the following rate limits:

- 60 requests per minute per IP address
- 1000 requests per day per IP address

To respect these limits:
- Implement reasonable refresh intervals (e.g., 15 minutes)
- Add caching mechanisms for frequently requested data
- Use error handling to gracefully degrade when rate limits are reached

## Error Handling

The service handles common error cases:

1. Invalid npub format
2. Network errors
3. API errors (non-200 responses)
4. Missing data in response

In all error cases, the service will:
- Log the error to the console
- Return a structured error object
- Set appropriate loading/error states

## Future Enhancements

Potential future enhancements for the nostr.band integration:

1. Add support for additional endpoints (search, events, etc.)
2. Implement caching to reduce API calls
3. Add offline support with cached data
4. Expand UI to show additional statistics

## References

- [Nostr.band API Documentation](https://api.nostr.band/docs) (unofficial, as of 2025-03-28)
- [Nostr.band Website](https://nostr.band)
- [NostrBandService.ts](../../lib/services/NostrBandService.ts) - Service implementation
- [useProfileStats.ts](../../lib/hooks/useProfileStats.ts) - Hook implementation
