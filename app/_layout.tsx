// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { NavigationContainer } from '@react-navigation/native';
import { AppearanceProvider } from '@/contexts/AppearanceContext';
import { WorkoutProvider } from '@/contexts/WorkoutContext';
import { schema } from '@/utils/db/schema';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as ExpoSplashScreen from 'expo-splash-screen';
import SplashScreen from '@/components/SplashScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Prevent auto-hide of splash screen
ExpoSplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { colors } = useColorScheme();
  const [isReady, setIsReady] = React.useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    async function initializeApp() {
      try {
        await schema.createTables();
        await schema.migrate();
      } catch (error) {
        console.error('Error initializing database:', error);
      } finally {
        setIsReady(true);
      }
    }
    
    initializeApp();
  }, []);

  const onSplashAnimationComplete = async () => {
    setShowSplash(false);
    await ExpoSplashScreen.hideAsync();
  };

  if (!isReady) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen onAnimationComplete={onSplashAnimationComplete} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }} 
      />
      <Stack.Screen
        name="(workout)/new-exercise"
        options={{
          headerShown: false,
          presentation: Platform.select({
            ios: 'modal',
            android: 'card',
            default: 'transparentModal'
          }),
          animation: Platform.select({
            ios: 'slide_from_bottom',
            default: 'none'
          })
        }}
      />
      <Stack.Screen
        name="(workout)/add-exercises"
        options={{
          headerShown: false,
          presentation: Platform.select({
            ios: 'modal',
            android: 'card',
            default: 'transparentModal'
          }),
          animation: Platform.select({
            ios: 'slide_from_bottom',
            default: 'none'
          })
        }}
      />
      <Stack.Screen
        name="(workout)/create-template"
        options={{
          headerShown: false,
          presentation: Platform.select({
            ios: 'modal',
            android: 'card',
            default: 'transparentModal'
          }),
          animation: Platform.select({
            ios: 'slide_from_bottom',
            default: 'none'
          })
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppearanceProvider>
          <WorkoutProvider>
            <RootLayoutNav />
          </WorkoutProvider>
        </AppearanceProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}