// app/(tabs)/_layout.tsx
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Tabs, useNavigation } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { Dumbbell, Library, Users, History, User, Home } from 'lucide-react-native';
import type { CustomTheme } from '@/lib/theme';
import ActiveWorkoutBar from '@/components/workout/ActiveWorkoutBar';
import { useWorkoutStore } from '@/stores/workoutStore';

export default function TabLayout() {
  const theme = useTheme() as CustomTheme;
  const navigation = useNavigation();
  const { isActive, isMinimized } = useWorkoutStore();
  const { minimizeWorkout } = useWorkoutStore.getState();
  
  // Auto-minimize workout when navigating between tabs
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      // If workout is active but not minimized, minimize it when changing tabs
      if (isActive && !isMinimized) {
        minimizeWorkout();
      }
    });

    return unsubscribe;
  }, [navigation, isActive, isMinimized, minimizeWorkout]);
  
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
            borderTopWidth: Platform.OS === 'ios' ? 0.5 : 1,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 12,
            marginBottom: Platform.OS === 'ios' ? 0 : 4,
          },
        }}>
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Home size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => (
              <Library size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Workout',
            tabBarIcon: ({ color, size }) => (
              <Dumbbell size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            title: 'Social',
            tabBarIcon: ({ color, size }) => (
              <Users size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
          title: 'History',
            tabBarIcon: ({ color, size }) => (
              <History size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      
      {/* Render the ActiveWorkoutBar above the tab bar */}
      <ActiveWorkoutBar />
    </View>
  );
}