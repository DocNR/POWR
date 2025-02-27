// app/(workout)/_layout.tsx
import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function WorkoutLayout() {
  const theme = useTheme();

  return (
    <>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { 
            backgroundColor: theme.colors.background 
          },
          // Use standard card presentation for all screens
          presentation: 'card',
          // Standard animation
          animation: 'default',
          // Enable standard left-edge back gesture
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen 
          name="create"
          options={{
            presentation: 'card',
            animation: 'default',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen 
          name="add-exercises"
          options={{
            presentation: 'card',
            animation: 'default',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen 
          name="template-select"
          options={{
            presentation: 'card',
            animation: 'default',
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        />
      </Stack>
    </>
  );
}