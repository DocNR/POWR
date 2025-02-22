// components/SettingsDrawer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, ScrollView, Pressable, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSettingsDrawer } from '@/lib/contexts/SettingsDrawerContext';
import { 
  Moon, Sun, LogOut, User, ChevronRight, X, Bell, HelpCircle, 
  Smartphone, Database, Zap, RefreshCw, AlertTriangle
} from 'lucide-react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/lib/useColorScheme';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import { useNDKCurrentUser, useNDKAuth } from '@/lib/hooks/useNDK';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const router = useRouter();
  const { isDrawerOpen, closeDrawer } = useSettingsDrawer();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  const { logout } = useNDKAuth();
  const { toggleColorScheme, isDarkColorScheme } = useColorScheme();
  const theme = useTheme();
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  const [showSignOutAlert, setShowSignOutAlert] = useState(false);
  
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

  // Navigate to relevant screen for login
  const navigateToLogin = () => {
    // Go to the profile tab which should have login functionality
    closeDrawer();
    setTimeout(() => {
      router.push("/(tabs)/profile");
    }, 300);
  };

  // Handle profile click - different behavior on iOS vs Android
  const handleProfileClick = () => {
    if (!isAuthenticated) {
      if (Platform.OS === 'ios') {
        // On iOS, use the sheet directly
        setIsLoginSheetOpen(true);
      } else {
        // On Android, navigate to profile tab
        navigateToLogin();
      }
    } else {
      // Navigate to profile edit screen in the future
      console.log('Navigate to profile edit');
    }
  };

  // Handle sign out button click
  const handleSignOut = () => {
    setShowSignOutAlert(true);
  };
  
  // Function to handle confirmed sign out
  const confirmSignOut = async () => {
    await logout();
    closeDrawer();
  };

  // Nostr integration handler
  const handleNostrIntegration = () => {
    if (!isAuthenticated) {
      if (Platform.OS === 'ios') {
        // On iOS, use the sheet directly
        setIsLoginSheetOpen(true);
      } else {
        // On Android, navigate to profile tab
        navigateToLogin();
      }
    } else {
      // Show Nostr settings in the future
      console.log('Show Nostr settings');
    }
  };

  // Define menu items
  const menuItems: MenuItem[] = [
    {
      id: 'appearance',
      icon: isDarkColorScheme ? Moon : Sun,
      label: 'Dark Mode',
      onPress: () => {},
      rightElement: (
        <Switch
          checked={isDarkColorScheme}
          onCheckedChange={toggleColorScheme}
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
      onPress: handleNostrIntegration,
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
    <>
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

            {/* Profile section - make it touchable */}
            <TouchableOpacity 
              style={[styles.profileSection, { borderBottomColor: theme.colors.border }]}
              onPress={handleProfileClick}
              activeOpacity={0.7}
            >
              <Avatar 
                alt={currentUser?.profile?.name || "User profile"}
                className="h-16 w-16"
              >
                {isAuthenticated && currentUser?.profile?.image ? (
                  <AvatarImage source={{ uri: currentUser.profile.image }} />
                ) : null}
                <AvatarFallback>
                  {isAuthenticated && currentUser?.profile?.name ? (
                    <Text className="text-foreground">
                      {currentUser.profile.name.charAt(0).toUpperCase()}
                    </Text>
                  ) : (
                    <User size={28} />
                  )}
                </AvatarFallback>
              </Avatar>
              <View style={styles.profileInfo}>
                <Text className="text-lg font-semibold">
                  {isAuthenticated ? currentUser?.profile?.name || 'Nostr User' : 'Not Logged In'}
                </Text>
                <Text className="text-muted-foreground">
                  {isAuthenticated ? 'Edit Profile' : 'Login with Nostr'}
                </Text>
              </View>
              <ChevronRight size={20} color={theme.colors.text} />
            </TouchableOpacity>

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
                    activeOpacity={0.7}
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

            {/* Sign out button at the bottom - only show when authenticated */}
            {isAuthenticated && (
              <View style={styles.footer}>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onPress={handleSignOut}
                >
                  <Text className="text-destructive-foreground">Sign Out</Text>
                </Button>
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>

      {/* Only render the NostrLoginSheet on iOS */}
      {Platform.OS === 'ios' && (
        <NostrLoginSheet 
          open={isLoginSheetOpen} 
          onClose={() => setIsLoginSheetOpen(false)} 
        />
      )}
      
      {/* Sign Out Alert Dialog */}
      <AlertDialog open={showSignOutAlert} onOpenChange={setShowSignOutAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>For Real?</AlertDialogTitle>
            <AlertDialogDescription>
              <Text>
                Are you sure you want to sign out? Make sure you've backed up your private key. 
                Lost keys cannot be recovered and all your data will be inaccessible.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setShowSignOutAlert(false)}>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction 
              onPress={confirmSignOut}
              className="bg-destructive text-destructive-foreground"
            >
              <Text>Sign Out</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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