// components/library/LibraryContentCard.tsx
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LibraryContent } from '@/types/exercise';
import { spacing } from '@/styles/sharedStyles';
import { ThemedText } from '@/components/ThemedText';

export interface LibraryContentCardProps {
  content: LibraryContent;
  onPress: () => void;
  onFavoritePress: () => void;
  isVerified?: boolean;
}

export default function LibraryContentCard({ 
  content, 
  onPress, 
  onFavoritePress,
  isVerified
}: LibraryContentCardProps) {
  const { colors } = useColorScheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.cardBg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <ThemedText type="subtitle">
            {content.title}
          </ThemedText>
          {isVerified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={16} color={colors.primary} />
              <ThemedText style={[styles.verifiedText, { color: colors.primary }]}>
                POW Verified
              </ThemedText>
            </View>
          )}
        </View>
        <TouchableOpacity 
          onPress={onFavoritePress}
          style={styles.favoriteButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather 
            name="star"
            size={24} 
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {content.description && (
        <ThemedText 
          style={styles.description}
          numberOfLines={2}
        >
          {content.description}
        </ThemedText>
      )}

      <View style={styles.footer}>
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
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing.medium,
    marginBottom: spacing.small,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.small,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
  },
  favoriteButton: {
    padding: spacing.small,
    marginRight: -spacing.small,
    marginTop: -spacing.small,
  },
  description: {
    marginBottom: spacing.small,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.small,
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
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '500',
  },
});