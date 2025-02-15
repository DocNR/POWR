// lib/theme.ts
import type { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ColorSchemeName } from 'react-native';

// Define our colors type based on the built-in theme types
export interface NavigationThemeColors {
  primary: string;
  background: string;
  card: string;
  text: string;
  border: string;
  notification: string;
  tabActive: string;
  tabInactive: string;
  tabIndicator: string;
}

// Define our custom theme type using the existing theme types
export interface CustomTheme {
  dark: boolean;
  colors: NavigationThemeColors;
}

export function getNavigationTheme(scheme: ColorSchemeName): CustomTheme {
  const colorScheme = scheme ?? 'light';
  const isDark = colorScheme === 'dark';
  
  const theme: CustomTheme = {
    dark: isDark,
    colors: {
      primary: 'hsl(261, 90%, 66%)',
      background: isDark ? 'hsl(240, 10%, 3.9%)' : 'hsl(0, 0%, 100%)',
      card: isDark ? 'hsl(240, 10%, 5.9%)' : 'hsl(0, 0%, 100%)',
      text: isDark ? 'hsl(0, 0%, 98%)' : 'hsl(240, 10%, 3.9%)',
      border: isDark ? 'hsl(240, 3.7%, 15.9%)' : 'hsl(240, 5.9%, 90%)',
      notification: isDark ? 'hsl(0, 72%, 51%)' : 'hsl(0, 84.2%, 60.2%)',
      tabActive: isDark ? '#FFFFFF' : '#000000',
      tabInactive: isDark ? '#A3A3A3' : '#737373',
      tabIndicator: 'hsl(261, 90%, 66%)',
    }
  };

  return theme;
}