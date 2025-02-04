// hooks/useColorScheme.ts
import { useAppearance } from '@/contexts/AppearanceContext';
import { ThemeColors, ColorScheme, ThemeName } from '@/types/theme';

export function useColorScheme(): {
  colorScheme: ColorScheme;
  theme: ThemeName;
  colors: ThemeColors;
} {
  const context = useAppearance();
  return context;
}