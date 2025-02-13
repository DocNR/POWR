// app/(tabs)/library/index.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ThemeToggle';
import ExercisesScreen from './exercises'; 

const Tab = createMaterialTopTabNavigator();

function TemplatesTab() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Templates Content</Text>
    </View>
  );
}

function ProgramsTab() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Programs (Coming Soon)</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header with Theme Toggle */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text className="text-2xl font-bold">Library</Text>
        <ThemeToggle />
      </View>

      {/* Material Top Tabs */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: 'grey',
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'capitalize',
            fontWeight: 'bold',
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.text,
          },
          tabBarStyle: { backgroundColor: colors.card },
          swipeEnabled: true,         // Enable swipe navigation
          animationEnabled: true,     // Enable animations when swiping
          lazy: true                 }}
      >
        <Tab.Screen 
          name="exercises" 
          component={ExercisesScreen}
          options={{ 
            title: 'Exercises',
          }}
        />
        <Tab.Screen 
          name="templates" 
          component={TemplatesTab}
          options={{ 
            title: 'Templates',
          }}
        />
        <Tab.Screen 
          name="programs" 
          component={ProgramsTab}
          options={{ 
            title: 'Programs',
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
  },
});