// app/(tabs)/profile/settings.tsx
import React, { useState } from 'react';
import { View, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNDKCurrentUser, useNDKAuth } from '@/lib/hooks/useNDK';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import TermsOfServiceModal from '@/components/TermsOfServiceModal';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import { ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme() as CustomTheme;
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  const { logout } = useNDKAuth();
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);
  
  // Show different UI when not authenticated
  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-center text-muted-foreground mb-8">
          Login with your Nostr private key to access settings.
        </Text>
        <Button 
          variant="purple"
          onPress={() => setIsLoginSheetOpen(true)}
          className="px-6"
        >
          <Text className="text-white">Login with Nostr</Text>
        </Button>
        
        {/* NostrLoginSheet */}
        <NostrLoginSheet 
          open={isLoginSheetOpen} 
          onClose={() => setIsLoginSheetOpen(false)} 
        />
      </View>
    );
  }
  
  return (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{
        paddingBottom: insets.bottom + 20
      }}
    >
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
      
      {/* About */}
      <Card className="mx-4 mb-4">
        <CardContent className="p-4">
          <Text className="text-lg font-semibold mb-4">About</Text>
          
          <View className="flex-row justify-between items-center py-2 border-b border-border">
            <Text>Version</Text>
            <Text className="text-muted-foreground">1.0.0</Text>
          </View>
          
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
        </CardContent>
      </Card>
      {/* Terms of Service Modal */}
      <TermsOfServiceModal 
        visible={isTermsModalVisible}
        onClose={() => setIsTermsModalVisible(false)}
      />
      
      
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
    </ScrollView>
  );
}
