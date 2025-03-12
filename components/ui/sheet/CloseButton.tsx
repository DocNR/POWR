// components/ui/sheet/CloseButton.tsx
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import { NAV_THEME } from '@/lib/theme/constants';

interface CloseButtonProps {
  onPress: () => void;
}

export function CloseButton({ onPress }: CloseButtonProps) {
  const { isDarkColorScheme } = useColorScheme();
  const theme = isDarkColorScheme ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <View className="absolute right-4 top-4 z-50">
      <TouchableOpacity 
        onPress={onPress}
        style={styles.button}
        className="p-3 rounded-full bg-muted/80 items-center justify-center"
      >
        <X 
          size={22}
          color={theme.text}
          strokeWidth={2.5}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 40,
    minHeight: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
});