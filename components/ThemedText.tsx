// components/ThemedText.tsx
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useAppearance } from '@/contexts/AppearanceContext';

export type TextType = 'default' | 'title' | 'subtitle' | 'link' | 'error';

interface ThemedTextProps extends TextProps {
  type?: TextType;
  children: React.ReactNode;
}

export function ThemedText({ 
  style, 
  type = 'default', 
  children, 
  ...props 
}: ThemedTextProps) {
  const { colors } = useAppearance();

  const baseStyle = { color: colors.text };
  const typeStyle = styles[type] || {};

  if (type === 'link') {
    baseStyle.color = colors.primary;
  } else if (type === 'error') {
    baseStyle.color = 'red';
  }

  return (
    <Text 
      style={[baseStyle, typeStyle, style]} 
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  link: {
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  error: {
    fontSize: 14,
  },
});