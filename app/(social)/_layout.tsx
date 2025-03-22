// app/(social)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function SocialLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="workout/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'card'
        }}
      />
    </Stack>
  );
}