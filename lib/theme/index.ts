// lib/theme/index.ts
export * from './colors';
export * from './constants';
export * from './iconUtils';
export * from './useColorScheme';

// Also re-export any types
export type { NavigationThemeColors } from '@/lib/theme/constants';
export type { IconVariant } from './iconUtils';