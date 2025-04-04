// components/SettingsDrawer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, ScrollView, Pressable, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSettingsDrawer } from '@/lib/contexts/SettingsDrawerContext';
import { 
  Moon, Sun, LogOut, User, ChevronRight, X, Bell, HelpCircle, 
  Smartphone, Database, Zap, RefreshCw, AlertTriangle, Globe, PackageOpen, Trash2
} from 'lucide-react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserAvatar from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import RelayManagement from '@/components/RelayManagement';
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
import { FIXED_COLORS } from '@/lib/theme/colors';
import { useSQLiteContext } from 'expo-sqlite';
import { useLibraryStore } from '@/lib/stores/libraryStore';
import { useWorkoutStore } from '@/stores/workoutStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

type MenuItem = {
  id: string;
  icon: React.ElementType;
  label: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  variant?: 'default' | 'destructive';
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
  const [showRelayManager, setShowRelayManager] = useState(false);
  const [showResetDataAlert, setShowResetDataAlert] = useState(false);
  
  // Database access for reset functionality
  const db = useSQLiteContext();
  
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
      router.push("/");
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

  // Open relay management
  const handleRelayManagement = () => {
    setShowRelayManager(true);
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
  
  // Handle reset app data button click
  const handleResetData = () => {
    setShowResetDataAlert(true);
  };
  
  // Reset app data function
  const resetAllData = async () => {
    try {
      // Clear database tables
      await db.execAsync(`
        DELETE FROM workouts;
        DELETE FROM workout_exercises;
        DELETE FROM workout_sets;
        DELETE FROM templates;
        DELETE FROM template_exercises;
        DELETE FROM exercises;
        DELETE FROM exercise_tags;
        DELETE FROM powr_packs;
        DELETE FROM powr_pack_items;
        DELETE FROM favorites;  /* Add this line */
      `);
      
      // Clear store state
      useLibraryStore.getState().clearCache();
      useLibraryStore.getState().refreshAll();
      
      // Also reset the workout store to clear favorite IDs in memory
      useWorkoutStore.getState().reset();
      
      // Close dialogs
      setShowResetDataAlert(false);
      closeDrawer();
      
      // Show success message
      alert("All app data has been reset successfully.");
    } catch (error) {
      console.error("Error resetting data:", error);
      alert("There was a problem resetting your data. Please try again.");
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
      id: 'react-query-demo',
      icon: RefreshCw,
      label: 'React Query Demo',
      onPress: () => {
        closeDrawer();
        router.push({
          pathname: "/test" as any
        });
      },
    },
    {
      id: 'relays',
      icon: Globe,
      label: 'Manage Relays',
      onPress: handleRelayManagement,
    },
    {
      id: 'powr-packs',
      icon: PackageOpen,
      label: 'POWR Packs',
      onPress: () => {
        closeDrawer();
        router.push("/(packs)/manage");
      },
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
    // Add separator before danger zone
    {
      id: 'separator',
      icon: () => null,
      label: '',
      onPress: () => {},
    },
    // Reset App Data option - danger zone
    {
      id: 'reset-data',
      icon: Trash2,
      label: 'Reset App Data',
      onPress: handleResetData,
      variant: 'destructive'
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
              <UserAvatar
                size="lg" 
                uri={currentUser?.profile?.image}
                pubkey={currentUser?.pubkey}
                name={currentUser?.profile?.name || 'Nostr User'}
                className="h-16 w-16"
              />
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
                  {item.id === 'separator' ? (
                    <View className="my-3">
                      <Text className="text-xs text-muted-foreground mb-1">DANGER ZONE</Text>
                      <Separator className="mb-1" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <item.icon 
                          size={22} 
                          color={item.variant === 'destructive' ? FIXED_COLORS.destructive : theme.colors.text} 
                        />
                        <Text className={`text-base ml-3 ${item.variant === 'destructive' ? 'text-destructive' : ''}`}>
                          {item.label}
                        </Text>
                      </View>
                      
                      {item.rightElement ? (
                        item.rightElement
                      ) : (
                        <ChevronRight size={20} color={theme.colors.text} />
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {index < menuItems.length - 1 && item.id !== 'separator' && (
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
      
      {/* Relay Management Sheet */}
      <RelayManagement 
        isVisible={showRelayManager} 
        onClose={() => setShowRelayManager(false)} 
      />
      
      {/* Sign Out Alert Dialog */}
      <AlertDialog open={showSignOutAlert} onOpenChange={setShowSignOutAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Text className="text-xl font-semibold text-foreground">For Real?</Text>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text className="text-muted-foreground">
                Are you sure you want to sign out? Make sure you've backed up your private key. 
                Lost keys cannot be recovered and all your data will be inaccessible.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-end gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="mr-2">
                <Text>Cancel</Text>
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onPress={confirmSignOut}
                style={{ backgroundColor: FIXED_COLORS.destructive }}
              >
                <Text style={{ color: '#FFFFFF' }}>Sign Out</Text>
              </Button>
            </AlertDialogAction>
          </View>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reset App Data Alert Dialog */}
      <AlertDialog open={showResetDataAlert} onOpenChange={setShowResetDataAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Text className="text-xl font-semibold text-foreground">Reset App Data</Text>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text className="text-muted-foreground">
                This will delete ALL workouts, templates and exercises. This action cannot be undone.
              </Text>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <View className="flex-row justify-end gap-3">
            <AlertDialogCancel asChild>
              <Button variant="outline" className="mr-2">
                <Text>Cancel</Text>
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button 
                variant="destructive" 
                onPress={resetAllData}
                style={{ backgroundColor: FIXED_COLORS.destructive }}
              >
                <Text style={{ color: '#FFFFFF' }}>Reset Everything</Text>
              </Button>
            </AlertDialogAction>
          </View>
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
