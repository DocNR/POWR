// styles/sharedStyles.ts
import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

export const spacing = {
    xs: 4,
    small: 8,
    medium: 16,
    large: 24,
    xl: 32,
  } as const;

export const createThemedStyles = (colors: typeof Colors.light) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

});