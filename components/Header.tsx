// components/Header.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/UserAvatar';
import PowerLogo from '@/components/PowerLogo';
import { useSettingsDrawer } from '@/lib/contexts/SettingsDrawerContext';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { useIconColor } from '@/lib/theme/iconUtils';

interface HeaderProps {
  title?: string;
  hideTitle?: boolean;
  rightElement?: React.ReactNode;
  useLogo?: boolean;
  showNotifications?: boolean; // New prop
}

function NotificationBell() {
  const { getIconProps } = useIconColor();
  
  return (
    <Button 
      variant="ghost" 
      size="icon"
      onPress={() => console.log('Open notifications')}
    >
      <View className="relative">
        <Bell 
          size={24} 
          {...getIconProps('primary')}
        />
        <View className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
      </View>
    </Button>
  );
}

export default function Header({ 
  title, 
  hideTitle = false, 
  rightElement,
  useLogo = false,
  showNotifications = true  // Default to true
}: HeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { openDrawer } = useSettingsDrawer();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  
  // Extract profile image URL
  const profileImageUrl = currentUser?.profile?.image;
  
  // Get first letter of name for fallback
  const fallbackLetter = isAuthenticated && currentUser?.profile?.name 
    ? currentUser.profile.name.charAt(0).toUpperCase() 
    : 'G';

  if (hideTitle) return null;

  // Determine right element: custom, notification bell, or nothing
  const headerRightElement = rightElement 
    ? rightElement 
    : showNotifications 
      ? <NotificationBell /> 
      : null;

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
          size="sm" 
          uri={profileImageUrl}
          pubkey={currentUser?.pubkey}
          onPress={openDrawer}
        />

        {/* Middle - Title or Logo */}
        <View style={[styles.titleContainer, { marginLeft: 10 }]}>
          {useLogo ? (
            <PowerLogo size="md" />
          ) : (
            <Text style={styles.title}>{title}</Text>
          )}
        </View>

        {/* Right side - Custom element, notifications, or nothing */}
        <View style={styles.rightContainer}>
          {headerRightElement}
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
    justifyContent: 'center',
    paddingHorizontal: 0, // Remove padding to allow more precise positioning
    height: '100%',
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
