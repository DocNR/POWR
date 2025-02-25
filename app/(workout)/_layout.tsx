// app/(workout)/_layout.tsx
import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '@react-navigation/native';

export default function WorkoutLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { 
          backgroundColor: theme.colors.background 
        },
        presentation: 'modal', // Make all screens in this group modal by default
        animation: 'slide_from_bottom',
        gestureEnabled: true, // Allow gesture to dismiss
        gestureDirection: 'vertical', // Swipe down to dismiss
      }}
    >
      <Stack.Screen 
        name="create"
        options={{
          // Modal presentation for create screen
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen 
        name="template-select"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="add-exercises"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
        }}
      />
    </Stack>
  )
}