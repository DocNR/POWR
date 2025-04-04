// app/_layout.tsx
import 'expo-dev-client';
import '@/global.css';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { View, Text, Platform, ActivityIndicator } from 'react-native';
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
import OfflineIndicator from '@/components/OfflineIndicator';
import { useNDKStore, FLAGS } from '@/lib/stores/ndk';
import { useWorkoutStore } from '@/stores/workoutStore';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { ReactQueryAuthProvider } from '@/lib/auth/ReactQueryAuthProvider';

// Import splash screens with improved fallback mechanism
let SplashComponent: React.ComponentType<{onFinish: () => void}>;
let useVideoSplash = false;

// Determine if we should use video splash based on platform
if (Platform.OS === 'ios') {
  // On iOS, try to use the video splash screen
  try {
    // Check if expo-av is available
    require('expo-av');
    useVideoSplash = true;
    console.log('expo-av is available, will use VideoSplashScreen on iOS');
  } catch (e) {
    console.warn('expo-av not available on iOS:', e);
    useVideoSplash = false;
  }
} else {
  // On Android, directly use SimpleSplashScreen to avoid issues
  console.log('Android platform detected, using SimpleSplashScreen');
  useVideoSplash = false;
}

// Import the appropriate splash screen component
if (useVideoSplash) {
  try {
    SplashComponent = require('@/components/VideoSplashScreen').default;
    console.log('Successfully imported VideoSplashScreen');
  } catch (e) {
    console.warn('Failed to import VideoSplashScreen:', e);
    useVideoSplash = false;
  }
}

// If video splash is not available or failed to import, use simple splash
if (!useVideoSplash) {
  try {
    SplashComponent = require('@/components/SimpleSplashScreen').default;
    console.log('Using SimpleSplashScreen');
  } catch (simpleSplashError) {
    console.warn('Failed to import SimpleSplashScreen:', simpleSplashError);
    // Last resort fallback is an inline component
    SplashComponent = ({onFinish}) => {
      React.useEffect(() => {
        // Call onFinish after a short delay
        const timer = setTimeout(() => {
          onFinish();
        }, 1000);
        return () => clearTimeout(timer);
      }, [onFinish]);
      
      return (
        <View style={{
          flex: 1,
          backgroundColor: '#000000',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{
            color: '#ffffff',
            fontSize: 32,
            fontWeight: 'bold',
          }}>POWR</Text>
          <ActivityIndicator 
            size="large" 
            color="#ffffff" 
            style={{ marginTop: 30 }}
          />
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
          
          // Initialize connectivity service first
          const connectivityService = ConnectivityService.getInstance();
          const isOnline = await connectivityService.checkNetworkStatus();
          console.log(`Network connectivity: ${isOnline ? 'online' : 'offline'}`);
          
          // Start database initialization and NDK initialization in parallel
          const initPromises = [];
          
          // Initialize NDK with timeout
          const ndkPromise = init().catch(error => {
            console.error('NDK initialization error:', error);
            // Continue even if NDK fails
            return { offlineMode: true };
          });
          initPromises.push(ndkPromise);
          
          // Load favorites from SQLite (local operation)
          const favoritesPromise = useWorkoutStore.getState().loadFavorites()
            .catch(error => {
              console.error('Error loading favorites:', error);
              // Continue even if loading favorites fails
            });
          initPromises.push(favoritesPromise);
          
          // Wait for all initialization tasks with a timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), 10000)
          );
          
          try {
            // Use Promise.allSettled to continue even if some promises fail
            await Promise.race([
              Promise.allSettled(initPromises),
              timeoutPromise
            ]);
          } catch (error) {
            console.warn('Some initialization tasks timed out, continuing anyway:', error);
          }
          
          console.log('App initialization completed!');
          setIsInitialized(true);
        } catch (error) {
          console.error('Failed to initialize:', error);
          // Still mark as initialized to prevent hanging
          setIsInitialized(true);
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
            {/* Wrap everything in ReactQueryAuthProvider to enable React Query functionality app-wide */}
            <ReactQueryAuthProvider>
              {/* Ensure SettingsDrawerProvider wraps everything */}
              <SettingsDrawerProvider>
                {/* Add AuthProvider when using new auth system */}
                {(() => {
                  const ndk = useNDKStore.getState().ndk;
                  if (ndk && FLAGS.useNewAuthSystem) {
                    return (
                      <AuthProvider ndk={ndk}>
                        {/* Add RelayInitializer here - it loads relay data once NDK is available */}
                        <RelayInitializer />
                        
                        {/* Add OfflineIndicator to show network status */}
                        <OfflineIndicator />
                      </AuthProvider>
                    );
                  } else {
                    return (
                      <>
                        {/* Legacy approach without AuthProvider */}
                        <RelayInitializer />
                        <OfflineIndicator />
                      </>
                    );
                  }
                })()}
                
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
            </ReactQueryAuthProvider>
          </ThemeProvider>
        </DatabaseProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
