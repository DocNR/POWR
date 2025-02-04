// components/form/Select.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { spacing } from '@/styles/sharedStyles';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  items: SelectOption[];
  placeholder?: string;
  required?: boolean;
  multiple?: boolean;
  error?: string;
}

export function Select({
  label,
  value,
  onValueChange,
  items,
  placeholder = 'Select...',
  required,
  multiple,
  error
}: SelectProps) {
  const { colors } = useColorScheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabels = React.useMemo(() => {
    if (multiple && Array.isArray(value)) {
      return value
        .map(v => items.find(item => item.value === v)?.label)
        .filter(Boolean)
        .join(', ');
    }
    return items.find(item => item.value === value)?.label;
  }, [value, items, multiple]);

  const handleSelect = (selectedValue: string) => {
    if (multiple) {
      const currentValue = Array.isArray(value) ? value : [];
      const newValue = currentValue.includes(selectedValue)
        ? currentValue.filter(v => v !== selectedValue)
        : [...currentValue, selectedValue];
      onValueChange(newValue);
    } else {
      onValueChange(selectedValue);
      setIsOpen(false);
    }
  };

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
      
      <TouchableOpacity
        style={[
          styles.select,
          { 
            backgroundColor: colors.cardBg,
            borderColor: error ? colors.error : colors.border
          }
        ]}
        onPress={() => setIsOpen(true)}
      >
        <ThemedText style={[
          styles.selectText,
          !selectedLabels && { color: colors.textSecondary }
        ]}>
          {selectedLabels || placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Feather name="x" size={24} color={colors.text} />
              </TouchableOpacity>
              <ThemedText style={styles.modalTitle}>{label || 'Select'}</ThemedText>
              {multiple && (
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                  <ThemedText style={{ color: colors.primary }}>Done</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView>
              {items.map((item) => {
                const isSelected = multiple
                  ? Array.isArray(value) && value.includes(item.value)
                  : value === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.option,
                      isSelected && { backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <ThemedText style={[
                      styles.optionText,
                      isSelected && { color: colors.primary }
                    ]}>
                      {item.label}
                    </ThemedText>
                    {isSelected && (
                      <Feather name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {error && (
        <ThemedText style={[styles.errorText, { color: colors.error }]}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

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
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.medium,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.medium,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.medium,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
  },
});