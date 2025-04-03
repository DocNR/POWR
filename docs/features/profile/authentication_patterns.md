# Authentication Patterns

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [Profile Tab Overview](./profile_overview.md), [Nostr Integration](../../technical/nostr/index.md)

## Introduction

This document outlines the authentication patterns used throughout the Profile tab and other parts of the application that integrate with Nostr. These patterns ensure consistent handling of authenticated and unauthenticated states while maintaining React hook ordering consistency.

## Key Challenges

When implementing authentication in React components, especially with React Navigation and conditional rendering, several key challenges needed to be addressed:

1. **Hook Ordering**: React requires hooks to be called in the same order on every render
2. **Early Returns**: Authentication checks often lead to early returns, which can cause inconsistent hook calls
3. **Conditional Hook Calling**: Different UI for authenticated vs. unauthenticated states can lead to conditional hook usage

## Solution Pattern

The application implements a consistent pattern for handling authentication across components:

### 1. Define All Hooks Unconditionally

All hooks must be defined at the top level of the component, before any conditional returns:

```jsx
// Component setup and imports...

export default function ProfileComponent() {
  // Define all hooks at the top level, regardless of authentication state
  const { isAuthenticated, currentUser } = useNDKCurrentUser();
  const theme = useTheme() as CustomTheme;
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  
  // Even hooks that are only needed in authenticated state should be called
  // with safeguards to prevent errors
  const analytics = useAnalytics();
  const stats = isAuthenticated ? useProfileStats({ pubkey: currentUser?.pubkey || '' }) : { followersCount: 0, followingCount: 0 };
  
  // Define all callback functions before any conditional returns
  const handleSomeAction = useCallback(() => {
    // Implementation...
  }, [dependencies]);
  
  // Only after all hooks are defined, use conditional rendering
  if (!isAuthenticated) {
    return <NostrProfileLogin message="Appropriate message" />;
  }
  
  // Main component rendering logic for authenticated state...
}
```

### 2. Use Memoized Sub-Components for Complex Conditional Logic

For more complex components that have multiple conditional UI elements:

```jsx
// Define separate components for different rendering scenarios
const AuthenticatedView = React.memo(() => {
  // Can safely use hooks here too, as this component itself
  // is unconditionally rendered by the parent
  const someHook = useSomeHook();
  
  return (
    <View>
      {/* Authenticated UI */}
    </View>
  );
});

// Main component with consistent hook ordering
export default function Component() {
  const { isAuthenticated } = useNDKCurrentUser();
  // Other hooks...
  
  // Then use conditional rendering
  return (
    <View>
      {isAuthenticated ? <AuthenticatedView /> : <NostrProfileLogin />}
    </View>
  );
}
```

### 3. Safe Hook Usage with Fallbacks

When a hook is only useful in authenticated state but must be called regardless:

```jsx
// For hooks that need authentication but must be called every time
const { data, loading } = isAuthenticated 
  ? useSomeDataHook({ userId: currentUser?.pubkey }) 
  : { data: null, loading: false };
```

## Real-World Example

In the Profile Overview screen, follower statistics are handled safely regardless of authentication state:

```jsx
// Profile data including fallbacks
const profileImageUrl = currentUser?.profile?.image || 
                       currentUser?.profile?.picture || 
                       (currentUser?.profile as any)?.avatar;
                       
// Follower stats component - always call useProfileStats hook 
// even if isAuthenticated is false (passing empty pubkey)
// This ensures consistent hook ordering regardless of authentication state
const { followersCount, followingCount, isLoading: statsLoading } = useProfileStats({ 
  pubkey: pubkey || '', 
  refreshInterval: 60000 * 15 // refresh every 15 minutes
});

// Use a separate component to avoid conditionally rendered hooks
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

## NostrProfileLogin Component

All tabs use the NostrProfileLogin component for unauthenticated states:

```jsx
// Show different UI when not authenticated
if (!isAuthenticated) {
  return <NostrProfileLogin message="Login-specific message for this screen" />;
}
```

The NostrProfileLogin component provides a consistent login interface with a customizable message parameter to contextualize the login prompt based on the specific tab.

## Authentication State Management

The isAuthenticated state comes from the useNDKCurrentUser hook:

```jsx
const { currentUser, isAuthenticated } = useNDKCurrentUser();
```

This hook, provided by the NDK integration, handles checking if a user is authenticated with Nostr, and provides access to the user's profile information and public key.

## Logout Flow

Logout functionality is implemented in the Settings tab using the useNDKAuth hook:

```jsx
const { logout } = useNDKAuth();

// Logout button
<Button 
  variant="destructive"
  onPress={logout}
  className="w-full"
>
  <Text className="text-white">Logout</Text>
</Button>
```

The logout flow properly clears credentials and updates the isAuthenticated state, which propagates to all components using the NDK context.

## Benefits of This Approach

This authentication pattern provides several benefits:

1. **Consistency**: Authentication is handled consistently across all components
2. **Reliability**: Avoids React hook ordering errors
3. **Maintainability**: Clear pattern for developers to follow
4. **User Experience**: Consistent login interfaces across the application
5. **Performance**: Prevents unnecessary re-renders and hook calls

## Related Documentation

- [Profile Tab Overview](./profile_overview.md) - General overview of the Profile tab
- [Nostr Integration](../../technical/nostr/index.md) - Details on Nostr integration
- [NDK Hooks](../../technical/ndk/index.md) - Documentation on NDK hooks
