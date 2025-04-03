# Profile Tab (Overview)

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [Profile Tab Overview](../profile_overview.md), [Nostr Integration](../../../technical/nostr/index.md)

## Introduction

The Profile tab (Overview) is the main landing screen in the Profile section. It displays the user's profile information, including their avatar, banner, display name, and follower statistics. It also shows a personal social feed of the user's own posts.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Profile Header | ✅ Implemented | User banner, avatar, name, and bio |
| Follower Stats | ✅ Implemented | Real-time follower and following counts |
| Public Key Display | ✅ Implemented | Nostr public key in npub format with copy and QR options |
| Personal Social Feed | ✅ Implemented | Chronological feed of user's posts and activities |
| Pull-to-refresh | ✅ Implemented | Updates profile and feed data |
| Authentication Detection | ✅ Implemented | Login prompt for unauthenticated users |
| Offline Support | ✅ Implemented | Graceful degradation for offline state |

## Implementation Details

The Profile tab is implemented in `app/(tabs)/profile/overview.tsx`. It uses the NostrBand API for follower statistics and the NDK integration for the social feed.

### Profile Header Implementation

The profile header includes several key elements:

```jsx
<View>
  {/* Banner Image */}
  <View className="w-full h-40 relative">
    {bannerImageUrl ? (
      <ImageBackground 
        source={{ uri: bannerImageUrl }} 
        className="w-full h-full"
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-black/20" />
      </ImageBackground>
    ) : (
      <View className="w-full h-full bg-gradient-to-b from-primary/80 to-primary/30" />
    )}
  </View>
  
  <View className="px-4 -mt-16 pb-2">
    <View className="flex-row items-end mb-4">
      {/* Avatar */}
      <UserAvatar
        size="xl"
        uri={profileImageUrl}
        fallback={displayName.charAt(0)}
        className="mr-4 border-4 border-background"
        isInteractive={false}
        style={{ width: 90, height: 90 }}
      />
      
      {/* Edit Profile button */}
      <View className="ml-auto mb-2">
        <TouchableOpacity 
          className="px-4 h-10 items-center justify-center rounded-md bg-muted"
          onPress={handleEditProfilePress}
        >
          <Text className="font-medium">Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
    
    {/* Profile info */}
    <View>
      <Text className="text-xl font-bold">{displayName}</Text>
      <Text className="text-muted-foreground">{username}</Text>
      
      {/* Public key (npub) with copy/QR options */}
      {npubFormat && (
        <View className="flex-row items-center mt-1 mb-2">
          <Text className="text-xs text-muted-foreground font-mono">
            {shortenedNpub}
          </Text>
          <TouchableOpacity 
            className="ml-2 p-1"
            onPress={handleCopyButtonPress}
          >
            <Copy size={12} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            className="ml-2 p-1"
            onPress={handleQrButtonPress}
          >
            <QrCode size={12} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Follower stats */}
      <ProfileFollowerStats />
      
      {/* About text */}
      {aboutText && (
        <Text className="mb-3">{aboutText}</Text>
      )}
    </View>
  </View>
</View>
```

### Social Feed Implementation

The social feed displays the user's own posts and activities in reverse chronological order. It integrates with the NDK to fetch posts created by the user.

```jsx
// Initialize feed related state
const [feedItems, setFeedItems] = useState<any[]>([]);
const [feedLoading, setFeedLoading] = useState(false);
const [isOffline, setIsOffline] = useState(false);

// Only call useSocialFeed when authenticated to prevent the error
const socialFeed = isAuthenticated ? useSocialFeed({
  feedType: 'profile',
  authors: currentUser?.pubkey ? [currentUser.pubkey] : [],
  limit: 30
}) : null;
```

### Follower Statistics

The Profile tab uses the `useProfileStats` hook to display real-time follower counts:

```jsx
// Profile follower stats component
const { followersCount, followingCount, isLoading: statsLoading } = useProfileStats({ 
  pubkey: pubkey || '', 
  refreshInterval: 60000 * 15 // refresh every 15 minutes
});
```

This hook calls the NostrBand API to fetch follower data, providing an enhanced user experience with network-wide statistics.

## Technical Considerations

### Hook Consistency

The component structure ensures React hooks are called consistently regardless of authentication state:

```jsx
// Always call useProfileStats to maintain hook ordering
const { followersCount, followingCount, isLoading: statsLoading } = useProfileStats({ 
  pubkey: pubkey || '', 
  refreshInterval: 60000 * 15 
});

// Use separate component for follower stats to avoid conditional hook issues
const ProfileFollowerStats = React.memo(() => {
  // Component code here
});

// Define all callback hooks before any conditional returns
const handleEditProfilePress = useCallback(() => {
  // Handler code
}, [dependencies]);

// Then conditional returns based on authentication
if (!isAuthenticated) {
  return renderLoginScreen();
}
```

### Feed Data Transformation

The component transforms NDK social feed entries to a consistent format:

```jsx
// Convert to the format expected by the component
const entries = React.useMemo(() => {
  return feedItems.map(item => {
    // Create a properly typed AnyFeedEntry based on the item type
    const baseEntry = {
      id: item.id,
      eventId: item.id,
      event: item.originalEvent,
      timestamp: item.createdAt * 1000,
    };
    
    // Add type-specific properties
    switch (item.type) {
      case 'workout':
        return {
          ...baseEntry,
          type: 'workout',
          content: item.parsedContent
        } as WorkoutFeedEntry;
      
      // Other cases...
    }
  });
}, [feedItems]);
```

## User Experience Flow

1. **Authentication Check**:
   - If user is not authenticated, display NostrProfileLogin component
   - If authenticated, proceed to load profile and feed data

2. **Profile Data Loading**:
   - Fetch user profile from NDK
   - Load follower statistics from NostrBand API
   - Parse and format public key for display

3. **Feed Loading**:
   - Subscribe to user's own events via NDK
   - Transform feed data to consistent format
   - Display posts chronologically
   - Support pull-to-refresh for updates

4. **Interaction**:
   - Profile edit navigation
   - Copy public key functionality
   - QR code display (future implementation)
   - Post interaction

## Future Enhancements

1. **Profile Editing**: Enhanced profile editing capabilities
2. **Post Management**: Delete and edit functionality for personal posts
3. **QR Code Implementation**: Complete QR code display for public key sharing
4. **Expanded Post Types**: Additional post type support in the feed
5. **Improved Offline Functionality**: Enhanced caching for offline viewing

## Related Documentation

- [Profile Overview](../profile_overview.md) - General overview of the Profile tab
- [Activity Tab](./activity_tab.md) - Documentation for the Activity tab
- [NostrBand Integration](../../../technical/nostr/nostr_band_integration.md) - Details on NostrBand API integration
- [useProfileStats](../follower_stats.md) - Documentation for follower statistics hook
