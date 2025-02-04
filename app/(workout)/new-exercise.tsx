// app/(workout)/new-exercise.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/form/Input';
import { Select } from '@/components/form/Select';
import { Button } from '@/components/form/Button';
import { LibraryService } from '@/services/LibraryService';
import { spacing } from '@/styles/sharedStyles';
import { generateId } from '@/utils/ids';

// Types based on NIP-XX spec
const EQUIPMENT_OPTIONS = [
  { label: 'Barbell', value: 'barbell' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Bodyweight', value: 'bodyweight' },
  { label: 'Machine', value: 'machine' },
  { label: 'Cardio', value: 'cardio' }
];

const DIFFICULTY_OPTIONS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' }
];

const MUSCLE_GROUP_OPTIONS = [
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Legs', value: 'legs' },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Arms', value: 'arms' },
  { label: 'Core', value: 'core' }
];

const MOVEMENT_TYPE_OPTIONS = [
  { label: 'Push', value: 'push' },
  { label: 'Pull', value: 'pull' },
  { label: 'Squat', value: 'squat' },
  { label: 'Hinge', value: 'hinge' },
  { label: 'Carry', value: 'carry' }
];

export default function NewExerciseScreen() {
  const router = useRouter();
  const { colors } = useColorScheme();
  
  // Form state matching Nostr spec
  const [title, setTitle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [movementTypes, setMovementTypes] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setError(null);
      setIsSubmitting(true);

      if (!title.trim()) {
        setError('Exercise name is required');
        return;
      }

      if (!equipment) {
        setError('Equipment type is required');
        return;
      }

      // Create exercise template following NIP-XX spec
      const exerciseTemplate = {
        id: generateId(), // UUID for template identification
        title: title.trim(),
        type: 'exercise',
        format: ['weight', 'reps', 'rpe', 'set_type'], // Required format params
        format_units: ['kg', 'count', '0-10', 'warmup|normal|drop|failure'], // Required unit definitions
        equipment,
        difficulty,
        content: instructions.trim(), // Form instructions in content field
        tags: [
          ['d', generateId()], // Required UUID tag
          ['title', title.trim()],
          ['equipment', equipment],
          ...muscleGroups.map(group => ['t', group]),
          ...movementTypes.map(type => ['t', type]),
          ['format', 'weight', 'reps', 'rpe', 'set_type'],
          ['format_units', 'kg', 'count', '0-10', 'warmup|normal|drop|failure'],
          difficulty ? ['difficulty', difficulty] : [],
        ].filter(tag => tag.length > 0), // Remove empty tags
        source: 'local',
        created_at: Date.now(),
        availability: {
          source: ['local']
        }
      };

      await LibraryService.addExercise(exerciseTemplate);
      router.back();

    } catch (err) {
      console.error('Error creating exercise:', err);
      setError('Failed to create exercise. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.form}>
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>
          <Input
            label="Exercise Name"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Barbell Back Squat"
            required
          />
          <Select
            label="Equipment"
            value={equipment}
            onValueChange={setEquipment}
            items={EQUIPMENT_OPTIONS}
            placeholder="Select equipment type"
            required
          />
          <Select
            label="Difficulty"
            value={difficulty}
            onValueChange={setDifficulty}
            items={DIFFICULTY_OPTIONS}
            placeholder="Select difficulty level"
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Categorization
          </ThemedText>
          <Select
            label="Muscle Groups"
            value={muscleGroups}
            onValueChange={setMuscleGroups}
            items={MUSCLE_GROUP_OPTIONS}
            placeholder="Select muscle groups"
            multiple
          />
          <Select
            label="Movement Types"
            value={movementTypes}
            onValueChange={setMovementTypes}
            items={MOVEMENT_TYPE_OPTIONS}
            placeholder="Select movement types"
            multiple
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Instructions
          </ThemedText>
          <Input
            label="Form Instructions"
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Describe proper form and execution..."
            multiline
            numberOfLines={4}
          />
        </View>

        {error && (
          <ThemedText style={[styles.error, { color: colors.error }]}>
            {error}
          </ThemedText>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title="Create Exercise"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.medium,
  },
  form: {
    gap: spacing.large,
  },
  section: {
    gap: spacing.medium,
  },
  sectionTitle: {
    marginBottom: spacing.small,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.small,
  },
  buttonContainer: {
    marginTop: spacing.large,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.large,
  },
});