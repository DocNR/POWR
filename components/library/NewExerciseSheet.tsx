// components/library/NewExerciseSheet.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { generateId } from '@/utils/ids';
import { BaseExercise, ExerciseType, ExerciseCategory, Equipment } from '@/types/exercise';
import { StorageSource } from '@/types/shared';

interface NewExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (exercise: BaseExercise) => void;
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
    
    // Cast to any as a temporary workaround for the TypeScript error
    const exercise = {
      // BaseExercise properties
      title: formData.title,
      type: formData.type,
      category: formData.category,
      equipment: formData.equipment,
      description: formData.description,
      tags: formData.tags,
      format: formData.format,
      format_units: formData.format_units,
      // SyncableContent properties
      id: generateId('local'),
      created_at: Date.now(),
      availability: {
        source: ['local' as StorageSource]
      }
    } as BaseExercise;

    onSubmit(exercise);
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
        <View className="gap-4">
          <View>
            <Text className="text-base font-medium mb-2">Exercise Name</Text>
            <Input
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
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
            <Input
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Exercise description..."
              multiline
              numberOfLines={4}
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
        </View>
      </SheetContent>
    </Sheet>
  );
}