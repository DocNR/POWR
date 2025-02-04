// hooks/useFabPosition.ts
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useFabPosition() {
  const insets = useSafeAreaInsets();
  
  return useMemo(() => ({
    bottom: Platform.select({
      ios: Math.max(20, insets.bottom) + 65,
      android: 20,
    }),
  }), [insets.bottom]);
}