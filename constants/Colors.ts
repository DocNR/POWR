// constants/Colors.ts
import { ThemeColors } from '@/types/theme';

const tintColorLight = '#2563eb';
const tintColorDark = '#60a5fa';

export const Colors: Record<string, ThemeColors> = {
  light: {
    primary: tintColorLight,
    background: '#ffffff',
    cardBg: '#f3f4f6',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    tabIconDefault: '#6b7280',
    tabIconSelected: tintColorLight,
    error: '#dc2626', // Added error color (red-600)
  },
  dark: {
    primary: tintColorDark,
    background: '#1f2937',
    cardBg: '#374151',
    text: '#f3f4f6',
    textSecondary: '#9ca3af',
    border: '#4b5563',
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorDark,
    error: '#ef4444', // Added error color (red-500, slightly lighter for dark mode)
  },
};