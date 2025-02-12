// lib/theme.ts
import { Theme } from '@react-navigation/native';
import { ColorSchemeName } from 'react-native';

// Update the interface for our navigation theme colors
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

// Original ThemeColors interface remains the same
export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  border: string;
  input: string;
  ring: string;
  purple: string;
  'purple-pressed': string;
}

// Export the color conversion function
export function convertHSLValues(colorScheme: 'light' | 'dark') {
    const purple = colorScheme === 'light' 
      ? 'hsl(261, 90%, 66%)'
      : 'hsl(261, 90%, 66%)';
    const mutedForeground = colorScheme === 'light' 
      ? 'hsl(240, 3.8%, 46.1%)'
      : 'hsl(240, 5%, 64.9%)';
  
    return {
      purple,
      mutedForeground,
    };
  }
  
  export function getNavigationTheme(scheme: ColorSchemeName): Theme {
    const colorScheme = scheme ?? 'light';
    const { purple, mutedForeground } = convertHSLValues(colorScheme as 'light' | 'dark');
    
    const theme: Theme = {
      dark: colorScheme === 'dark',
      colors: {
        primary: purple,
        background: colorScheme === 'dark' ? 'hsl(240, 10%, 3.9%)' : 'hsl(0, 0%, 100%)',
        card: colorScheme === 'dark' ? 'hsl(240, 10%, 5.9%)' : 'hsl(0, 0%, 100%)',
        text: colorScheme === 'dark' ? 'hsl(0, 0%, 98%)' : 'hsl(240, 10%, 3.9%)',
        border: colorScheme === 'dark' ? 'hsl(240, 3.7%, 15.9%)' : 'hsl(240, 5.9%, 90%)',
        notification: colorScheme === 'dark' ? 'hsl(0, 72%, 51%)' : 'hsl(0, 84.2%, 60.2%)',
      },
      fonts: {
        regular: {
          fontFamily: 'System',
          fontWeight: '400',
        },
        medium: {
          fontFamily: 'System',
          fontWeight: '500',
        },
        bold: {
          fontFamily: 'System',
          fontWeight: '700',
        },
        heavy: {
          fontFamily: 'System',
          fontWeight: '900',
        },
      },
    };
  
    return theme;
  }