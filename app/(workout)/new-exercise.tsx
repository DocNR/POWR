// app/(workout)/new-exercise.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { Input } from '@/components/form/Input';
import { Button } from '@/components/form/Button';
import { libraryService } from '@/services/LibraryService';
import { spacing } from '@/styles/sharedStyles';
import { ExerciseType, ExerciseCategory, Equipment } from '@/types/exercise';

// Define valid options based on schema and NIP-XX constraints
const EQUIPMENT_OPTIONS: Equipment[] = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'other'
];

const EXERCISE_TYPES: ExerciseType[] = [
  'strength',
  'cardio',
  'bodyweight'
];

const CATEGORIES: ExerciseCategory[] = [
  'Push',
  'Pull',
  'Legs',
  'Core'
];

const DIFFICULTY_OPTIONS = [
  'beginner',
  'intermediate',
  'advanced'
] as const;

type Difficulty = typeof DIFFICULTY_OPTIONS[number];

const MOVEMENT_PATTERNS = [
  'push',
  'pull',
  'squat',
  'hinge',
  'carry',
  'rotation'
] as const;

type MovementPattern = typeof MOVEMENT_PATTERNS[number];

export default function NewExerciseScreen() {
  const router = useRouter();
  const { colors } = useColorScheme();
  
  // Required fields based on NIP-XX spec
  const [title, setTitle] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType>(EXERCISE_TYPES[0]);
  const [category, setCategory] = useState<ExerciseCategory>(CATEGORIES[0]);
  const [equipment, setEquipment] = useState<Equipment>(EQUIPMENT_OPTIONS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTY_OPTIONS[0]);
  const [movementPattern, setMovementPattern] = useState<MovementPattern>(MOVEMENT_PATTERNS[0]);
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

      const exerciseTemplate = {
        title: title.trim(),
        type: exerciseType,
        category,
        equipment,
        difficulty,
        description: instructions.trim(),
        tags: [
          difficulty,
          movementPattern,
          category.toLowerCase()
        ],
        format: {
          weight: true,
          reps: true,
          rpe: true,
          set_type: true
        },
        format_units: {
          weight: 'kg' as const,
          reps: 'count' as const,
          rpe: '0-10' as const,
          set_type: 'warmup|normal|drop|failure' as const
        }
      };

      if (__DEV__) {
        console.log('Creating exercise:', exerciseTemplate);
      }

      await libraryService.addExercise(exerciseTemplate);
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
        {/* Basic Information */}
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

          <View style={styles.pickerContainer}>
            <ThemedText style={styles.label}>Exercise Type</ThemedText>
            <Picker<ExerciseType>
              selectedValue={exerciseType}
              onValueChange={(value: ExerciseType) => setExerciseType(value)}
              style={[styles.picker, { backgroundColor: colors.cardBg }]}
            >
              {EXERCISE_TYPES.map((option) => (
                <Picker.Item 
                  key={option} 
                  label={option.charAt(0).toUpperCase() + option.slice(1)} 
                  value={option} 
                />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <ThemedText style={styles.label}>Category</ThemedText>
            <Picker<ExerciseCategory>
              selectedValue={category}
              onValueChange={(value: ExerciseCategory) => setCategory(value)}
              style={[styles.picker, { backgroundColor: colors.cardBg }]}
            >
              {CATEGORIES.map((option) => (
                <Picker.Item key={option} label={option} value={option} />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <ThemedText style={styles.label}>Equipment</ThemedText>
            <Picker<Equipment>
              selectedValue={equipment}
              onValueChange={(value: Equipment) => setEquipment(value)}
              style={[styles.picker, { backgroundColor: colors.cardBg }]}
            >
              {EQUIPMENT_OPTIONS.map((option) => (
                <Picker.Item 
                  key={option} 
                  label={option.charAt(0).toUpperCase() + option.slice(1)} 
                  value={option} 
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Categorization */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Categorization
          </ThemedText>

          <View style={styles.pickerContainer}>
            <ThemedText style={styles.label}>Movement Pattern</ThemedText>
            <Picker<MovementPattern>
              selectedValue={movementPattern}
              onValueChange={(value: MovementPattern) => setMovementPattern(value)}
              style={[styles.picker, { backgroundColor: colors.cardBg }]}
            >
              {MOVEMENT_PATTERNS.map((option) => (
                <Picker.Item 
                  key={option} 
                  label={option.charAt(0).toUpperCase() + option.slice(1)} 
                  value={option} 
                />
              ))}
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <ThemedText style={styles.label}>Difficulty</ThemedText>
            <Picker<Difficulty>
              selectedValue={difficulty}
              onValueChange={(value: Difficulty) => setDifficulty(value)}
              style={[styles.picker, { backgroundColor: colors.cardBg }]}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <Picker.Item 
                  key={option} 
                  label={option.charAt(0).toUpperCase() + option.slice(1)} 
                  value={option} 
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Instructions */}
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
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  form: {
    gap: spacing.large,
  },
  section: {
    gap: spacing.medium,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.small,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.small,
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: spacing.large,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.large,
  },
  pickerContainer: {
    marginBottom: spacing.medium,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.small,
  },
  picker: {
    borderRadius: 8,
    padding: spacing.small,
  },
});