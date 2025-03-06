// app/_layout.tsx
import 'expo-dev-client';
import '../lib/crypto-polyfill'; // Import crypto polyfill first
import '@/global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { NAV_THEME } from '@/lib/constants';
import { useColorScheme } from '@/lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { setAndroidNavigationBar } from '@/lib/android-navigation-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider } from '@/components/DatabaseProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsDrawerProvider } from '@/lib/contexts/SettingsDrawerContext';
import SettingsDrawer from '@/components/SettingsDrawer';
import { useNDKStore } from '@/lib/stores/ndk';
import { useWorkoutStore } from '@/stores/workoutStore';

console.log('_layout.tsx loaded');

const LIGHT_THEME = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};

const DARK_THEME = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const { init } = useNDKStore();

  React.useEffect(() => {
    async function initApp() {
      try {
        if (Platform.OS === 'web') {
          document.documentElement.classList.add('bg-background');
        }
        setAndroidNavigationBar(colorScheme);
        
        // Initialize NDK
        await init();
        
        // Load favorites from SQLite
        await useWorkoutStore.getState().loadFavorites();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    }

    initApp();
  }, []);

  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-foreground">Initializing...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DatabaseProvider>
          <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            <SettingsDrawerProvider>
              <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen 
                  name="(tabs)" 
                  options={{
                    headerShown: false,
                  }}
                />
              </Stack>
              
              {/* Settings drawer needs to be outside the navigation stack */}
              <SettingsDrawer />
              
              <PortalHost />
            </SettingsDrawerProvider>
          </ThemeProvider>
        </DatabaseProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}