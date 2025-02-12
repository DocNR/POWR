// lib/constants.ts
import type { NavigationThemeColors } from './theme';

export const NAV_THEME: {
  light: NavigationThemeColors;
  dark: NavigationThemeColors;
} = {
  light: {
    background: 'hsl(0, 0%, 100%)',
    border: 'hsl(240, 5.9%, 90%)',
    card: 'hsl(0, 0%, 100%)',
    notification: 'hsl(0, 84.2%, 60.2%)',
    primary: 'hsl(261, 90%, 66%)',
    text: 'hsl(240, 10%, 3.9%)',
    tabActive: 'hsl(261, 90%, 66%)',
    tabInactive: 'hsl(240, 3.8%, 46.1%)',
    tabIndicator: 'hsl(261, 90%, 66%)',
  },
  dark: {
    background: 'hsl(240, 10%, 3.9%)',
    border: 'hsl(240, 3.7%, 15.9%)',
    card: 'hsl(240, 10%, 3.9%)',
    notification: 'hsl(0, 72%, 51%)',
    primary: 'hsl(261, 90%, 66%)',
    text: 'hsl(0, 0%, 98%)',
    tabActive: 'hsl(261, 90%, 66%)',
    tabInactive: 'hsl(240, 5%, 64.9%)',
    tabIndicator: 'hsl(261, 90%, 66%)',
  },
};