// components/library/NewExerciseSheet.tsx
import React from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BaseExercise, ExerciseType, ExerciseCategory, Equipment, Exercise } from '@/types/exercise';
import { StorageSource } from '@/types/shared';
import { Textarea } from '@/components/ui/textarea';
import { generateId } from '@/utils/ids';

interface NewExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (exercise: Omit<Exercise, 'id'>) => void; // Changed from BaseExercise
}

const EXERCISE_TYPES: ExerciseType[] = ['strength', 'cardio', 'bodyweight'];
const CATEGORIES: ExerciseCategory[] = ['Push', 'Pull', 'Legs', 'Core'];
const EQUIPMENT_OPTIONS: Equipment[] = [
  'bodyweight',
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'other'
];

export function NewExerciseSheet({ isOpen, onClose, onSubmit }: NewExerciseSheetProps) {
  const [formData, setFormData] = React.useState({
    title: '',
    type: 'strength' as ExerciseType,
    category: 'Push' as ExerciseCategory,
    equipment: undefined as Equipment | undefined,
    description: '',
    tags: [] as string[],
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
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.equipment) return;
    
    // Transform the form data into an Exercise type
    const exerciseData: Omit<Exercise, 'id'> = {
      title: formData.title,
      type: formData.type,
      category: formData.category,
      equipment: formData.equipment,
      description: formData.description,
      tags: formData.tags,
      format: formData.format,
      format_units: formData.format_units,
      // Add required Exercise fields
      source: 'local',
      created_at: Date.now(),
      availability: {
        source: ['local']
      },
      format_json: JSON.stringify(formData.format),
      format_units_json: JSON.stringify(formData.format_units)
    };
  
    onSubmit(exerciseData);
    onClose();
    
    // Reset form
    setFormData({
      title: '',
      type: 'strength',
      category: 'Push',
      equipment: undefined,
      description: '',
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
      }
    });
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetHeader>
        <SheetTitle>New Exercise</SheetTitle>
      </SheetHeader>
      <SheetContent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView className="gap-4">
            <View>
              <Text className="text-base font-medium mb-2">Exercise Name</Text>
              <Input
                value={formData.title}
                onChangeText={(text: string) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="e.g., Barbell Back Squat"
              />
            </View>

            <View>
              <Text className="text-base font-medium mb-2">Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {EXERCISE_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant={formData.type === type ? 'purple' : 'outline'}
                    onPress={() => setFormData(prev => ({ ...prev, type }))}
                  >
                    <Text className={formData.type === type ? 'text-white' : ''}>
                      {type}
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-base font-medium mb-2">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={formData.category === category ? 'purple' : 'outline'}
                    onPress={() => setFormData(prev => ({ ...prev, category }))}
                  >
                    <Text className={formData.category === category ? 'text-white' : ''}>
                      {category}
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-base font-medium mb-2">Equipment</Text>
              <View className="flex-row flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <Button
                    key={eq}
                    variant={formData.equipment === eq ? 'purple' : 'outline'}
                    onPress={() => setFormData(prev => ({ ...prev, equipment: eq }))}
                  >
                    <Text className={formData.equipment === eq ? 'text-white' : ''}>
                      {eq}
                    </Text>
                  </Button>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-base font-medium mb-2">Description</Text>
              <Textarea
                value={formData.description}
                onChangeText={(text: string) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Exercise description..."
                numberOfLines={6}
                className="min-h-[120px]"
                style={{ maxHeight: 200 }}
              />
            </View>

            <Button 
              className="mt-4"
              variant='purple'
              onPress={handleSubmit}
              disabled={!formData.title || !formData.equipment}
            >
              <Text className="text-white font-semibold">Create Exercise</Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SheetContent>
    </Sheet>
  );
}