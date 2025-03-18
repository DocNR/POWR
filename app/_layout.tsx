// app/_layout.tsx
import 'expo-dev-client';
import '@/global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { NAV_THEME } from '@/lib/theme/constants';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { setAndroidNavigationBar } from '@/lib/android-navigation-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DatabaseProvider } from '@/components/DatabaseProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SettingsDrawerProvider } from '@/lib/contexts/SettingsDrawerContext';
import SettingsDrawer from '@/components/SettingsDrawer';
import RelayInitializer from '@/components/RelayInitializer';
import { useNDKStore } from '@/lib/stores/ndk';
import { useWorkoutStore } from '@/stores/workoutStore';
// Import splash screens with fallback mechanism
let SplashComponent: React.ComponentType<{onFinish: () => void}>;

// First try to import the video splash screen
try {
  // Try to dynamically import the Video component 
  const Video = require('expo-av').Video;
  // If successful, import the VideoSplashScreen
  SplashComponent = require('@/components/VideoSplashScreen').default;
  console.log('Successfully imported VideoSplashScreen');
} catch (e) {
  console.warn('Failed to import VideoSplashScreen or expo-av:', e);
  // If that fails, use the simple splash screen
  try {
    SplashComponent = require('@/components/SimpleSplashScreen').default;
    console.log('Using SimpleSplashScreen as fallback');
  } catch (simpleSplashError) {
    console.warn('Failed to import SimpleSplashScreen:', simpleSplashError);
    // Last resort fallback is an inline component
    SplashComponent = ({onFinish}) => {
      React.useEffect(() => {
        // Call onFinish after a short delay
        const timer = setTimeout(() => {
          onFinish();
        }, 500);
        return () => clearTimeout(timer);
      }, [onFinish]);
      
      return (
        <View className="flex-1 items-center justify-center bg-black">
          <Text className="text-white text-xl">Loading POWR...</Text>
        </View>
      );
    };
  }
}

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
  const [isSplashFinished, setIsSplashFinished] = React.useState(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const { init } = useNDKStore();
  const initializationPromise = React.useRef<Promise<void> | null>(null);

  // Start app initialization immediately
  React.useEffect(() => {
    if (!initializationPromise.current) {
      initializationPromise.current = (async () => {
        try {
          console.log('Starting app initialization in background...');
          if (Platform.OS === 'web') {
            document.documentElement.classList.add('bg-background');
          }
          setAndroidNavigationBar(colorScheme);
          
          // Initialize NDK
          await init();
          
          // Load favorites from SQLite
          await useWorkoutStore.getState().loadFavorites();
          
          console.log('App initialization completed!');
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize:', error);
        }
      })();
    }
    
    return () => {
      // This is just for cleanup, the promise will continue executing
      initializationPromise.current = null;
    };
  }, []);

  // Function to handle splash finish - will check if initialization is also complete
  const handleSplashFinish = React.useCallback(() => {
    console.log('Splash video finished playing');
    setIsSplashFinished(true);
    
    // If initialization isn't done yet, we'll show a loading indicator
    if (!isInitialized) {
      console.log('Waiting for initialization to complete...');
    }
  }, [isInitialized]);

  // Show splash screen if not finished
  if (!isSplashFinished) {
    try {
      return <SplashComponent onFinish={handleSplashFinish} />;
    } catch (e) {
      console.error('Error rendering splash screen:', e);
      // Skip splash screen if there's an error
      if (!isInitialized) {
        return (
          <View className="flex-1 items-center justify-center bg-background">
            <Text className="text-foreground">Loading...</Text>
          </View>
        );
      }
      // Force continue to main app
      setIsSplashFinished(true);
      return null;
    }
  }
  
  // If splash is done but initialization isn't, show loading
  if (!isInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-foreground">Finalizing setup...</Text>
      </View>
    );
  }

  // Main app UI wrapped in error boundary
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DatabaseProvider>
          <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
            {/* Ensure SettingsDrawerProvider wraps everything */}
            <SettingsDrawerProvider>
              {/* Add RelayInitializer here - it loads relay data once NDK is available */}
              <RelayInitializer />
              
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