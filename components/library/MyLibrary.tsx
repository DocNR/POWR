// components/library/MyLibrary.tsx
import React from 'react';
import { View, FlatList, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LibraryContent } from '@/types/exercise';
import { libraryService } from '@/services/LibraryService';
import LibraryContentCard from '@/components/library/LibraryContentCard';
import { spacing } from '@/styles/sharedStyles';
import { ThemedText } from '@/components/ThemedText';

interface MyLibraryProps {
  savedContent: LibraryContent[];
  onContentPress: (content: LibraryContent) => void;
  onFavoritePress: (content: LibraryContent) => Promise<void>;
  onDeleteContent?: (content: LibraryContent) => void;
  isLoading?: boolean;
  isVisible?: boolean;
}

export default function MyLibrary({ 
  savedContent, 
  onContentPress, 
  onFavoritePress,
  onDeleteContent,
  isVisible = true
}: MyLibraryProps) {
  const { colors } = useColorScheme();

  // Don't render anything if not visible
  if (!isVisible) {
    return null;
  }

  const handleDelete = async (content: LibraryContent) => {
    try {
      if (content.type === 'exercise') {
        await libraryService.deleteExercise(content.id);
        onDeleteContent?.(content);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  };

  // Separate exercises and workouts
  const exercises = savedContent.filter(content => content.type === 'exercise');
  const workouts = savedContent.filter(content => content.type === 'workout');

  const renderSection = (title: string, items: LibraryContent[]) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        <FlatList
          data={items}
          renderItem={({ item }) => (
            <LibraryContentCard
              content={item}
              onPress={() => onContentPress(item)}
              onFavoritePress={() => onFavoritePress(item)}
              onDelete={item.type === 'exercise' ? () => handleDelete(item) : undefined}
            />
          )}
          keyExtractor={item => item.id}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="folder" size={48} color={colors.textSecondary} />
      <ThemedText type="title" style={styles.emptyStateTitle}>
        So empty!
      </ThemedText>
      <ThemedText type="subtitle" style={styles.emptyStateText}>
        Add content from Programs or Discover
      </ThemedText>
    </View>
  );

  if (savedContent.length === 0) {
    return <EmptyState />;
  }

  return (
    <FlatList
      data={[1]}
      renderItem={() => null}
      ListHeaderComponent={
        <>
          {exercises.length > 0 && renderSection('Exercises', exercises)}
          {workouts.length > 0 && renderSection('Workouts', workouts)}
        </>
      }
      contentContainerStyle={styles.contentContainer}
    />
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: spacing.medium,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  section: {
    marginBottom: spacing.large,
  },
  sectionTitle: {
    marginBottom: spacing.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    marginTop: spacing.medium,
    marginBottom: spacing.small,
  },
  emptyStateText: {
    textAlign: 'center',
    maxWidth: '80%',
  },
});