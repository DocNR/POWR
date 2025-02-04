// components/library/AddContentModal.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Feather } from '@expo/vector-icons';
import { spacing } from '@/styles/sharedStyles';
import { ThemedText } from '@/components/ThemedText';

interface AddContentModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (type: 'exercise' | 'template') => void;
}

export default function AddContentModal({ isVisible, onClose, onSelect }: AddContentModalProps) {
  const { colors } = useColorScheme();

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.handle} />
        
        <ThemedText type="title" style={styles.title}>Add to Library</ThemedText>
        
        <TouchableOpacity 
          style={[styles.option, { backgroundColor: colors.cardBg }]}
          onPress={() => onSelect('exercise')}
        >
          <View style={styles.optionContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Feather name="activity" size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <ThemedText type="subtitle">New Exercise</ThemedText>
              <ThemedText>Add a custom exercise to your library</ThemedText>
            </View>
          </View>
          <Feather name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.option, { backgroundColor: colors.cardBg }]}
          onPress={() => onSelect('template')}
        >
          <View style={styles.optionContent}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Feather name="layout" size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <ThemedText type="subtitle">New Template</ThemedText>
              <ThemedText>Create a workout template</ThemedText>
            </View>
          </View>
          <Feather name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
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
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: spacing.large,
  },
  title: {
    marginBottom: spacing.large,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.medium,
    borderRadius: 12,
    marginBottom: spacing.medium,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.medium,
  },
  textContainer: {
    flex: 1,
  },
});