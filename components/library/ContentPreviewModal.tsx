// components/library/ContentPreviewModal.tsx
import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LibraryContent } from '@/types/exercise';
import { useColorScheme } from '@/hooks/useColorScheme';
import { spacing } from '@/styles/sharedStyles';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

interface ContentPreviewModalProps {
  isVisible: boolean;
  content: LibraryContent | null;
  onClose: () => void;
  onSave?: () => void;
}

export default function ContentPreviewModal({
  isVisible,
  content,
  onClose,
  onSave
}: ContentPreviewModalProps) {
  const { colors } = useColorScheme();

  if (!content) return null;

  const isExercise = content.type === 'exercise';
  const isWorkout = content.type === 'workout';

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <ThemedText type="title">{content.title}</ThemedText>
            </View>
            {onSave && (
              <TouchableOpacity onPress={onSave} style={styles.saveButton}>
                <Feather name="bookmark" size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content}>
            {/* Author Info */}
            <View style={styles.authorSection}>
              <ThemedText type="subtitle">
                {content.author?.name || 'Anonymous'}
              </ThemedText>
              {content.source === 'pow' && (
                <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Feather name="check-circle" size={16} color={colors.primary} />
                  <ThemedText style={[styles.verifiedText, { color: colors.primary }]}>
                    POW Verified
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Description */}
            {content.description && (
              <ThemedText style={styles.description}>
                {content.description}
              </ThemedText>
            )}

            {/* Exercise-specific content */}
            {isExercise && (
              <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Instructions
                </ThemedText>
                {/* Exercise instructions here */}
              </View>
            )}

            {/* Workout-specific content */}
            {isWorkout && (
              <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Exercises
                </ThemedText>
                {/* Workout exercises list here */}
              </View>
            )}

            {/* Tags */}
            <View style={styles.tags}>
              {content.tags.map(tag => (
                <View 
                  key={tag} 
                  style={[styles.tag, { backgroundColor: colors.primary + '20' }]}
                >
                  <ThemedText style={[styles.tagText, { color: colors.primary }]}>
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.small,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  saveButton: {
    padding: spacing.small,
  },
  content: {
    padding: spacing.medium,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.medium,
    gap: spacing.small,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.small,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    marginBottom: spacing.large,
  },
  section: {
    marginBottom: spacing.large,
  },
  sectionTitle: {
    marginBottom: spacing.small,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.small,
    marginTop: spacing.medium,
  },
  tag: {
    paddingHorizontal: spacing.small,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});