// app/(workout)/create-template.tsx
import React, { useState } from 'react';
import { 
  View, ScrollView, StyleSheet, Platform, TextInput, 
  TouchableOpacity, Alert, KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';   
import { router, useLocalSearchParams } from 'expo-router';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Input } from '@/components/form/Input';
import { Select } from '@/components/form/Select';
import { ThemedText } from '@/components/ThemedText';
import EditableText from '@/components/EditableText';
import { spacing } from '@/styles/sharedStyles';
import { generateId } from '@/utils/ids';
import { BaseExercise } from '@/types/exercise';
import { WorkoutTemplate, TemplateCategory } from '@/types/workout';
import { NostrEventKind } from '@/types/events';

const WORKOUT_TYPES: Array<{ label: string; value: WorkoutTemplate['type'] }> = [
  { label: 'Strength', value: 'strength' },
  { label: 'Circuit', value: 'circuit' },
  { label: 'EMOM', value: 'emom' },
  { label: 'AMRAP', value: 'amrap' }
];

const TEMPLATE_CATEGORIES: Array<{ label: string; value: TemplateCategory }> = [
  { label: 'Full Body', value: 'Full Body' },
  { label: 'Upper/Lower', value: 'Upper/Lower' },
  { label: 'Push/Pull/Legs', value: 'Push/Pull/Legs' },
  { label: 'Custom', value: 'Custom' }
];

interface CreateTemplateScreenProps {
  initialExercises?: BaseExercise[];
}

function CreateTemplateScreen({ initialExercises = [] }: CreateTemplateScreenProps) {
  const { colors } = useColorScheme();
  const params = useLocalSearchParams();
  const { saveTemplate } = useWorkout();
  
  const parsedExercises = params.exercises ? 
    JSON.parse(decodeURIComponent(params.exercises as string)) as BaseExercise[] : 
    initialExercises;

  // Form state matching Nostr spec
  const [title, setTitle] = useState('New Template');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState<WorkoutTemplate['type']>('strength');
  const [category, setCategory] = useState<TemplateCategory>('Custom');
  const [exercises, setExercises] = useState<BaseExercise[]>(parsedExercises);
  const [rounds, setRounds] = useState('');
  const [duration, setDuration] = useState('');
  const [intervalTime, setIntervalTime] = useState('');
  const [restBetweenRounds, setRestBetweenRounds] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleWorkoutTypeChange = (value: string | string[]) => {
    if (typeof value === 'string') {
      setWorkoutType(value as WorkoutTemplate['type']);
    }
  };

  const handleCategoryChange = (value: string | string[]) => {
    if (typeof value === 'string') {
      setCategory(value as TemplateCategory);
    }
  };

  const handleSave = async () => {
    try {
      if (!title.trim()) {
        Alert.alert('Error', 'Template must have a title');
        return;
      }

      if (exercises.length === 0) {
        Alert.alert('Error', 'Template must include at least one exercise');
        return;
      }

      // Create template following NIP-XX spec
      const template: WorkoutTemplate = {
        id: generateId(),
        title: title.trim(),
        type: workoutType,
        description: description,
        category: category,
        exercises: exercises.map(exercise => ({
          exercise,
          targetSets: 0,
          targetReps: 0,
        })),
        tags: tags,
        rounds: rounds ? parseInt(rounds) : undefined,
        duration: duration ? parseInt(duration) * 60 : undefined,
        interval: intervalTime ? parseInt(intervalTime) : undefined,
        restBetweenRounds: restBetweenRounds ? parseInt(restBetweenRounds) : undefined,
        isPublic: false,
        created_at: Date.now(),
        availability: {
          source: ['local']
        },
        notes: ''
      };

      await saveTemplate(template);
      router.back();
    } catch (error) {
      console.error('Error saving template:', error);
      setError('Failed to save template. Please try again.');
    }
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <ThemedText style={[styles.saveButtonText, { color: colors.background }]}>
              Save Template
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
      >
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.titleSection}>
            <EditableText
              value={title}
              onChangeText={setTitle}
              style={styles.titleContainer}
              textStyle={[styles.title, { color: colors.text }]}
              placeholder="Template Name"
            />
          </View>

          <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
            <Select
              label="Workout Type"
              value={workoutType}
              onValueChange={handleWorkoutTypeChange}
              items={WORKOUT_TYPES}
              required
            />
            <Select
              label="Category"
              value={category}
              onValueChange={handleCategoryChange}
              items={TEMPLATE_CATEGORIES}
              required
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder="Add a description for your template"
            />
          </View>

          {workoutType !== 'strength' && (
            <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Workout Parameters
              </ThemedText>
              
              <Input
                label="Number of Rounds"
                value={rounds}
                onChangeText={setRounds}
                keyboardType="numeric"
                placeholder="e.g., 5"
              />
              
              <Input
                label="Total Duration (minutes)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="e.g., 20"
              />
              
              <Input
                label="Interval Time (seconds)"
                value={intervalTime}
                onChangeText={setIntervalTime}
                keyboardType="numeric"
                placeholder="e.g., 40"
              />
              
              <Input
                label="Rest Between Rounds (seconds)"
                value={restBetweenRounds}
                onChangeText={setRestBetweenRounds}
                keyboardType="numeric"
                placeholder="e.g., 60"
              />
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Exercises ({exercises.length})
            </ThemedText>
            
            {exercises.map((exercise: BaseExercise, index: number) => (
              <View 
                key={exercise.id} 
                style={[styles.exerciseCard, { borderBottomColor: colors.border }]}
              >
                <View style={styles.exerciseHeader}>
                  <ThemedText style={styles.exerciseName}>
                    {exercise.title}
                  </ThemedText>
                  <TouchableOpacity 
                    onPress={() => {
                      const newExercises = [...exercises];
                      newExercises.splice(index, 1);
                      setExercises(newExercises);
                    }}
                  >
                    <Feather name="trash-2" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                router.push({
                  pathname: '/(workout)/add-exercises' as const,
                  params: { mode: 'template' }
                });
              }}
            >
              <ThemedText style={[styles.addButtonText, { color: colors.background }]}>
                Add Exercise
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: spacing.small,
  },
  saveButton: {
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.medium,
    borderRadius: 8,
  },
  saveButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.medium,
  },
  titleSection: {
    marginBottom: spacing.medium,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: spacing.medium,
    padding: spacing.medium,
    borderRadius: 12,
    gap: spacing.medium,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  exerciseCard: {
    paddingVertical: spacing.medium,
    borderBottomWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    padding: spacing.medium,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.small,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateTemplateScreen;