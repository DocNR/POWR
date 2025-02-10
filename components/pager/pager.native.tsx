// components/pager/pager.native.tsx
import React from 'react';
import PagerView from 'react-native-pager-view';
import type { PagerProps, PagerRef } from './types';

const NativePager: React.ForwardRefExoticComponent<PagerProps> = PagerView as unknown as React.ForwardRefExoticComponent<PagerProps>;

export default NativePager;