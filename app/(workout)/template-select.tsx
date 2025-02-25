// app/(workout)/template-select.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '@/stores/workoutStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateId } from '@/utils/ids';
import type { TemplateType } from '@/types/templates'; 

// Temporary mock data - replace with actual template data
const MOCK_TEMPLATES = [
  {
    id: '1',
    title: 'Full Body Strength',
    type: 'strength',
    category: 'Strength',
    exercises: [
      { title: 'Squat', sets: 3, reps: 8 },
      { title: 'Bench Press', sets: 3, reps: 8 },
      { title: 'Deadlift', sets: 3, reps: 8 }
    ]
  },
  {
    id: '2',
    title: 'Upper Body Push',
    type: 'strength',
    category: 'Push/Pull/Legs',
    exercises: [
      { title: 'Bench Press', sets: 4, reps: 8 },
      { title: 'Shoulder Press', sets: 3, reps: 10 },
      { title: 'Tricep Extensions', sets: 3, reps: 12 }
    ]
  }
];

export default function TemplateSelectScreen() {
  const router = useRouter();
  const startWorkout = useWorkoutStore.use.startWorkout();

  const handleSelectTemplate = (template: typeof MOCK_TEMPLATES[0]) => {
    startWorkout({
      title: template.title,
      type: template.type as TemplateType, // Cast to proper type
      exercises: template.exercises.map(ex => ({
        id: generateId('local'),
        title: ex.title,
        type: 'strength',
        category: 'Push',
        equipment: 'barbell',
        tags: [],
        format: {
          weight: true,
          reps: true,
          rpe: true,
          set_type: true
        },
        format_units: {
          weight: 'kg',
          reps: 'count',
          rpe: '0-10',
          set_type: 'warmup|normal|drop|failure'
        },
        sets: Array(ex.sets).fill({
          id: generateId('local'),
          type: 'normal',
          weight: 0,
          reps: ex.reps,
          isCompleted: false
        }),
        isCompleted: false,
        availability: {
          source: ['local']
        },
        created_at: Date.now()
      }))
    });
    router.back();
  };

  return (
    <ScrollView className="flex-1 p-4">
      <Text className="text-lg font-semibold mb-4">Recent Templates</Text>
      
      {MOCK_TEMPLATES.map(template => (
        <Card key={template.id} className="mb-4">
          <CardContent className="p-4">
            <Text className="text-lg font-semibold">{template.title}</Text>
            <Text className="text-sm text-muted-foreground mb-2">{template.category}</Text>
            
            {/* Exercise Preview */}
            <View className="mb-4">
              {template.exercises.map((exercise, index) => (
                <Text key={index} className="text-sm text-muted-foreground">
                  {exercise.title} - {exercise.sets}×{exercise.reps}
                </Text>
              ))}
            </View>

            <Button onPress={() => handleSelectTemplate(template)}>
              <Text>Start Workout</Text>
            </Button>
          </CardContent>
        </Card>
      ))}
    </ScrollView>
  );
}