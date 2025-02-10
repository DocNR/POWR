// components/library/NewTemplateSheet.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { generateId } from '@/utils/ids';
import { TemplateType, TemplateCategory } from '@/types/library';
import { cn } from '@/lib/utils';

interface NewTemplateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: Template) => void;
}

const WORKOUT_TYPES: TemplateType[] = ['strength', 'circuit', 'emom', 'amrap'];

const CATEGORIES: TemplateCategory[] = [
  'Full Body',
  'Upper/Lower',
  'Push/Pull/Legs',
  'Cardio',
  'CrossFit',
  'Strength',
  'Conditioning',
  'Custom'
];

export function NewTemplateSheet({ isOpen, onClose, onSubmit }: NewTemplateSheetProps) {
  const [formData, setFormData] = React.useState({
    title: '',
    type: '' as TemplateType,
    category: '' as TemplateCategory,
    description: '',
  });

  const handleSubmit = () => {
    const template: Template = {
      id: generateId(),
      title: formData.title,
      type: formData.type,
      category: formData.category,
      description: formData.description,
      exercises: [],
      tags: [],
      source: 'local',
      isFavorite: false,
      created_at: Date.now(),
    };

    onSubmit(template);
    onClose();
    setFormData({
      title: '',
      type: '' as TemplateType,
      category: '' as TemplateCategory,
      description: '',
    });
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetHeader>
        <SheetTitle>New Template</SheetTitle>
      </SheetHeader>
      <SheetContent>
        <View className="gap-4">
          <View>
            <Text className="text-base font-medium mb-2">Template Name</Text>
            <Input
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="e.g., Full Body Strength"
            />
          </View>

          <View>
            <Text className="text-base font-medium mb-2">Workout Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {WORKOUT_TYPES.map((type) => (
                <Button
                  key={type}
                  variant={formData.type === type ? 'purple' : 'outline'}
                  onPress={() => setFormData(prev => ({ ...prev, type }))}
                >
                  <Text 
                    className={cn(
                      "text-base font-medium capitalize",
                      formData.type === type ? "text-white" : "text-foreground"
                    )}
                  >
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
                  <Text 
                    className={cn(
                      "text-base font-medium",
                      formData.category === category ? "text-white" : "text-foreground"
                    )}
                  >
                    {category}
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
              placeholder="Template description..."
              multiline
              numberOfLines={4}
            />
          </View>

          <Button 
            variant="purple"
            className="mt-4"
            onPress={handleSubmit}
            disabled={!formData.title || !formData.type || !formData.category}
          >
            <Text className="text-white font-semibold">Create Template</Text>
          </Button>
        </View>
      </SheetContent>
    </Sheet>
  );
}