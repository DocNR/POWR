// app/(tabs)/profile/_layout.tsx
import React, { useState } from 'react';
import { View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@react-navigation/native';
import { TabScreen } from '@/components/layout/TabScreen';
import Header from '@/components/Header';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';
import OverviewScreen from './overview';
import ActivityScreen from './activity';
import ProgressScreen from './progress';
import SettingsScreen from './settings';
import type { CustomTheme } from '@/lib/theme';

const Tab = createMaterialTopTabNavigator();

export default function ProfileTabLayout() {
  const theme = useTheme() as CustomTheme;
  const { isAuthenticated } = useNDKCurrentUser();
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  
  return (
    <TabScreen>
      <Header 
        useLogo={true}
        showNotifications={true}
      />
      
      <Tab.Navigator
        initialRouteName="overview"
        screenOptions={{
          tabBarActiveTintColor: theme.colors.tabIndicator,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'capitalize',
            fontWeight: 'bold',
          },
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.tabIndicator,
            height: 2,
          },
          tabBarStyle: { 
            backgroundColor: theme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tabBarPressColor: theme.colors.primary,
        }}
      >
        <Tab.Screen
          name="overview"
          component={OverviewScreen}
          options={{ title: 'Profile' }}
        />
        
        <Tab.Screen
          name="activity"
          component={ActivityScreen}
          options={{ title: 'Activity' }}
        />
        
        <Tab.Screen
          name="progress"
          component={ProgressScreen}
          options={{ title: 'Progress' }}
        />
        
        <Tab.Screen
          name="settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
      
      {/* NostrLoginSheet */}
      <NostrLoginSheet 
        open={isLoginSheetOpen} 
        onClose={() => setIsLoginSheetOpen(false)} 
      />
    </TabScreen>
  );
}
