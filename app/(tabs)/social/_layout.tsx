// app/(tabs)/social/_layout.tsx
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import FollowingScreen from './following';
import PowerScreen from './powr';
import GlobalScreen from './global';
import Header from '@/components/Header';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';
import { TabScreen } from '@/components/layout/TabScreen';

const Tab = createMaterialTopTabNavigator();

export default function SocialLayout() {
  const theme = useTheme() as CustomTheme;

  return (
    <TabScreen>
      <Header useLogo={true} />

      <Tab.Navigator
        initialRouteName="powr"
        screenOptions={{
          tabBarActiveTintColor: theme.colors.tabIndicator,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'none',
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
          name="following"
          component={FollowingScreen}
          options={{ title: 'Following' }}
        />
        <Tab.Screen
          name="powr"
          component={PowerScreen}
          options={{ title: 'POWR' }}
        />
        <Tab.Screen
          name="global"
          component={GlobalScreen}
          options={{ title: 'Global' }}
        />
      </Tab.Navigator>
    </TabScreen>
  );
}