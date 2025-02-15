// components/layout/TabScreen.tsx
import React from 'react';
import { View, ViewProps } from 'react-native';

interface TabScreenProps extends ViewProps {
  children: React.ReactNode;
}

export function TabScreen({ 
  children, 
  style,
  ...props 
}: TabScreenProps) {
  return (
    <View 
      className="flex-1 bg-background"
      style={style}
      {...props}
    >
      {children}
    </View>
  );
}