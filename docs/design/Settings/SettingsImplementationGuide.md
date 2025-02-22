# Settings Drawer Implementation Guide

This guide explains how to integrate the settings drawer into your POWR app, using the user's Nostr avatar in the header to open it. The implementation follows your existing shadcn/ui component patterns and matches the styling of your current components.

## Files Overview

1. **SettingsDrawer.tsx** - The main drawer component
2. **SettingsDrawerContext.tsx** - Context provider for managing drawer state
3. **UserAvatar.tsx** - Component for displaying user avatar and opening the drawer
4. **NostrContext.tsx** - Context provider for Nostr authentication and profile data using secure storage
5. **Header.tsx** - Updated header component that includes the UserAvatar

## Installation Steps

### 1. Install Required Dependencies

First, install `expo-secure-store` for securely storing private keys:

```bash
npx expo install expo-secure-store
```

### 2. Add the Context Providers

Create the necessary context providers:

#### 2.1 Settings Drawer Context

Create `lib/contexts/SettingsDrawerContext.tsx`:

```tsx
// lib/contexts/SettingsDrawerContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsDrawerContextType {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const SettingsDrawerContext = createContext<SettingsDrawerContextType | undefined>(undefined);

export function SettingsDrawerProvider({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

  return (
    <SettingsDrawerContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </SettingsDrawerContext.Provider>
  );
}

export function useSettingsDrawer(): SettingsDrawerContextType {
  const context = useContext(SettingsDrawerContext);
  if (context === undefined) {
    throw new Error('useSettingsDrawer must be used within a SettingsDrawerProvider');
  }
  return context;
}
```

#### 2.2 Nostr Context with Secure Storage

Create `lib/contexts/NostrContext.tsx` for handling Nostr authentication and user profile with secure storage:

```tsx
// lib/contexts/NostrContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

// Define Nostr user profile types
interface NostrProfile {
  pubkey: string;
  name?: string;
  displayName?: string;
  about?: string;
  website?: string;
  picture?: string;
  nip05?: string;
  lud16?: string; // Lightning address
}

interface NostrContextType {
  isAuthenticated: boolean;
  userProfile: NostrProfile | null;
  isLoading: boolean;
  login: (privateKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<NostrProfile>) => void;
  getPrivateKey: () => Promise<string | null>;
}

const NostrContext = createContext<NostrContextType | undefined>(undefined);

// Constants for SecureStore
const PRIVATE_KEY_STORAGE_KEY = 'nostr_privkey';
const PROFILE_STORAGE_KEY = 'nostr_profile';

export function NostrProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<NostrProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check for existing saved credentials on startup
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        // Load the private key from secure storage
        const savedPrivkey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
        
        // Try to load cached profile data
        const savedProfileJson = await SecureStore.getItemAsync(PROFILE_STORAGE_KEY);
        const savedProfile = savedProfileJson ? JSON.parse(savedProfileJson) : null;
        
        if (savedProfile) {
          setUserProfile(savedProfile);
        }
        
        if (savedPrivkey) {
          // If we have the key, we're authenticated
          setIsAuthenticated(true);
          
          // If we don't have a profile yet, try to fetch it
          if (!savedProfile) {
            // In a real implementation, you would fetch the profile here
            // For now, just create a mock profile
            const mockProfile = createMockProfile(savedPrivkey);
            setUserProfile(mockProfile);
            await saveProfile(mockProfile);
          }
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedCredentials();
  }, []);

  // Create a mock profile (replace with real implementation)
  const createMockProfile = (privateKey: string): NostrProfile => {
    // In a real implementation, derive the public key from the private key
    const mockPubkey = 'npub1' + privateKey.substring(0, 6); // Just for demo
    
    return {
      pubkey: mockPubkey,
      name: 'POWR User',
      displayName: 'POWR User',
      picture: 'https://robohash.org/' + mockPubkey,
    };
  };

  // Save profile to storage
  const saveProfile = async (profile: NostrProfile) => {
    await SecureStore.setItemAsync(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  };

  // Login with private key
  const login = async (privateKey: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Save the private key securely
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKey);
      
      // Create a profile (mock for now, in reality fetch from relay)
      const profile = createMockProfile(privateKey);
      
      // Save the profile data
      await saveProfile(profile);
      
      // Update state
      setUserProfile(profile);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout - securely remove the private key
  const logout = async () => {
    try {
      // Remove the private key from secure storage
      await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
      
      // Also remove the profile data
      await SecureStore.deleteItemAsync(PROFILE_STORAGE_KEY);
      
      // Update state
      setUserProfile(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get the private key when needed for operations (like signing)
  const getPrivateKey = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Error retrieving private key:', error);
      return null;
    }
  };

  // Update user profile
  const updateProfile = (profile: Partial<NostrProfile>) => {
    if (userProfile) {
      const updatedProfile = { ...userProfile, ...profile };
      setUserProfile(updatedProfile);
      
      // Save the updated profile
      saveProfile(updatedProfile);
    }
  };

  return (
    <NostrContext.Provider value={{
      isAuthenticated,
      userProfile,
      isLoading,
      login,
      logout,
      updateProfile,
      getPrivateKey
    }}>
      {children}
    </NostrContext.Provider>
  );
}

export function useNostr(): NostrContextType {
  const context = useContext(NostrContext);
  if (context === undefined) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
}
```

### 3. Add the Components

#### 3.1 User Avatar Component

Create `components/UserAvatar.tsx`:

```tsx
// components/UserAvatar.tsx
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { User } from 'lucide-react-native';
import { useSettingsDrawer } from '@/lib/contexts/SettingsDrawerContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  size?: number;
  avatarUrl?: string;
  username?: string;
  isNostrUser?: boolean;
}

export default function UserAvatar({ 
  size = 40, 
  avatarUrl, 
  username, 
  isNostrUser = false 
}: UserAvatarProps) {
  const { openDrawer } = useSettingsDrawer();
  const theme = useTheme();
  
  const getInitials = () => {
    if (!username) return '';
    return username.charAt(0).toUpperCase();
  };
  
  return (
    <TouchableOpacity 
      onPress={openDrawer}
      activeOpacity={0.7}
    >
      <Avatar className={`h-${Math.floor(size/4)} w-${Math.floor(size/4)}`}>
        {avatarUrl && isNostrUser ? (
          <AvatarImage src={avatarUrl} />
        ) : null}
        <AvatarFallback>
          {username ? (
            getInitials()
          ) : (
            <User 
              size={size * 0.6} 
              color={theme.colors.text}
            />
          )}
        </AvatarFallback>
      </Avatar>
    </TouchableOpacity>
  );
}
```

#### 3.2 Settings Drawer Component

Create `components/SettingsDrawer.tsx`:

```tsx
// components/SettingsDrawer.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useSettingsDrawer } from '@/lib/contexts/SettingsDrawerContext';
import { useNostr } from '@/lib/contexts/NostrContext';
import { 
  Moon, Sun, LogOut, User, ChevronRight, X, Bell, HelpCircle, Smartphone, Database, Zap, RefreshCw
} from 'lucide-react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

type MenuItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
};

export default function SettingsDrawer() {
  const { isDrawerOpen, closeDrawer } = useSettingsDrawer();
  const { userProfile, isAuthenticated, logout } = useNostr();
  const theme = useTheme();
  const isDarkMode = theme.dark;
  
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Handle drawer animation when open state changes
  useEffect(() => {
    if (isDrawerOpen) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [isDrawerOpen]);

  // Toggle dark mode handler
  const handleToggleDarkMode = () => {
    // Implement your theme toggle logic here
    console.log('Toggle dark mode');
  };

  // Handle sign out
  const handleSignOut = async () => {
    await logout();
    closeDrawer();
  };

  // Define menu items
  const menuItems: MenuItem[] = [
    {
      id: 'appearance',
      icon: isDarkMode ? Moon : Sun,
      label: 'Dark Mode',
      onPress: () => {},
      rightElement: (
        <Switch
          checked={isDarkMode}
          onCheckedChange={handleToggleDarkMode}
        />
      ),
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      onPress: () => closeDrawer(),
    },
    {
      id: 'data-sync',
      icon: RefreshCw,
      label: 'Data Sync',
      onPress: () => closeDrawer(),
    },
    {
      id: 'backup-restore',
      icon: Database,
      label: 'Backup & Restore',
      onPress: () => closeDrawer(),
    },
    {
      id: 'device',
      icon: Smartphone,
      label: 'Device Settings',
      onPress: () => closeDrawer(),
    },
    {
      id: 'nostr',
      icon: Zap,
      label: 'Nostr Integration',
      onPress: () => closeDrawer(),
    },
    {
      id: 'about',
      icon: HelpCircle,
      label: 'About',
      onPress: () => closeDrawer(),
    },
  ];

  if (!isDrawerOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { 
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            opacity: fadeAnim 
          }
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeDrawer}
        />
      </Animated.View>

      {/* Drawer */}
      <Animated.View 
        style={[
          styles.drawer,
          { 
            transform: [{ translateX: slideAnim }],
            backgroundColor: theme.colors.card,
            borderRightColor: theme.colors.border,
          }
        ]}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header with close button */}
          <View style={styles.header}>
            <Text className="text-xl font-semibold">Settings</Text>
            <Button 
              variant="ghost" 
              size="icon"
              onPress={closeDrawer}
              className="absolute right-4"
            >
              <X size={24} className="text-foreground" />
            </Button>
          </View>

          {/* Profile section */}
          <View style={[styles.profileSection, { borderBottomColor: theme.colors.border }]}>
            <Avatar className="h-16 w-16">
              {isAuthenticated && userProfile?.picture ? (
                <AvatarImage src={userProfile.picture} />
              ) : null}
              <AvatarFallback>
                {isAuthenticated && userProfile?.name ? (
                  userProfile.name.charAt(0).toUpperCase()
                ) : (
                  <User size={28} />
                )}
              </AvatarFallback>
            </Avatar>
            <View style={styles.profileInfo}>
              <Text className="text-lg font-semibold">
                {isAuthenticated ? userProfile?.name || 'Nostr User' : 'Not Logged In'}
              </Text>
              <Text className="text-muted-foreground">
                {isAuthenticated ? 'Edit Profile' : 'Login with Nostr'}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.text} />
          </View>

          {/* Menu items */}
          <ScrollView 
            style={styles.menuList}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {menuItems.map((item, index) => (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <item.icon size={22} color={theme.colors.text} />
                    <Text className="text-base ml-3">{item.label}</Text>
                  </View>
                  
                  {item.rightElement ? (
                    item.rightElement
                  ) : (
                    <ChevronRight size={20} color={theme.colors.text} />
                  )}
                </TouchableOpacity>
                
                {index < menuItems.length - 1 && (
                  <Separator className="mb-1 mt-1" />
                )}
              </View>
            ))}
          </ScrollView>

          {/* Sign out button at the bottom */}
          <View style={styles.footer}>
            <Button 
              variant="destructive" 
              className="w-full"
              onPress={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <Text>Sign Out</Text>
            </Button>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 60,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  menuList: {
    flex: 1,
  },
  menuContent: {
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
  },
});
```

#### 3.3 Update Header Component

Update your `components/Header.tsx` to include the UserAvatar:

```tsx
// components/Header.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/UserAvatar';
import { useNostr } from '@/lib/contexts/NostrContext';

interface HeaderProps {
  title?: string;
  hideTitle?: boolean;
  rightElement?: React.ReactNode;
}

export default function Header({ 
  title, 
  hideTitle = false, 
  rightElement 
}: HeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { userProfile, isAuthenticated } = useNostr();

  if (hideTitle) return null;

  return (
    <View
      style={[
        styles.header,
        { 
          paddingTop: insets.top,
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border 
        }
      ]}
    >
      <View style={styles.headerContent}>
        {/* Left side - User avatar that opens settings drawer */}
        <UserAvatar 
          size={40}
          avatarUrl={userProfile?.picture}
          username={userProfile?.name}
          isNostrUser={isAuthenticated}
        />

        {/* Middle - Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Right side - Custom element or default notifications */}
        <View style={styles.rightContainer}>
          {rightElement || (
            <Button 
              variant="ghost" 
              size="icon"
              onPress={() => {}}
            >
              <Bell size={24} className="text-foreground" />
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    borderBottomWidth: Platform.OS === 'ios' ? 0.5 : 1,
  },
  headerContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
```

### 4. Create a Nostr Login Screen/Sheet

Create a screen or sheet for logging in with a Nostr private key:

```tsx
// components/sheets/NostrLoginSheet.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { X } from 'lucide-react-native';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNostr } from '@/lib/contexts/NostrContext';

interface NostrLoginSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NostrLoginSheet({ isOpen, onClose }: NostrLoginSheetProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useNostr();

  const handleLogin = async () => {
    if (!privateKey.trim()) {
      Alert.alert('Error', 'Please enter your private key');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await login(privateKey);
      
      if (success) {
        setPrivateKey('');
        onClose();
      } else {
        Alert.alert('Login Error', 'Failed to login with the provided private key');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <SheetHeader>
            <SheetTitle>Login with Nostr</SheetTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0" 
              onPress={onClose}
            >
              <X size={24} />
            </Button>
          </SheetHeader>
          
          <View style={styles.content}>
            <Text className="mb-2">Enter your Nostr private key (nsec)</Text>
            <Input
              placeholder="nsec1..."
              value={privateKey}
              onChangeText={setPrivateKey}
              secureTextEntry
              autoCapitalize="none"
              className="mb-4"
            />
            
            <Button 
              onPress={handleLogin} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            
            <Text className="text-center text-xs text-muted-foreground mt-4">
              Your private key is securely stored on your device and is never sent to any servers.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
});
```

### 5. Wrap Your App with the Providers

Update your app's root component:

```tsx
// app/_layout.tsx
import { SettingsDrawerProvider } from '@/lib/contexts/SettingsDrawerContext';
import { NostrProvider } from '@/lib/contexts/NostrContext';
import SettingsDrawer from '@/components/SettingsDrawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
        <NostrProvider>
          <SettingsDrawerProvider>
            <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
            <Stack screenOptions={{ 
              headerShown: false,
            }}>
              <Stack.Screen 
                name="(tabs)" 
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
            
            {/* Settings drawer needs to be outside the navigation stack */}
            <SettingsDrawer />
            
            <PortalHost />
          </SettingsDrawerProvider>
        </NostrProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

## Secure Storage Considerations

### Benefits of Using Expo SecureStore

1. **Encryption**: `expo-secure-store` encrypts the data before storing it on the device.
   - On iOS, it uses Keychain Services with proper security attributes
   - On Android, it uses encrypted SharedPreferences backed by Android's Keystore system

2. **Isolation**: Each Expo project has a separate storage system and has no access to the storage of other Expo projects.

3. **Security Best Practices**: The implementation follows platform-specific security best practices.

4. **Biometric Authentication**: Supports requiring biometric authentication for accessing sensitive data (optional).

### Usage Guidelines

1. **Key Naming**: Use consistent, descriptive key names like `PRIVATE_KEY_STORAGE_KEY` to avoid collisions.

2. **Error Handling**: Always handle errors from SecureStore operations as they can fail due to various system conditions.

3. **Size Limits**: Be aware that SecureStore has a value size limit of 2048 bytes. This is sufficient for private keys but may not be for larger data.

4. **Cleanup**: Always remove sensitive data when it's no longer needed, especially when users log out.

5. **Application Uninstallation**: Note that data in SecureStore is deleted when the application is uninstalled.

### Real-World Implementation Notes

When implementing this with a real Nostr library:

1. **Signing Operations**: Use `getPrivateKey()` to retrieve the key only when needed for signing operations, then don't keep it in memory longer than necessary.

2. **Content Updates**: When updating profile information or publishing content:
   - Get the private key with `getPrivateKey()`
   - Create and sign the event
   - Publish it to relays
   - Never store the private key in state or other non-secure storage

3. **Access Permissions**: Consider using the `requireAuthentication` option with SecureStore for additional security when the device supports biometric authentication.

## Customizing for Your App

### Theme Integration

The drawer uses the theme from `@react-navigation/native`. Make sure your theme defines the following colors:

- `card`: Background color for the drawer
- `border`: Color for separator lines
- `text`: Text color
- `primary`: Color for primary actions

### Menu Items

Customize the menu items in the settings drawer based on your app's needs. Each item should have:

```tsx
{
  id: 'unique-id',
  icon: IconComponent,
  label: 'Menu Item Name',
  onPress: () => { /* handler */ },
  rightElement?: optional JSX element
}
```

### Testing Checklist

After implementation, verify these behaviors:

1. ✅ Settings drawer opens when tapping the user avatar in the header
2. ✅ Drawer closes when tapping outside or the X button
3. ✅ Private key is securely stored using expo-secure-store
4. ✅ Avatar displays user's profile picture or initials when logged in
5. ✅ Menu items navigate to correct screens
6. ✅ Sign out removes private key from secure storage
7. ✅ Test on both iOS and Android

## Integration with NDK

If you're planning to use NDK (Nostr Development Kit) for Nostr integration, here's how to connect it with the secure storage system:

```tsx
// lib/nostr/ndk-service.ts
import NDK, { NDKPrivateKeySigner, NDKEvent, NDKUser } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/lib/contexts/NostrContext';

// Default relays to connect to
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://purplepag.es'
];

export class NDKService {
  private static instance: NDKService;
  private ndk: NDK | null = null;
  private relays: string[] = DEFAULT_RELAYS;

  private constructor() {}

  public static getInstance(): NDKService {
    if (!NDKService.instance) {
      NDKService.instance = new NDKService();
    }
    return NDKService.instance;
  }

  /**
   * Initialize NDK with user's private key
   */
  public async initialize(privateKey: string | null, customRelays?: string[]): Promise<boolean> {
    try {
      if (privateKey) {
        // Create a signer with the private key
        const signer = new NDKPrivateKeySigner(privateKey);
        
        // Use custom relays if provided
        if (customRelays && customRelays.length > 0) {
          this.relays = customRelays;
        }
        
        // Initialize NDK with signer and relays
        this.ndk = new NDK({
          explicitRelayUrls: this.relays,
          signer
        });
        
        // Connect to relays
        await this.ndk.connect();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing NDK:', error);
      return false;
    }
  }

  /**
   * Get the current user's profile
   */
  public async fetchUserProfile(pubkey: string): Promise<any> {
    if (!this.ndk) throw new Error('NDK not initialized');
    
    try {
      const user = new NDKUser({ pubkey });
      await user.fetchProfile(this.ndk);
      
      return user.profile || null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Publish a kind 0 (profile metadata) event
   */
  public async updateProfile(profileData: Record<string, string>): Promise<boolean> {
    if (!this.ndk) throw new Error('NDK not initialized');
    
    try {
      // Create a new kind 0 event
      const event = new NDKEvent(this.ndk);
      event.kind = 0;
      event.content = JSON.stringify(profileData);
      
      // Sign and publish the event
      await event.publish();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  /**
   * Publish a Nostr event
   */
  public async publishEvent(kind: number, content: string, tags: string[][] = []): Promise<string | null> {
    if (!this.ndk) throw new Error('NDK not initialized');
    
    try {
      // Create a new event
      const event = new NDKEvent(this.ndk);
      event.kind = kind;
      event.content = content;
      event.tags = tags;
      
      // Sign and publish the event
      await event.publish();
      return event.id;
    } catch (error) {
      console.error('Error publishing event:', error);
      return null;
    }
  }
}

/**
 * Hook to use NDK with secure storage
 */
export function useNDKWithSecureStorage() {
  const { getPrivateKey, isAuthenticated, userProfile, updateProfile } = useNostr();
  const ndkService = NDKService.getInstance();
  
  /**
   * Initialize NDK with the user's private key from secure storage
   */
  const initializeNDK = async (customRelays?: string[]): Promise<boolean> => {
    if (!isAuthenticated) return false;
    
    try {
      // Get the private key from secure storage
      const privateKey = await getPrivateKey();
      
      if (!privateKey) {
        console.error('Private key not found in secure storage');
        return false;
      }
      
      // Initialize NDK with the private key
      return await ndkService.initialize(privateKey, customRelays);
    } catch (error) {
      console.error('Error initializing NDK:', error);
      return false;
    }
  };

  /**
   * Update the user's profile data
   */
  const updateNostrProfile = async (profileData: Record<string, string>): Promise<boolean> => {
    try {
      // Update profile in NDK
      const success = await ndkService.updateProfile(profileData);
      
      if (success && userProfile) {
        // Also update the local profile
        updateProfile({
          name: profileData.name,
          displayName: profileData.display_name,
          about: profileData.about,
          picture: profileData.picture,
          website: profileData.website,
          nip05: profileData.nip05,
          lud16: profileData.lud16
        });
      }
      
      return success;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  /**
   * Publish a workout or exercise template to Nostr
   */
  const publishWorkoutEvent = async (kind: number, content: string, tags: string[][] = []): Promise<string | null> => {
    try {
      await initializeNDK();
      return await ndkService.publishEvent(kind, content, tags);
    } catch (error) {
      console.error('Error publishing workout event:', error);
      return null;
    }
  };

  return {
    initializeNDK,
    updateNostrProfile,
    publishWorkoutEvent
  };
}
```

## Using the Settings Drawer with Nostr Integration

Once you have set up the NDK integration, you can use it in your app with the settings drawer to create a seamless user experience. Here's how to connect everything:

### 1. Initialize NDK on App Load

First, initialize NDK when the app loads if the user is already authenticated:

```tsx
// app/_layout.tsx
import { useEffect } from 'react';
import { useNDKWithSecureStorage } from '@/lib/nostr/ndk-service';
import { useNostr } from '@/lib/contexts/NostrContext';

export default function RootLayout() {
  const { isAuthenticated } = useNostr();
  const { initializeNDK } = useNDKWithSecureStorage();
  
  useEffect(() => {
    if (isAuthenticated) {
      // Initialize NDK when app loads if user is authenticated
      initializeNDK().then((success) => {
        console.log('NDK initialized:', success);
      });
    }
  }, [isAuthenticated]);
  
  return (
    // ...existing layout code
  );
}
```

### 2. Handle Nostr Login

When a user logs in with their private key, initialize NDK:

```tsx
// components/sheets/NostrLoginSheet.tsx
import { useNDKWithSecureStorage } from '@/lib/nostr/ndk-service';

export default function NostrLoginSheet({ isOpen, onClose }: NostrLoginSheetProps) {
  const { login } = useNostr();
  const { initializeNDK } = useNDKWithSecureStorage();
  
  const handleLogin = async () => {
    // ...existing login code
    
    try {
      const success = await login(privateKey);
      
      if (success) {
        // Initialize NDK after successful login
        await initializeNDK();
        
        setPrivateKey('');
        onClose();
      } else {
        Alert.alert('Login Error', 'Failed to login with the provided private key');
      }
    } catch (error) {
      // ...error handling
    }
  };
  
  // ...rest of the component
}
```

### 3. Publish Workout Events

You can now use the NDK service to publish workout events:

```tsx
// components/workout/SaveWorkout.tsx
import { useNDKWithSecureStorage } from '@/lib/nostr/ndk-service';

export default function SaveWorkout({ workout }) {
  const { publishWorkoutEvent } = useNDKWithSecureStorage();
  
  const handleSaveToNostr = async () => {
    try {
      // Prepare workout data
      const content = JSON.stringify(workout);
      
      // Add appropriate tags
      const tags = [
        ['t', 'workout'],
        ['d', workout.id],
        ['title', workout.title],
        // Add more tags as needed
      ];
      
      // Publish to Nostr (kind 33402 for workout templates, 33403 for workout records)
      const eventId = await publishWorkoutEvent(33402, content, tags);
      
      if (eventId) {
        Alert.alert('Success', 'Workout published to Nostr!');
      } else {
        Alert.alert('Error', 'Failed to publish workout');
      }
    } catch (error) {
      console.error('Error publishing workout:', error);
      Alert.alert('Error', 'Failed to publish workout');
    }
  };
  
  // ...rest of the component
}
```

### 4. Update Profile Information

Allow users to update their Nostr profile:

```tsx
// components/profile/EditProfile.tsx
import { useNDKWithSecureStorage } from '@/lib/nostr/ndk-service';

export default function EditProfile() {
  const { userProfile } = useNostr();
  const { updateNostrProfile } = useNDKWithSecureStorage();
  
  const [name, setName] = useState(userProfile?.name || '');
  const [about, setAbout] = useState(userProfile?.about || '');
  // ...other profile fields
  
  const handleSaveProfile = async () => {
    try {
      const profileData = {
        name,
        display_name: name, // Often these are the same
        about,
        // ...other profile fields
      };
      
      const success = await updateNostrProfile(profileData);
      
      if (success) {
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };
  
  // ...rest of the component
}
```

## Advanced Features and Customizations

### 1. Biometric Authentication for Private Key Access

For extra security, you can enable biometric authentication when accessing the private key:

```tsx
// lib/contexts/NostrContext.tsx
import * as LocalAuthentication from 'expo-local-authentication';

// Update the getPrivateKey method
const getPrivateKey = async (): Promise<string | null> => {
  try {
    // Check if device supports biometric authentication
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (compatible) {
      // Authenticate user
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your private key',
      });
      
      if (!result.success) {
        throw new Error('Authentication failed');
      }
    }
    
    // Get the private key after successful authentication
    return await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
  } catch (error) {
    console.error('Error retrieving private key:', error);
    return null;
  }
};
```

### 2. Custom Themes in the Settings Drawer

Add a theme selector in the settings drawer:

```tsx
// components/SettingsDrawer.tsx
const ThemeOption = ({ theme, isActive, onSelect }) => (
  <TouchableOpacity
    style={[
      styles.themeOption,
      { backgroundColor: isActive ? theme.colors.primary + '40' : 'transparent' }
    ]}
    onPress={() => onSelect(theme.name)}
  >
    <View 
      style={[
        styles.themePreview, 
        { 
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border
        }
      ]}
    >
      <View style={[styles.themePreviewBar, { backgroundColor: theme.colors.primary }]} />
    </View>
    <Text className={isActive ? 'font-semibold' : ''}>{theme.name}</Text>
  </TouchableOpacity>
);

// Add a theme selector to your menu
const ThemeSelector = () => (
  <View style={styles.themeSelector}>
    <Text className="mb-2">Theme</Text>
    <View style={styles.themeOptions}>
      <ThemeOption theme={themes.light} isActive={!isDarkMode} onSelect={() => handleToggleDarkMode(false)} />
      <ThemeOption theme={themes.dark} isActive={isDarkMode} onSelect={() => handleToggleDarkMode(true)} />
    </View>
  </View>
);
```

### 3. Relay Management

Add relay management functionality to the settings drawer:

```tsx
// components/settings/RelaysManager.tsx
import { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useNDKWithSecureStorage } from '@/lib/nostr/ndk-service';

export default function RelaysManager() {
  const [relays, setRelays] = useState([]);
  const [newRelay, setNewRelay] = useState('');
  const { initializeNDK } = useNDKWithSecureStorage();
  
  // Load saved relays on mount
  useEffect(() => {
    loadRelays();
  }, []);
  
  const loadRelays = async () => {
    // Load relays from storage
    // This is a placeholder - implement your own relay storage
  };
  
  const addRelay = async () => {
    if (!newRelay.trim() || !newRelay.startsWith('wss://')) {
      Alert.alert('Invalid Relay', 'Please enter a valid relay URL (wss://)');
      return;
    }
    
    setRelays([...relays, newRelay]);
    setNewRelay('');
    
    // Re-initialize NDK with the new relay list
    await initializeNDK([...relays, newRelay]);
  };
  
  const removeRelay = async (relay) => {
    const updatedRelays = relays.filter(r => r !== relay);
    setRelays(updatedRelays);
    
    // Re-initialize NDK with the updated relay list
    await initializeNDK(updatedRelays);
  };
  
  return (
    <View style={styles.container}>
      <Text className="text-xl font-semibold mb-4">Relay Management</Text>
      
      <View style={styles.inputContainer}>
        <Input
          placeholder="wss://relay.example.com"
          value={newRelay}
          onChangeText={setNewRelay}
          autoCapitalize="none"
          className="flex-1"
        />
        <Button onPress={addRelay} className="ml-2">
          <Plus size={20} />
        </Button>
      </View>
      
      <FlatList
        data={relays}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.relayItem}>
            <Text className="flex-1">{item}</Text>
            <TouchableOpacity onPress={() => removeRelay(item)}>
              <X size={20} color="red" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  relayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
});
```

## Conclusion

This implementation guide provides a complete solution for integrating a settings drawer into your POWR app, using the user's Nostr avatar in the header to open it. The implementation uses expo-secure-store for securely handling private keys and provides a clean, user-friendly interface that matches your existing styling.

By following this guide, you can implement:

1. A secure Nostr authentication system with private key management
2. A profile-driven avatar component that opens the settings drawer
3. A fully animated settings drawer with customizable menu items
4. Integration with NDK for publishing workout data to the Nostr network

This approach prioritizes security, user experience, and code maintainability, making it a solid foundation for your fitness app's Nostr integration.# Settings Drawer Implementation Guide

This guide explains how to integrate the settings drawer into your POWR app, using the user's Nostr avatar in the header to open it. The implementation follows your existing shadcn/ui component patterns and matches the styling of your current components.

## Files Overview

1. **SettingsDrawer.tsx** - The main drawer component
2. **SettingsDrawerContext.tsx** - Context provider for managing drawer state
3. **UserAvatar.tsx** - Component for displaying user avatar and opening the drawer
4. **NostrContext.tsx** - Context provider for Nostr authentication and profile data using secure storage
5. **Header.tsx** - Updated header component that includes the UserAvatar

## Are we storing some of the cached user data in our sqlite db (eg, user metadata, PFP, etc)

You're right to be thinking about local caching for user data. In the current implementation, we're only storing the user profile data using `expo-secure-store` alongside the private key. This approach has some limitations:

1. `expo-secure-store` has a 2048 byte size limit per entry, which is fine for keys but could be restrictive for larger profile data.
2. We're not taking advantage of your existing SQLite database infrastructure.
3. This approach doesn't handle caching data from other Nostr users you might interact with.

Let's enhance our implementation to store user metadata and profile pictures in your SQLite database. Here's how we can approach this:

### 1. Create a User Database Service

```typescript
// lib/db/services/UserProfileService.ts
import { DbService } from '@/lib/db/db-service';

export interface UserProfile {
  pubkey: string;
  name?: string;
  displayName?: string;
  about?: string;
  website?: string;
  picture?: string;
  nip05?: string;
  lud16?: string;
  lastUpdated: number;
}

export class UserProfileService {
  constructor(private db: DbService) {}

  async initialize(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        pubkey TEXT PRIMARY KEY,
        name TEXT,
        display_name TEXT,
        about TEXT,
        website TEXT,
        picture TEXT,
        nip05 TEXT,
        lud16 TEXT,
        last_updated INTEGER
      )
    `);
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    await this.db.execute(`
      INSERT OR REPLACE INTO user_profiles (
        pubkey, name, display_name, about, website, picture, nip05, lud16, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      profile.pubkey,
      profile.name || null,
      profile.displayName || null,
      profile.about || null,
      profile.website || null,
      profile.picture || null,
      profile.nip05 || null,
      profile.lud16 || null,
      profile.lastUpdated || Date.now()
    ]);
  }

  async getProfile(pubkey: string): Promise<UserProfile | null> {
    const result = await this.db.query(`
      SELECT * FROM user_profiles WHERE pubkey = ?
    `, [pubkey]);

    if (result.rows.length === 0) {
      return null;
    }

    const item = result.rows.item(0);
    return {
      pubkey: item.pubkey,
      name: item.name,
      displayName: item.display_name,
      about: item.about,
      website: item.website,
      picture: item.picture,
      nip05: item.nip05,
      lud16: item.lud16,
      lastUpdated: item.last_updated
    };
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    const result = await this.db.query(`
      SELECT * FROM user_profiles
      ORDER BY last_updated DESC
    `);

    const profiles: UserProfile[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const item = result.rows.item(i);
      profiles.push({
        pubkey: item.pubkey,
        name: item.name,
        displayName: item.display_name,
        about: item.about,
        website: item.website,
        picture: item.picture,
        nip05: item.nip05,
        lud16: item.lud16,
        lastUpdated: item.last_updated
      });
    }
    return profiles;
  }

  async deleteProfile(pubkey: string): Promise<void> {
    await this.db.execute(`
      DELETE FROM user_profiles WHERE pubkey = ?
    `, [pubkey]);
  }

  // For caching profile pictures specifically
  async cachePictureForPubkey(pubkey: string, pictureUrl: string): Promise<void> {
    await this.db.execute(`
      UPDATE user_profiles 
      SET picture = ?, last_updated = ?
      WHERE pubkey = ?
    `, [pictureUrl, Date.now(), pubkey]);
  }
}
```

### 2. Modify the NostrContext to Use SQLite for Profile Data

```typescript
// lib/contexts/NostrContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DbService } from '@/lib/db/db-service';
import { UserProfileService, UserProfile } from '@/lib/db/services/UserProfileService';

// SecureStore is still used for the private key
const PRIVATE_KEY_STORAGE_KEY = 'nostr_privkey';
const CURRENT_USER_PUBKEY_KEY = 'current_user_pubkey';

interface NostrContextType {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  isLoading: boolean;
  login: (privateKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  getPrivateKey: () => Promise<string | null>;
  getUserProfile: (pubkey: string) => Promise<UserProfile | null>;
  cacheUserProfile: (profile: UserProfile) => Promise<void>;
}

const NostrContext = createContext<NostrContextType | undefined>(undefined);

export function NostrProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userProfileService, setUserProfileService] = useState<UserProfileService | null>(null);

  // Initialize database services
  useEffect(() => {
    const initDb = async () => {
      const dbService = new DbService();
      const profileService = new UserProfileService(dbService);
      
      await profileService.initialize();
      setUserProfileService(profileService);
      
      // Load saved credentials
      await loadSavedCredentials(profileService);
    };
    
    initDb();
  }, []);

  // Load saved credentials
  const loadSavedCredentials = async (profileService: UserProfileService) => {
    try {
      // Load the private key from secure storage
      const savedPrivkey = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      const currentPubkey = await SecureStore.getItemAsync(CURRENT_USER_PUBKEY_KEY);
      
      if (savedPrivkey && currentPubkey) {
        // If we have the key and pubkey, we're authenticated
        setIsAuthenticated(true);
        
        // Try to load cached profile from database
        const profile = await profileService.getProfile(currentPubkey);
        
        if (profile) {
          setUserProfile(profile);
        } else {
          // If no profile in database, create a basic one
          const basicProfile: UserProfile = {
            pubkey: currentPubkey,
            lastUpdated: Date.now()
          };
          await profileService.saveProfile(basicProfile);
          setUserProfile(basicProfile);
        }
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login with private key
  const login = async (privateKey: string): Promise<boolean> => {
    if (!userProfileService) return false;
    
    setIsLoading(true);
    
    try {
      // This would be your actual Nostr login logic
      // For example:
      // 1. Derive public key from private key
      // Here we're just using a mock implementation
      const mockPubkey = 'npub1' + privateKey.substring(0, 6); // Just for demo
      
      // Save the private key securely
      await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKey);
      await SecureStore.setItemAsync(CURRENT_USER_PUBKEY_KEY, mockPubkey);
      
      // Create a profile
      const profile: UserProfile = {
        pubkey: mockPubkey,
        name: 'POWR User',
        displayName: 'POWR User',
        picture: 'https://robohash.org/' + mockPubkey,
        lastUpdated: Date.now()
      };
      
      // Save to database
      await userProfileService.saveProfile(profile);
      
      // Update state
      setUserProfile(profile);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout - securely remove the private key
  const logout = async () => {
    try {
      // Remove from secure storage
      await SecureStore.deleteItemAsync(PRIVATE_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(CURRENT_USER_PUBKEY_KEY);
      
      // Update state
      setUserProfile(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get the private key when needed for operations (like signing)
  const getPrivateKey = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
    } catch (error) {
      console.error('Error retrieving private key:', error);
      return null;
    }
  };

  // Update user profile
  const updateProfile = async (profile: Partial<UserProfile>) => {
    if (!userProfileService || !userProfile) return;
    
    const updatedProfile = {
      ...userProfile,
      ...profile,
      lastUpdated: Date.now()
    };
    
    // Save to database
    await userProfileService.saveProfile(updatedProfile);
    
    // Update state
    setUserProfile(updatedProfile);
  };

  // Get a user profile from the database
  const getUserProfile = async (pubkey: string): Promise<UserProfile | null> => {
    if (!userProfileService) return null;
    return await userProfileService.getProfile(pubkey);
  };

  // Cache a user profile in the database
  const cacheUserProfile = async (profile: UserProfile) => {
    if (!userProfileService) return;
    await userProfileService.saveProfile(profile);
  };

  return (
    <NostrContext.Provider value={{
      isAuthenticated,
      userProfile,
      isLoading,
      login,
      logout,
      updateProfile,
      getPrivateKey,
      getUserProfile,
      cacheUserProfile
    }}>
      {children}
    </NostrContext.Provider>
  );
}

export function useNostr(): NostrContextType {
  const context = useContext(NostrContext);
  if (context === undefined) {
    throw new Error('useNostr must be used within a NostrProvider');
  }
  return context;
}
```

### 3. Create a ProfileCache Service for NDK Integration

```typescript
// lib/nostr/profile-cache.ts
import { NDKUser } from '@nostr-dev-kit/ndk';
import { useNostr } from '@/lib/contexts/NostrContext';
import { UserProfile } from '@/lib/db/services/UserProfileService';

export function useProfileCache() {
  const { cacheUserProfile, getUserProfile } = useNostr();

  // Convert NDK user to UserProfile format
  const ndkUserToProfile = (ndkUser: NDKUser): UserProfile => {
    return {
      pubkey: ndkUser.pubkey,
      name: ndkUser.profile?.name,
      displayName: ndkUser.profile?.displayName,
      about: ndkUser.profile?.about,
      website: ndkUser.profile?.website,
      picture: ndkUser.profile?.image || ndkUser.profile?.picture,
      nip05: ndkUser.profile?.nip05,
      lud16: ndkUser.profile?.lud16,
      lastUpdated: Date.now()
    };
  };

  // Get profile from cache or fetch from NDK
  const getProfile = async (pubkey: string, ndk: any): Promise<UserProfile | null> => {
    // First try to get from cache
    const cachedProfile = await getUserProfile(pubkey);
    
    // If cached and recent (less than 1 hour old), use it
    if (cachedProfile && (Date.now() - cachedProfile.lastUpdated < 3600000)) {
      return cachedProfile;
    }
    
    try {
      // Fetch from NDK
      const ndkUser = new NDKUser({ pubkey });
      await ndkUser.fetchProfile(ndk);
      
      if (ndkUser.profile) {
        // Convert and cache
        const profile = ndkUserToProfile(ndkUser);
        await cacheUserProfile(profile);
        return profile;
      }
      
      // If we have cached data but it's old, still return it
      if (cachedProfile) {
        return cachedProfile;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching profile from NDK:', error);
      
      // Return cached data even if old on error
      if (cachedProfile) {
        return cachedProfile;
      }
      
      return null;
    }
  };

  // Cache multiple profiles at once (useful for timelines)
  const cacheProfiles = async (ndkUsers: NDKUser[]): Promise<void> => {
    const profiles = ndkUsers
      .filter(user => user.profile)
      .map(ndkUserToProfile);
      
    for (const profile of profiles) {
      await cacheUserProfile(profile);
    }
  };

  return {
    getProfile,
    cacheProfiles
  };
}
```

### 4. Update Your UserAvatar Component to Use Cached Data

```typescript
// components/UserAvatar.tsx
import React, { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { User } from 'lucide-react-native';
import { useSettingsDrawer } from '@/lib/contexts/SettingsDrawerContext';
import { useNostr } from '@/lib/contexts/NostrContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/lib/db/services/UserProfileService';

interface UserAvatarProps {
  size?: number;
  pubkey?: string; // Can specify pubkey for other users
}

export default function UserAvatar({ 
  size = 40, 
  pubkey
}: UserAvatarProps) {
  const { openDrawer } = useSettingsDrawer();
  const { userProfile, isAuthenticated, getUserProfile } = useNostr();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const theme = useTheme();
  
  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (pubkey) {
        // If a pubkey is provided, load that user's profile
        const profileData = await getUserProfile(pubkey);
        setProfile(profileData);
      } else {
        // Otherwise, use the current user's profile
        setProfile(userProfile);
      }
    };
    
    loadProfile();
  }, [pubkey, userProfile]);
  
  const getInitials = () => {
    if (!profile?.name) return '';
    return profile.name.charAt(0).toUpperCase();
  };
  
  const handlePress = () => {
    // Only open drawer for current user's avatar
    if (!pubkey) {
      openDrawer();
    }
  };
  
  return (
    <TouchableOpacity 
      onPress={handlePress}
      activeOpacity={pubkey ? 1 : 0.7} // Disable touch effect for other users
      disabled={!!pubkey} // Disable touch for other users
    >
      <Avatar className={`h-${Math.floor(size/4)} w-${Math.floor(size/4)}`}>
        {profile?.picture ? (
          <AvatarImage src={profile.picture} />
        ) : null}
        <AvatarFallback>
          {profile?.name ? (
            getInitials()
          ) : (
            <User 
              size={size * 0.6} 
              color={theme.colors.text}
            />
          )}
        </AvatarFallback>
      </Avatar>
    </TouchableOpacity>
  );
}
```

### 5. Add Image Caching for Profile Pictures

For better performance with profile pictures, you could also implement a dedicated image caching system. A popular library for this is `expo-file-system` combined with `react-native-fast-image`.

```typescript
// lib/utils/image-cache.ts
import * as FileSystem from 'expo-file-system';
import { DbService } from '@/lib/db/db-service';

export class ImageCache {
  private db: DbService;
  private cacheDir: string;
  
  constructor(db: DbService) {
    this.db = db;
    this.cacheDir = `${FileSystem.cacheDirectory}images/`;
    this.initialize();
  }
  
  private async initialize() {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
    }
    
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS image_cache (
        url TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_used INTEGER NOT NULL
      )
    `);
  }
  
  async getCachedImagePath(url: string): Promise<string | null> {
    // Check if URL is in database
    const result = await this.db.query(`
      SELECT path FROM image_cache WHERE url = ?
    `, [url]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const path = result.rows.item(0).path;
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(path);
    if (!fileInfo.exists) {
      // Remove from database if file doesn't exist
      await this.db.execute(`
        DELETE FROM image_cache WHERE url = ?
      `, [url]);
      return null;
    }
    
    // Update last used
    await this.db.execute(`
      UPDATE image_cache SET last_used = ? WHERE url = ?
    `, [Date.now(), url]);
    
    return path;
  }
  
  async cacheImage(url: string): Promise<string> {
    // Check if already cached
    const cachedPath = await this.getCachedImagePath(url);
    if (cachedPath) {
      return cachedPath;
    }
    
    // Generate unique filename
    const filename = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const path = `${this.cacheDir}${filename}`;
    
    // Download image
    await FileSystem.downloadAsync(url, path);
    
    // Save to database
    await this.db.execute(`
      INSERT INTO image_cache (url, path, created_at, last_used)
      VALUES (?, ?, ?, ?)
    `, [url, path, Date.now(), Date.now()]);
    
    return path;
  }
  
  async clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    const cutoff = Date.now() - maxAge;
    
    // Get old files
    const result = await this.db.query(`
      SELECT url, path FROM image_cache WHERE last_used < ?
    `, [cutoff]);
    
    // Delete files and database entries
    for (let i = 0; i < result.rows.length; i++) {
      const item = result.rows.item(i);
      try {
        await FileSystem.deleteAsync(item.path, { idempotent: true });
      } catch (error) {
        console.error(`Error deleting cached image: ${error}`);
      }
    }
    
    // Remove from database
    await this.db.execute(`
      DELETE FROM image_cache WHERE last_used < ?
    `, [cutoff]);
  }
}
```

### Benefits of This Approach:

1. **Efficiency**: Store user profiles in SQLite for better performance and querying capabilities.
2. **Data Persistence**: Profile data persists across app restarts.
3. **Caching**: Cache profiles of other users you interact with, not just your own.
4. **Image Caching**: Optimize network usage by caching profile pictures.
5. **Data Freshness**: Automatically update stale data when needed.

This approach gives you a more robust system for handling Nostr user data, profile pictures, and other metadata, leveraging your existing SQLite infrastructure while keeping the private key securely stored in `expo-secure-store`.