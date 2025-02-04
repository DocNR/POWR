// types/theme.ts
export type ColorScheme = 'light' | 'dark';
export type ThemeName = 'default' | 'powr' | 'highContrast';

export interface ThemeColors {
  primary: string;
  background: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  border: string;
  tabIconDefault: string;
  tabIconSelected: string;
  error: string;
}

export interface AppThemeConfig {
  theme: ThemeName;
  useSystemTheme: boolean;
  colorScheme: ColorScheme;
}