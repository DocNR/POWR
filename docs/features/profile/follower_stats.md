# Profile Follower Statistics

**Last Updated:** 2025-03-28  
**Status:** Active  
**Related To:** Profile Screen, Nostr Integration

## Purpose

This document explains the implementation and usage of real-time follower and following statistics in the POWR app's profile screen. This feature enhances the social experience by providing users with up-to-date visibility into their network connections.

## Feature Overview

The Profile Follower Statistics feature displays accurate counts of a user's followers and following accounts by integrating with the nostr.band API. This provides users with real-time social metrics directly in their profile view.

Key capabilities:
- Display of accurate follower and following counts
- Automatic refresh of data at configurable intervals
- Graceful loading states during data fetching
- Error handling for network or API issues
- Proper formatting of large numbers

## User Experience

### Profile Screen Integration

Follower statistics appear in the profile header section, directly below the user's npub display. The statistics are presented in a horizontal layout with the following format:

```
[Following Count] following     [Followers Count] followers
```

For example:
```
2,351 following     4,764 followers
```

The counts are formatted with thousands separators for better readability.

### Loading States

When statistics are being loaded for the first time or refreshed, the UI displays a loading indicator instead of numbers:

```
... following     ... followers
```

This provides visual feedback to users that data is being fetched while maintaining layout stability.

### Refresh Behavior

Statistics automatically refresh at configurable intervals (default: every 15 minutes) to ensure data remains relatively current without excessive API calls. The refresh is performed in the background without disrupting the user experience.

### Error Handling

If an error occurs during data fetching, the UI gracefully falls back to a default state rather than showing error messages to the user. This ensures a clean user experience even when network issues or API limitations are encountered.

## Technical Implementation

### Components

The feature is implemented using the following components:

1. **ProfileFollowerStats Component**: A React component that displays follower and following counts
2. **useProfileStats Hook**: Provides the data and loading states to the component
3. **NostrBandService**: Service that interfaces with the nostr.band API

### Implementation Details

The follower stats component is embedded within the Profile screen and leverages the nostr.band API through our custom hook:

```tsx
// Profile follower stats component
const ProfileFollowerStats = React.memo(({ pubkey }: { pubkey?: string }) => {
  const { followersCount, followingCount, isLoading, error } = useProfileStats({ 
    pubkey, 
    refreshInterval: 60000 * 15 // refresh every 15 minutes
  });
  
  return (
    <View className="flex-row mb-2">
      <TouchableOpacity className="mr-4">
        <Text>
          <Text className="font-bold">{isLoading ? '...' : followingCount.toLocaleString()}</Text>
          <Text className="text-muted-foreground"> following</Text>
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity>
        <Text>
          <Text className="font-bold">{isLoading ? '...' : followersCount.toLocaleString()}</Text>
          <Text className="text-muted-foreground"> followers</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
});
```

### Usage

The component is used in the profile screen as follows:

```tsx
// Inside profile screen component
<ProfileFollowerStats pubkey={currentUser?.pubkey} />
```

## Configuration Options

The follower statistics feature can be configured with the following options:

### Refresh Interval

The time (in milliseconds) between automatic refreshes of the statistics:

```tsx
// Default: 15 minutes
refreshInterval: 60000 * 15 
```

This can be adjusted based on:
- User engagement patterns
- API rate limiting concerns
- Network performance considerations

## Design Considerations

### UI Placement and Styling

The follower statistics are positioned prominently in the profile header but below the user's identity information (name, username, npub) to create a clear visual hierarchy:

1. User identity (name, username)
2. User identification (npub)
3. Network statistics (following/followers)
4. User bio/about text

This placement follows common social media patterns where follower counts are important but secondary to identity.

### Interactions

While currently implemented as TouchableOpacity components, the follower and following counts are prepared for future enhancements that would allow:
- Tapping on "following" to show a list of accounts the user follows
- Tapping on "followers" to show a list of followers

These future enhancements will be implemented in subsequent updates.

## Accessibility

The follower statistics component is designed with accessibility in mind:

- Text sizing uses relative units to respect system font size settings
- Color contrast meets WCAG accessibility guidelines
- Component supports screen readers with appropriate text labels

## Future Enhancements

Planned enhancements for the follower statistics feature include:

1. Navigate to follower/following lists when tapping on counts
2. Visual indicator for recent changes in follower counts
3. Offline support with cached follower statistics
4. Enhanced error states with retry options
5. Additional statistics such as post count and engagement metrics

## References

- [NostrBandService](../../../lib/services/NostrBandService.ts) - The service implementation
- [useProfileStats](../../../lib/hooks/useProfileStats.ts) - The React hook implementation
- [Profile Overview Screen](../../../app/(tabs)/profile/overview.tsx) - The profile screen implementation
- [nostr.band API Integration](../../technical/nostr/nostr_band_integration.md) - Technical documentation on the API integration
