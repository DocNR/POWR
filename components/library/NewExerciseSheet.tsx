// components/library/NewExerciseSheet.tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { generateId } from '@/utils/ids';
import { 
  BaseExercise, 
  ExerciseType, 
  ExerciseCategory, 
  Equipment,
  ExerciseFormat,
  ExerciseFormatUnits
} from '@/types/exercise';
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
  const [formData, setFormData] = useState({
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
    } as ExerciseFormat,
    format_units: {
      weight: 'kg',
      reps: 'count',
      rpe: '0-10',
      set_type: 'warmup|normal|drop|failure'
    } as ExerciseFormatUnits
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.equipment) return;
    
    const timestamp = Date.now();
    
    // Create BaseExercise
    const exercise: BaseExercise = {
      id: generateId(),
      title: formData.title,
      type: formData.type,
      category: formData.category,
      equipment: formData.equipment,
      description: formData.description,
      tags: formData.tags.length ? formData.tags : [formData.category.toLowerCase()],
      format: formData.format,
      format_units: formData.format_units,
      created_at: timestamp,
      availability: {
        source: ['local' as StorageSource],
        lastSynced: undefined
      }
    };

    onSubmit(exercise);
    
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
    
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetHeader>
        <SheetTitle>New Exercise</SheetTitle>
      </SheetHeader>
      <SheetContent>
        <ScrollView className="flex-1">
          <View className="gap-4 py-4">
            <View>
              <Text className="text-base font-medium mb-2">Exercise Name</Text>
              <Input
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="e.g., Barbell Back Squat"
                className="text-foreground"
              />
            </View>

            <View>
              <Text className="text-base font-medium mb-2">Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {EXERCISE_TYPES.map((type) => (
                  <Button
                    key={type}
                    variant={formData.type === type ? 'default' : 'outline'}
                    onPress={() => setFormData(prev => ({ ...prev, type }))}
                  >
                    <Text className={formData.type === type ? 'text-primary-foreground' : ''}>
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
                    variant={formData.category === category ? 'default' : 'outline'}
                    onPress={() => setFormData(prev => ({ ...prev, category }))}
                  >
                    <Text className={formData.category === category ? 'text-primary-foreground' : ''}>
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
                    variant={formData.equipment === eq ? 'default' : 'outline'}
                    onPress={() => setFormData(prev => ({ ...prev, equipment: eq }))}
                  >
                    <Text className={formData.equipment === eq ? 'text-primary-foreground' : ''}>
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
              variant='default'
              onPress={handleSubmit}
              disabled={!formData.title || !formData.equipment}
            >
              <Text className="text-primary-foreground font-semibold">Create Exercise</Text>
            </Button>
          </View>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}