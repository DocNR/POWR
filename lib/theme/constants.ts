// lib/theme/constants.ts
import { COLORS } from './colors';

export interface NavigationThemeColors {
  background: string;
  border: string;
  card: string;
  notification: string;
  primary: string;
  text: string;
  tabActive: string;
  tabInactive: string;
  tabIndicator: string;
}

export const NAV_THEME: {
  light: NavigationThemeColors;
  dark: NavigationThemeColors;
} = {
  light: {
    background: COLORS.light.background,
    border: COLORS.light.border,
    card: COLORS.light.card,
    notification: COLORS.destructive,
    primary: COLORS.purple.DEFAULT,
    text: COLORS.light.foreground,
    tabActive: COLORS.light.foreground,
    tabInactive: COLORS.light.mutedForeground,
    tabIndicator: COLORS.purple.DEFAULT,
  },
  dark: {
    background: COLORS.dark.background,
    border: COLORS.dark.border,
    card: COLORS.dark.card,
    notification: COLORS.destructive,
    primary: COLORS.purple.DEFAULT,
    text: COLORS.dark.foreground,
    tabActive: COLORS.dark.foreground,
    tabInactive: COLORS.dark.mutedForeground,
    tabIndicator: COLORS.purple.DEFAULT,
  },
};