// hooks/useThemeColor.ts
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ColorScheme } from '@/types/theme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { colorScheme } = useColorScheme();
  const themeColor = colorScheme as ColorScheme;
  
  if (props[themeColor]) {
    return props[themeColor];
  }
  return Colors[themeColor][colorName];
}