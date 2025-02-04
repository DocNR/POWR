// components/library/FilterSheet.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { useColorScheme } from '@/hooks/useColorScheme';
import { spacing } from '@/styles/sharedStyles';
import { ThemedText } from '@/components/ThemedText';

export interface FilterOptions {
  contentType: string[];
  source: string[];
  category: string[];
  equipment: string[]; 
}

interface FilterSheetProps {
  isVisible: boolean;
  options: FilterOptions;
  onClose: () => void;
  onApply: (options: FilterOptions) => void;
}

export default function FilterSheet({ 
  isVisible, 
  options, 
  onClose, 
  onApply 
}: FilterSheetProps) {
  const { colors } = useColorScheme();
  const [selectedOptions, setSelectedOptions] = 
    React.useState<FilterOptions>(options);

  const toggleOption = (
    category: keyof FilterOptions,
    value: string
  ) => {
    setSelectedOptions(prev => {
      const currentArray = prev[category] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(v => v !== value)
        : [...currentArray, value];

      return {
        ...prev,
        [category]: newArray
      };
    });
  };

  const renderFilterSection = (
    title: string,
    category: keyof FilterOptions,
    values: string[]
  ) => (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.optionsGrid}>
        {values.map(value => (
          <TouchableOpacity
            key={value}
            style={[
              styles.optionButton,
              selectedOptions[category]?.includes(value) && {
                backgroundColor: colors.primary + '20'
              }
            ]}
            onPress={() => toggleOption(category, value)}
          >
            <ThemedText
              style={[
                styles.optionText,
                selectedOptions[category]?.includes(value) && {
                  color: colors.primary
                }
              ]}
            >
              {value}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      propagateSwipe={true}
      style={styles.modal}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.handle} />
        
        <ThemedText type="title" style={styles.title}>
          Filter Library
        </ThemedText>

        {renderFilterSection('Content Type', 'contentType', [
          'exercise', 'workout', 'program'
        ])}
        
        {renderFilterSection('Source', 'source', [
          'local', 'pow', 'nostr'
        ])}
        
        {renderFilterSection('Category', 'category', [
          'Strength', 'Cardio', 'Flexibility', 'Recovery'
        ])}

        <View style={styles.buttons}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.cardBg }]}
            onPress={onClose}
          >
            <ThemedText>Cancel</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => {
              onApply(selectedOptions);
              onClose();
            }}
          >
            <ThemedText style={{ color: '#FFFFFF' }}>
              Apply Filters
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.medium,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: spacing.medium,
  },
  title: {
    marginBottom: spacing.large,
  },
  section: {
    marginBottom: spacing.large,
  },
  sectionTitle: {
    marginBottom: spacing.small,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.small,
  },
  optionButton: {
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  optionText: {
    fontSize: 14,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.small,
    marginTop: spacing.large,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});