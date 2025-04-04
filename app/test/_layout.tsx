import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * Layout for test screens
 * 
 * This allows us to have multiple test screens in the test directory
 * for trying out different features in isolation.
 * 
 * Each test page should include its own providers as needed, rather than
 * relying on providers in this layout, to avoid conflicts with the app's
 * global settings.
 */
export default function TestLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: true }}>
            <Stack.Screen
              name="react-query-auth-test"
              options={{ title: 'React Query Auth Test' }}
            />
            <Stack.Screen
              name="auth-test"
              options={{ title: 'Auth Test' }}
            />
            <Stack.Screen
              name="simple-auth"
              options={{ title: 'Simple Auth Test' }}
            />
            <Stack.Screen
              name="robohash"
              options={{ title: 'Robohash Test' }}
            />
            <Stack.Screen
              name="cache-test"
              options={{ title: 'Image Cache Test' }}
            />
      </Stack>
    </>
  );
}
