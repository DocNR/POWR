# Settings Tab

**Last Updated:** 2025-04-02  
**Status:** Implemented  
**Related To:** [Profile Tab Overview](../profile_overview.md)

## Introduction

The Settings tab provides users with configuration options for their account and application preferences. It allows customization of the app appearance, functionality settings, and offers account management options including logout functionality.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| Account Settings | ✅ Implemented | Display of Nostr publishing status and local storage options |
| App Settings | ✅ Implemented | Theme toggle, notifications, and units selection |
| Dark Mode Toggle | ✅ Implemented | Switch between light and dark theme |
| Terms of Service | ✅ Implemented | Access to legal documents |
| Logout Functionality | ✅ Implemented | Option to log out of Nostr account |
| Authentication Detection | ✅ Implemented | Login prompt for unauthenticated users |
| Version Information | ✅ Implemented | Display of current app version |

## Implementation Details

The Settings tab is implemented in `app/(tabs)/profile/settings.tsx`. It integrates with the NDK authentication system for account management and the app's theme system for appearance customization.

### Account Settings Implementation

The tab displays account-related settings:

```jsx
{/* Account Settings */}
<Card className="mx-4 mt-4 mb-4">
  <CardContent className="p-4">
    <Text className="text-lg font-semibold mb-4">Account Settings</Text>
    
    <View className="flex-row justify-between items-center py-2 border-b border-border">
      <Text>Nostr Publishing</Text>
      <Text className="text-muted-foreground">Public</Text>
    </View>
    
    <View className="flex-row justify-between items-center py-2 border-b border-border">
      <Text>Local Storage</Text>
      <Text className="text-muted-foreground">Enabled</Text>
    </View>
    
    <View className="flex-row justify-between items-center py-2">
      <Text>Connected Relays</Text>
      <Text className="text-muted-foreground">5</Text>
    </View>
  </CardContent>
</Card>
```

### App Settings Implementation

The tab provides application-specific settings like theme and notifications:

```jsx
{/* App Settings */}
<Card className="mx-4 mb-4">
  <CardContent className="p-4">
    <Text className="text-lg font-semibold mb-4">App Settings</Text>
    
    <View className="flex-row justify-between items-center py-2 border-b border-border">
      <Text>Dark Mode</Text>
      <Switch
        value={colorScheme === 'dark'}
        onValueChange={toggleColorScheme}
        trackColor={{ false: '#767577', true: theme.colors.primary }}
      />
    </View>
    
    <View className="flex-row justify-between items-center py-2 border-b border-border">
      <Text>Notifications</Text>
      <Switch
        value={true}
        trackColor={{ false: '#767577', true: theme.colors.primary }}
      />
    </View>
    
    <View className="flex-row justify-between items-center py-2">
      <Text>Units</Text>
      <Text className="text-muted-foreground">Metric (kg)</Text>
    </View>
  </CardContent>
</Card>
```

### Theme Integration

The Settings tab integrates with the app's theme system to toggle between light and dark modes:

```jsx
const { colorScheme, toggleColorScheme } = useColorScheme();

// Used in the Dark Mode toggle
<Switch
  value={colorScheme === 'dark'}
  onValueChange={toggleColorScheme}
  trackColor={{ false: '#767577', true: theme.colors.primary }}
/>
```

### Terms of Service Modal

The tab provides access to the Terms of Service:

```jsx
<TouchableOpacity 
  className="flex-row justify-between items-center py-2"
  onPress={() => setIsTermsModalVisible(true)}
>
  <Text>Terms of Service</Text>
  <View className="flex-row items-center">
    <Text className="text-primary mr-1">View</Text>
    <ChevronRight size={16} color={theme.colors.primary} />
  </View>
</TouchableOpacity>

{/* Terms of Service Modal */}
<TermsOfServiceModal 
  visible={isTermsModalVisible}
  onClose={() => setIsTermsModalVisible(false)}
/>
```

### Logout Implementation

The tab includes a logout button that uses the NDK authentication system:

```jsx
{/* Logout Button */}
<View className="mx-4 mt-4">
  <Button 
    variant="destructive"
    onPress={logout}
    className="w-full"
  >
    <Text className="text-white">Logout</Text>
  </Button>
</View>
```

## Technical Considerations

### Authentication Handling

Like other profile tabs, the Settings tab handles authentication with a consistent pattern:

```jsx
// Show different UI when not authenticated
if (!isAuthenticated) {
  return <NostrProfileLogin message="Login with your Nostr private key to access settings." />;
}
```

### Theme Integration

The tab uses the app's theme system for consistent styling and for the dark mode toggle:

```jsx
const theme = useTheme() as CustomTheme;
const { colorScheme, toggleColorScheme } = useColorScheme();
```

### NDK Authentication

The tab integrates with NDK for authentication management:

```jsx
const { currentUser, isAuthenticated } = useNDKCurrentUser();
const { logout } = useNDKAuth();
```

## User Experience Flow

1. **Authentication Check**:
   - If user is not authenticated, display NostrProfileLogin component
   - If authenticated, proceed to display settings

2. **Settings Categories**:
   - Account Settings: View and manage Nostr-related settings
   - App Settings: Control appearance and behavior of the app
   - About: Access app information and legal documents

3. **Theme Toggle**:
   - Switch between light and dark mode with immediate visual feedback
   - Theme preference is persisted between app sessions

4. **Terms of Service**:
   - View legal documents in a modal overlay
   - Close modal to return to settings

5. **Logout**:
   - Log out of Nostr account
   - Return to unauthenticated state across the app

## Future Enhancements

1. **Profile Editing**: Add dedicated profile editing screen
2. **Advanced Relay Management**: Enhanced UI for relay configuration
3. **Additional Units Options**: More measurement units (imperial/metric)
4. **Privacy Controls**: Granular privacy settings for social sharing
5. **Notification Management**: Per-feature notification settings
6. **Data Management**: Import/export and backup options

## Related Documentation

- [Profile Overview](../profile_overview.md) - General overview of the Profile tab
- [Authentication Patterns](../authentication_patterns.md) - Technical details about authentication implementation
- [Theme System](../../../technical/styling/theme_system.md) - Documentation for the app's theming system
- [Terms of Service](../../../legal/terms_of_service.md) - Legal documentation
