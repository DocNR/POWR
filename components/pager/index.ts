// components/pager/index.ts
import { Platform } from 'react-native';
import type { PagerProps, PagerRef } from './types';

let PagerComponent: React.ForwardRefExoticComponent<PagerProps & React.RefAttributes<PagerRef>>;

if (Platform.OS === 'web') {
  PagerComponent = require('./pager.web').default;
} else {
  PagerComponent = require('./pager.native').default;
}

export type { PagerProps, PagerRef, PageSelectedEvent } from './types';
export default PagerComponent;