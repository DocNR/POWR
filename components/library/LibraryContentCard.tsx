// components/library/LibraryContentCard.tsx
import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LibraryContent } from '@/types/exercise';
import { spacing } from '@/styles/sharedStyles';
import { ThemedText } from '@/components/ThemedText';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RectButton } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export interface LibraryContentCardProps {
  content: LibraryContent;
  onPress: () => void;
  onFavoritePress: () => void;
  onDelete?: () => Promise<void>;
  isVerified?: boolean;
}

export default function LibraryContentCard({ 
  content, 
  onPress, 
  onFavoritePress,
  onDelete,
  isVerified
}: LibraryContentCardProps) {
  const { colors } = useColorScheme();
  const swipeableRef = React.useRef<Swipeable>(null);

  const handleDelete = async () => {
    try {
      // Play haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Show confirmation alert
      Alert.alert(
        'Delete Exercise',
        'Are you sure you want to delete this exercise?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              swipeableRef.current?.close();
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                if (onDelete) {
                  await onDelete();
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } catch (error) {
                console.error('Error deleting exercise:', error);
                Alert.alert('Error', 'Failed to delete exercise');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error handling delete:', error);
    }
  };

  const renderRightActions = () => {
    if (!onDelete) return null;

    return (
      <RectButton
        style={[styles.deleteAction, { backgroundColor: colors.error }]}
        onPress={handleDelete}
      >
        <Feather name="trash-2" size={24} color="white" />
        <ThemedText style={[styles.deleteText, { color: 'white' }]}>
          Delete
        </ThemedText>
      </RectButton>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
    >
      <RectButton
        style={[styles.container, { backgroundColor: colors.cardBg }]}
        onPress={onPress}
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
          <RectButton 
            onPress={onFavoritePress}
            style={styles.favoriteButton}
          >
            <Feather 
              name="star"
              size={24} 
              color={colors.textSecondary}
            />
          </RectButton>
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
      </RectButton>
    </Swipeable>
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
  deleteAction: {
    flex: 1,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});