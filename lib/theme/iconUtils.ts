// lib/theme/iconUtils.ts
import { Platform } from 'react-native';
import { useColorScheme } from './useColorScheme';
import { FIXED_COLORS } from './colors';

export type IconVariant = 
  | 'primary'
  | 'muted'
  | 'destructive'
  | 'success'
  | 'warning';

export function useIconColor() {
  const { isDarkColorScheme } = useColorScheme();
  
  const getIconColor = (variant: IconVariant = 'primary') => {
    // Use fixed colors that work on both platforms
    switch (variant) {
      case 'primary':
        return FIXED_COLORS.primary;
      case 'muted':
        return isDarkColorScheme ? FIXED_COLORS.muted.dark : FIXED_COLORS.muted.light;
      case 'destructive':
        return FIXED_COLORS.destructive;
      case 'success':
        return FIXED_COLORS.success;
      case 'warning':
        return FIXED_COLORS.warning;
      default:
        return FIXED_COLORS.primary;
    }
  };
  
  return {
    getIconColor,
    getIconProps: (variant: IconVariant = 'primary') => ({
      color: getIconColor(variant),
      strokeWidth: Platform.OS === 'android' ? 2 : 1.5,
    })
  };
}