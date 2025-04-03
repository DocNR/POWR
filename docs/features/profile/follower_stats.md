# Follower Statistics

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [Profile Tab](./tabs/overview_tab.md), [NostrBand Integration](../../technical/nostr/nostr_band_integration.md)

## Introduction

The follower statistics feature provides real-time information about a user's Nostr followers and following counts. This document outlines the technical implementation of follower statistics, which is primarily displayed in the Profile tab.

## Implementation Overview

Follower statistics are implemented through integration with the NostrBand API, which provides network-wide statistics for Nostr users, including follower counts. This integration is handled through the NostrBandService and exposed via the useProfileStats hook.

### Key Components

- **NostrBandService**: Core service that interfaces with the NostrBand API
- **useProfileStats Hook**: React hook that provides access to follower statistics
- **ProfileFollowerStats Component**: UI component for displaying follower statistics

## NostrBand Service Implementation

The NostrBandService (implemented in `lib/services/NostrBandService.ts`) provides methods for fetching follower statistics:

```typescript
// NostrBand service for fetching follower statistics
export class NostrBandService {
  private baseUrl = 'https://api.nostr.band/v0';
  
  // Fetch follower statistics for a given public key
  public async getProfileStats(pubkey: string): Promise<ProfileStats> {
    if (!pubkey) {
      return { followersCount: 0, followingCount: 0 };
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/profile/${pubkey}/stats`);
      
      if (!response.ok) {
        throw new Error(`NostrBand API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        followersCount: data.followers_count || 0,
        followingCount: data.following_count || 0
      };
    } catch (error) {
      console.error('Error fetching profile stats:', error);
      // Return default values on error
      return { followersCount: 0, followingCount: 0 };
    }
  }
}

// Singleton instance
export const nostrBandService = new NostrBandService();
```

### ProfileStats Interface

The ProfileStats interface defines the structure of follower statistics:

```typescript
export interface ProfileStats {
  followersCount: number;
  followingCount: number;
}
```

## useProfileStats Hook

The useProfileStats hook (implemented in `lib/hooks/useProfileStats.ts`) provides a React interface for accessing follower statistics:

```typescript
// Hook for accessing profile statistics
export function useProfileStats({ 
  pubkey, 
  refreshInterval = 0
}: {
  pubkey: string;
  refreshInterval?: number;
}): {
  followersCount: number;
  followingCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [stats, setStats] = useState<ProfileStats>({ followersCount: 0, followingCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch profile stats
  const fetchStats = useCallback(async () => {
    if (!pubkey) {
      setStats({ followersCount: 0, followingCount: 0 });
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const profileStats = await nostrBandService.getProfileStats(pubkey);
      setStats(profileStats);
    } catch (error) {
      console.error('Error in useProfileStats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pubkey]);
  
  // Initial fetch and refresh interval
  useEffect(() => {
    fetchStats();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStats, refreshInterval]);
  
  // Return stats and loading state
  return {
    ...stats,
    isLoading,
    refresh: fetchStats
  };
}
```

## Profile Integration

The follower statistics are displayed in the Profile tab using the ProfileFollowerStats component:

```jsx
// Profile follower stats component
const ProfileFollowerStats = React.memo(() => {
  return (
    <View className="flex-row mb-2">
      <TouchableOpacity className="mr-4">
        <Text>
          <Text className="font-bold">{statsLoading ? '...' : followingCount.toLocaleString()}</Text>
          <Text className="text-muted-foreground"> following</Text>
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity>
        <Text>
          <Text className="font-bold">{statsLoading ? '...' : followersCount.toLocaleString()}</Text>
          <Text className="text-muted-foreground"> followers</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
});
```

This component is called in the Profile tab header:

```jsx
// In the Profile header
const { followersCount, followingCount, isLoading: statsLoading } = useProfileStats({ 
  pubkey: pubkey || '', 
  refreshInterval: 60000 * 15 // refresh every 15 minutes
});

// Later in the JSX
<ProfileFollowerStats />
```

## Hook Ordering Consistency

To maintain React hook ordering consistency regardless of authentication state, the useProfileStats hook is always called, even when the user is not authenticated:

```jsx
// Always call useProfileStats hook, even if isAuthenticated is false
// This ensures consistent hook ordering regardless of authentication state
const { followersCount, followingCount, isLoading: statsLoading } = useProfileStats({ 
  pubkey: pubkey || '', 
  refreshInterval: 60000 * 15
});
```

When not authenticated or when the pubkey is empty, the hook returns default values (zero counts).

## Caching Strategy

Follower statistics are cached to reduce API calls and improve performance:

```typescript
// In NostrBandService
private cache = new Map<string, { stats: ProfileStats; timestamp: number }>();
private cacheTTL = 15 * 60 * 1000; // 15 minutes

public async getProfileStats(pubkey: string): Promise<ProfileStats> {
  // Check cache first
  const cached = this.cache.get(pubkey);
  if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
    return cached.stats;
  }
  
  // Fetch from API if not cached or expired
  try {
    const stats = await this.fetchProfileStats(pubkey);
    
    // Update cache
    this.cache.set(pubkey, {
      stats,
      timestamp: Date.now()
    });
    
    return stats;
  } catch (error) {
    // Error handling...
  }
}
```

## Offline Support

The follower statistics feature gracefully handles offline states:

```typescript
public async getProfileStats(pubkey: string): Promise<ProfileStats> {
  // Check connectivity
  if (!this.connectivityService.isOnline()) {
    // Return cached data if available
    const cached = this.cache.get(pubkey);
    if (cached) {
      return cached.stats;
    }
    
    // Return default values if no cached data
    return { followersCount: 0, followingCount: 0 };
  }
  
  // Proceed with normal API call if online
  // ...
}
```

## Performance Considerations

To ensure good performance, several optimizations are implemented:

1. **Memoization**: The ProfileFollowerStats component is memoized to prevent unnecessary re-renders
2. **Refresh Interval**: Stats are only refreshed at specific intervals (default: 15 minutes)
3. **Caching**: Follower statistics are cached to reduce API calls
4. **Lazy Loading**: Stats are loaded after the profile is rendered to prioritize UI responsiveness

## Future Enhancements

Future enhancements to follower statistics include:

1. **Follower List**: Display a list of followers/following with profile information
2. **Interaction Analytics**: Show interaction statistics with followers
3. **Growth Tracking**: Track follower growth over time
4. **Network Visualization**: Visualize the user's Nostr network
5. **Notification Integration**: Notify users of new followers

## Related Documentation

- [Profile Tab](./tabs/overview_tab.md) - UI implementation of profile display
- [NostrBand Integration](../../technical/nostr/nostr_band_integration.md) - Technical details of the NostrBand API integration
- [Authentication Patterns](./authentication_patterns.md) - How authentication affects hook ordering
