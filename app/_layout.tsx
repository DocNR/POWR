// app/_layout.tsx
import '@/global.css';
import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { Platform } from 'react-native';
import { NAV_THEME } from '@/lib/constants';
import { useColorScheme } from '@/lib/useColorScheme';
import { PortalHost } from '@rn-primitives/portal';
import { setAndroidNavigationBar } from '@/lib/android-navigation-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export default function RootLayout() {
  const hasMounted = React.useRef(false);
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = React.useState(false);

  React.useEffect(() => {
    if (hasMounted.current) {
      return;
    }

    if (Platform.OS === 'web') {
      document.documentElement.classList.add('bg-background');
    }
    setAndroidNavigationBar(colorScheme);
    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
        <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
        <Stack screenOptions={{ 
          headerShown: false,
        }}>
          <Stack.Screen 
            name="(tabs)" 
            options={{
              headerShown: false,
            }}
          />
        </Stack>
        <PortalHost />
      </ThemeProvider>
      </GestureHandlerRootView>
  );
}