// app/(tabs)/library/exercises.tsx
import React, { useState, useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { SearchHeader } from '@/components/library/SearchHeader';
import { FilterSheet, type FilterOptions } from '@/components/library/FilterSheet';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';
import { Dumbbell } from 'lucide-react-native';
import { Exercise, ExerciseCategory, ExerciseEquipment, ContentSource } from '@/types/library';

const initialExercises: Exercise[] = [
  {
    id: '1',
    title: 'Barbell Back Squat',
    category: 'Legs' as ExerciseCategory,
    equipment: 'barbell' as ExerciseEquipment,
    tags: ['compound', 'strength'],
    source: 'local' as ContentSource,
    description: 'A compound exercise that primarily targets the quadriceps, hamstrings, and glutes.',
  },
  {
    id: '2',
    title: 'Pull-ups',
    category: 'Pull' as ExerciseCategory,
    equipment: 'bodyweight' as ExerciseEquipment,
    tags: ['upper-body', 'compound'],
    source: 'local' as ContentSource,
    description: 'An upper body pulling exercise that targets the latissimus dorsi and biceps.',
  },
  {
    id: '3',
    title: 'Bench Press',
    category: 'Push' as ExerciseCategory,
    equipment: 'barbell' as ExerciseEquipment,
    tags: ['push', 'strength'],
    source: 'nostr' as ContentSource,
    description: 'A compound pushing exercise that targets the chest, shoulders, and triceps.',
  },
];

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    equipment: [],
    tags: [],
    source: []
  });

  // Filter exercises
  const filteredExercises = useCallback(() => {
    return exercises.filter(exercise => {
      // Search filter - make case insensitive
      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim();
        const matchesSearch = 
          exercise.title.toLowerCase().includes(searchLower) ||
          exercise.description?.toLowerCase().includes(searchLower) ||
          exercise.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          exercise.equipment?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Equipment filter
      if (filterOptions.equipment.length > 0) {
        if (!filterOptions.equipment.includes(exercise.equipment || '')) {
          return false;
        }
      }

      // Tags filter
      if (filterOptions.tags.length > 0) {
        if (!exercise.tags.some(tag => filterOptions.tags.includes(tag))) {
          return false;
        }
      }

      // Source filter
      if (filterOptions.source.length > 0) {
        if (!filterOptions.source.includes(exercise.source)) {
          return false;
        }
      }

      return true;
    });
  }, [exercises, searchQuery, filterOptions]);

  const handleAddExercise = (newExercise: Exercise) => {
    setExercises(prev => [...prev, newExercise]);
    setShowNewExercise(false);
  };

  // Get recent and filtered exercises
  const recentExercises = exercises.slice(0, 2);
  const allExercises = filteredExercises();
  const activeFilterCount = Object.values(filterOptions)
    .reduce((count, filters) => count + filters.length, 0);

  const handleDelete = (id: string) => {
    setExercises(current => current.filter(ex => ex.id !== id));
  };

  const handleExercisePress = (exerciseId: string) => {
    console.log('Selected exercise:', exerciseId);
  };

  const availableFilters = {
    equipment: ['barbell', 'dumbbell', 'bodyweight', 'machine', 'cable', 'other'] as ExerciseEquipment[],
    tags: ['strength', 'compound', 'isolation', 'push', 'pull', 'legs'],
    source: ['local', 'powr', 'nostr'] as ContentSource[]
  };

  return (
    <View className="flex-1 bg-background">
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilters={activeFilterCount}
        onOpenFilters={() => setShowFilters(true)}
      />

      <ScrollView className="flex-1">
        {/* Recent Exercises Section */}
        <View className="py-4">
          <Text className="text-lg font-semibold mb-4 px-4">Recent Exercises</Text>
          <View className="gap-3">
            {recentExercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                {...exercise}
                onPress={() => handleExercisePress(exercise.id)}
                onDelete={() => handleDelete(exercise.id)}
              />
            ))}
          </View>
        </View>

        {/* All Exercises Section */}
        <View className="py-4">
          <Text className="text-lg font-semibold mb-4 px-4">All Exercises</Text>
          <View className="gap-3">
            {allExercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                {...exercise}
                onPress={() => handleExercisePress(exercise.id)}
                onDelete={() => handleDelete(exercise.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <FloatingActionButton
        icon={Dumbbell}
        onPress={() => setShowNewExercise(true)}
      />

      <FilterSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        options={filterOptions}
        onApplyFilters={setFilterOptions}
        availableFilters={availableFilters}
      />

      <NewExerciseSheet 
        isOpen={showNewExercise}
        onClose={() => setShowNewExercise(false)}
        onSubmit={handleAddExercise}
      />
    </View>
  );
}