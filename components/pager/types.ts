// components/pager/types.ts
import { StyleProp, ViewStyle } from 'react-native';

export interface PageSelectedEvent {
  nativeEvent: {
    position: number;
  };
}

export interface PagerProps {
  children: React.ReactNode[];
  style?: StyleProp<ViewStyle>;
  initialPage?: number;
  onPageSelected?: (e: PageSelectedEvent) => void;
}

export interface PagerRef {
  setPage: (page: number) => void;
  scrollTo?: (options: { x: number; animated?: boolean }) => void;
}