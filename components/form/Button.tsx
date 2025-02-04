// components/form/Button.tsx
import React from 'react';
import { 
  TouchableOpacity, 
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { spacing } from '@/styles/sharedStyles';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled,
  loading,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useColorScheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.textSecondary;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.cardBg;
      case 'outline':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.background;
    switch (variant) {
      case 'primary':
        return colors.background;
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.primary;
      default:
        return colors.background;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return disabled ? colors.textSecondary : colors.primary;
    }
    return 'transparent';
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { 
          paddingVertical: spacing.small,
          paddingHorizontal: spacing.medium
        };
      case 'large':
        return { 
          paddingVertical: spacing.large,
          paddingHorizontal: spacing.xl
        };
      default:
        return { 
          paddingVertical: spacing.medium,
          paddingHorizontal: spacing.large
        };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        getSizeStyle(),
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          color={getTextColor()} 
          size="small"
        />
      ) : (
        <ThemedText
          style={[
            styles.text,
            { color: getTextColor() },
            size === 'small' && { fontSize: 14 },
            size === 'large' && { fontSize: 18 },
            textStyle
          ]}
        >
          {title}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});