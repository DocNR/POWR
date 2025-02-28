// components/PowerLogo.tsx
import React from 'react';
import { View, Text as RNText, useColorScheme } from 'react-native';
import { Zap } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';

interface PowerLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function PowerLogo({ size = 'md' }: PowerLogoProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  
  const fontSize = {
    sm: 18,
    md: 22,
    lg: 26,
  }[size];

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 20,
  }[size];

  // Use theme colors to ensure visibility in both light and dark mode
  const textColor = theme.colors.primary || (colorScheme === 'dark' ? '#9c5cff' : '#6b21a8');

  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4, // Add padding to prevent clipping
    }}>
      <RNText 
        style={{ 
          fontWeight: 'bold', 
          fontStyle: 'italic',
          fontSize: fontSize,
          color: textColor,
          includeFontPadding: false, // Helps with text clipping
          textAlignVertical: 'center',
        }}
      >
        POWR
      </RNText>
      <Zap 
        size={iconSize} 
        color="#FFD700" // Gold color for the lightning bolt
        fill="#FFD700"
        style={{ marginLeft: 2 }}
      />
    </View>
  );
}