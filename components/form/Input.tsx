// components/form/Input.tsx
import React from 'react';
import { TextInput, TextInputProps, View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { spacing } from '@/styles/sharedStyles';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  required?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  required,
  style,
  ...props
}, ref) => {
  const { colors } = useColorScheme();

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <ThemedText style={styles.label}>
            {label}
            {required && <ThemedText style={{ color: colors.error }}> *</ThemedText>}
          </ThemedText>
        </View>
      )}
      <TextInput
        ref={ref}
        style={[
          styles.input,
          { 
            color: colors.text,
            backgroundColor: colors.cardBg,
            borderColor: error ? colors.error : colors.border
          },
          style
        ]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
      {error && (
        <ThemedText style={[styles.errorText, { color: colors.error }]}>
          {error}
        </ThemedText>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.small,
  },
  labelContainer: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    padding: spacing.medium,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
  },
});

