// app/(workout)/add-exercises.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, ScrollView, StyleSheet, Platform, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, FlatList, 
  ActivityIndicator 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { router, useLocalSearchParams } from 'expo-router';
import { useWorkout } from '@/contexts/WorkoutContext';
import { ThemedText } from '@/components/ThemedText';
import { spacing } from '@/styles/sharedStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { libraryService } from '@/services/LibraryService';
import { BaseExercise, ExerciseCategory } from '@/types/exercise';
import { NostrEventKind } from '@/types/events';

type ExerciseFormat = {
  weight?: number;
  reps?: number;
  rpe?: number;
  set_type?: 'warmup' | 'normal' | 'drop' | 'failure';
};

type FilterCategory = ExerciseCategory | 'All';
type ScreenMode = 'workout' | 'template';

const CATEGORIES: FilterCategory[] = ['All', 'Push', 'Pull', 'Legs', 'Core'];
const DEFAULT_RELAY = 'wss://powr.relay'; // This should come from config

export default function AddExercisesScreen() {
  const { addExercise } = useWorkout();
  const { colors } = useColorScheme();
  const params = useLocalSearchParams();
  const mode = (params.mode as ScreenMode) || 'workout';

  const [exercises, setExercises] = useState<BaseExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [selectedExercises, setSelectedExercises] = useState<Map<string, ExerciseFormat>>(new Map());

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const data = await libraryService.getExercises();
        setExercises(data);
      } catch (error) {
        console.error('Error loading exercises:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExercises();
  }, []);

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch = exercise.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || exercise.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exercises, searchQuery, selectedCategory]);

  const handleAddSelectedExercises = async () => {
    try {
      if (selectedExercises.size === 0) return;

      const selectedExerciseData = exercises
        .filter(exercise => selectedExercises.has(exercise.id))
        .map(exercise => ({
          ...exercise,
          reference: `${NostrEventKind.EXERCISE_TEMPLATE}:${exercise.id}:${DEFAULT_RELAY}`,
          format: selectedExercises.get(exercise.id) || {}
        }));

      if (mode === 'template') {
        router.push({
          pathname: '/(workout)/create-template',
          params: { 
            exercises: encodeURIComponent(JSON.stringify(selectedExerciseData))
          }
        });
      } else {
        for (const exercise of selectedExerciseData) {
          await addExercise(exercise);
        }
        router.back();
      }
    } catch (error) {
      console.error('Error handling exercises:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={[styles.headerContent, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              {mode === 'workout' ? 'Add Exercise' : 'Select Exercises for Template'}
            </ThemedText>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: colors.cardBg }]}>
            <Feather name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  { backgroundColor: colors.cardBg },
                  selectedCategory === category && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <ThemedText
                  style={[
                    styles.categoryText,
                    { color: selectedCategory === category ? colors.background : colors.textSecondary }
                  ]}
                >
                  {category}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>

        <FlatList
          data={filteredExercises}
          contentContainerStyle={styles.listContent}
          renderItem={({ item: exercise }) => (
            <TouchableOpacity
              style={[
                styles.exerciseCard,
                { backgroundColor: colors.cardBg },
                selectedExercises.has(exercise.id) && {
                  backgroundColor: `${colors.primary}15`,
                  borderColor: colors.primary,
                  borderWidth: 1,
                }
              ]}
              onPress={() => {
                setSelectedExercises(prev => {
                  const updated = new Map(prev);
                  if (updated.has(exercise.id)) {
                    updated.delete(exercise.id);
                  } else {
                    updated.set(exercise.id, {});
                  }
                  return updated;
                });
              }}
            >
              <View>
                <ThemedText style={styles.exerciseName}>{exercise.title}</ThemedText>
                <View style={styles.exerciseDetails}>
                  <ThemedText style={styles.exerciseCategory}>{exercise.category}</ThemedText>
                  <ThemedText style={styles.exerciseEquipment}>{exercise.equipment}</ThemedText>
                </View>
              </View>
              <Feather
                name={selectedExercises.has(exercise.id) ? 'check-circle' : 'plus-circle'}
                size={24}
                color={selectedExercises.has(exercise.id) ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />

        {selectedExercises.size > 0 && (
          <Animated.View 
            entering={FadeIn}
            style={[styles.footer, { backgroundColor: colors.background }]}
          >
            <SafeAreaView edges={['bottom']}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAddSelectedExercises}
              >
                <ThemedText style={styles.addButtonText}>
                  {mode === 'workout'
                    ? `Add ${selectedExercises.size} Exercise${
                        selectedExercises.size > 1 ? 's' : ''
                      }`
                    : 'Next: Configure Sets'}
                </ThemedText>
              </TouchableOpacity>
            </SafeAreaView>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    marginLeft: spacing.medium,
  },
  backButton: {
    padding: spacing.small,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.medium,
    padding: spacing.medium,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.small,
    fontSize: 16,
  },
  categoriesContent: {
    padding: spacing.medium,
    gap: spacing.small,
  },
  categoryTab: {
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    marginRight: spacing.small,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.medium,
  },
  exerciseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.medium,
    marginBottom: spacing.small,
    borderRadius: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  exerciseCategory: {
    fontSize: 14,
    opacity: 0.7,
  },
  exerciseEquipment: {
    fontSize: 14,
    opacity: 0.7,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  addButton: {
    margin: spacing.medium,
    padding: spacing.medium,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});