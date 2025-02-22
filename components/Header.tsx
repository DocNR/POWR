// components/Header.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/UserAvatar';
import { useSettingsDrawer } from '@/lib/contexts/SettingsDrawerContext';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';

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
  const { openDrawer } = useSettingsDrawer();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  
  // Extract profile image URL
  const profileImageUrl = currentUser?.profile?.image;
  
  // Get first letter of name for fallback
  const fallbackLetter = isAuthenticated && currentUser?.profile?.name 
    ? currentUser.profile.name.charAt(0).toUpperCase() 
    : 'G';

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
          size="sm" 
          uri={profileImageUrl}
          onPress={openDrawer}
          fallback={fallbackLetter}
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