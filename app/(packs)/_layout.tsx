// app/(packs)/_layout.tsx
import { Stack } from 'expo-router';
import { useColorScheme } from '@/lib/theme/useColorScheme';

export default function PacksLayout() {
  const { isDarkColorScheme } = useColorScheme();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkColorScheme ? '#18181b' : '#ffffff',
        },
        headerTintColor: isDarkColorScheme ? '#ffffff' : '#18181b',
        headerShadowVisible: false,
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="import"
        options={{
          presentation: 'modal',
          title: 'Import POWR Pack',
        }}
      />
      <Stack.Screen
        name="manage"
        options={{
          title: 'Manage POWR Packs',
        }}
      />
    </Stack>
  );
}