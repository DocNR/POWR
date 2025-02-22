// app/(tabs)/library/templates.tsx
import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react-native';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewTemplateSheet } from '@/components/library/NewTemplateSheet';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { TemplateDetails } from '@/components/templates/TemplateDetails';
import { 
  Template, 
  WorkoutTemplate,
  TemplateCategory,
  toWorkoutTemplate 
} from '@/types/templates';

const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'Full Body',
  'Push/Pull/Legs',
  'Upper/Lower',
  'Conditioning',
  'Custom'
];

// Mock data - move to a separate file later
const initialTemplates: Template[] = [
  {
    id: '1',
    title: 'Full Body Strength',
    type: 'strength',
    category: 'Full Body',
    exercises: [
      { title: 'Barbell Squat', targetSets: 3, targetReps: 8 },
      { title: 'Bench Press', targetSets: 3, targetReps: 8 },
      { title: 'Bent Over Row', targetSets: 3, targetReps: 8 }
    ],
    tags: ['strength', 'compound'],
    source: 'local',
    isFavorite: true
  },
  {
    id: '2',
    title: '20min EMOM',
    type: 'emom',
    category: 'Conditioning',
    exercises: [
      { title: 'Kettlebell Swings', targetSets: 1, targetReps: 15 },
      { title: 'Push-ups', targetSets: 1, targetReps: 10 },
      { title: 'Air Squats', targetSets: 1, targetReps: 20 }
    ],
    tags: ['conditioning', 'kettlebell'],
    source: 'powr',
    isFavorite: false
  }
];

export default function TemplatesScreen() {
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [templates, setTemplates] = useState(initialTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);

  const handleDelete = (id: string) => {
    setTemplates(current => current.filter(t => t.id !== id));
  };

  const handleTemplatePress = (template: Template) => {
    setSelectedTemplate(toWorkoutTemplate(template));
  };

  const handleStartWorkout = (template: Template) => {
    // TODO: Navigate to workout screen with template
    console.log('Starting workout with template:', template);
  };

  const handleFavorite = (template: Template) => {
    setTemplates(current =>
      current.map(t =>
        t.id === template.id
          ? { ...t, isFavorite: !t.isFavorite }
          : t
      )
    );
  };

  const handleAddTemplate = (template: Template) => {
    setTemplates(prev => [...prev, template]);
    setShowNewTemplate(false);
  };

  // Filter templates based on category and search
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = !activeCategory || template.category === activeCategory;
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Separate favorites and regular templates
  const favoriteTemplates = filteredTemplates.filter(t => t.isFavorite);
  const regularTemplates = filteredTemplates.filter(t => !t.isFavorite);

  return (
    <View className="flex-1 bg-background">
      {/* Search bar */}
      <View className="px-4 py-2">
        <View className="relative flex-row items-center bg-muted rounded-xl">
          <View className="absolute left-3 z-10">
            <Search size={18} className="text-muted-foreground" />
          </View>
          <Input
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search templates"
            className="pl-9 bg-transparent h-10 flex-1"
          />
        </View>
      </View>

      {/* Category filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className="px-4 py-2 border-b border-border"
      >
        <View className="flex-row gap-2">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onPress={() => setActiveCategory(null)}
          >
            <Text className={activeCategory === null ? "text-primary-foreground" : ""}>
              All
            </Text>
          </Button>
          {TEMPLATE_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onPress={() => setActiveCategory(activeCategory === category ? null : category)}
            >
              <Text className={activeCategory === category ? "text-primary-foreground" : ""}>
                {category}
              </Text>
            </Button>
          ))}
        </View>
      </ScrollView>

      {/* Templates list */}
      <ScrollView>
        {/* Favorites Section */}
        {favoriteTemplates.length > 0 && (
          <View>
            <Text className="text-lg font-semibold px-4 py-2">
              Favorites
            </Text>
            <View className="gap-3">
              {favoriteTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPress={() => handleTemplatePress(template)}
                  onDelete={handleDelete}
                  onFavorite={() => handleFavorite(template)}
                  onStartWorkout={() => handleStartWorkout(template)}
                />
              ))}
            </View>
          </View>
        )}

        {/* All Templates Section */}
        <View>
          <Text className="text-lg font-semibold px-4 py-2">
            All Templates
          </Text>
          {regularTemplates.length > 0 ? (
            <View className="gap-3">
              {regularTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPress={() => handleTemplatePress(template)}
                  onDelete={handleDelete}
                  onFavorite={() => handleFavorite(template)}
                  onStartWorkout={() => handleStartWorkout(template)}
                />
              ))}
            </View>
          ) : (
            <View className="px-4">
              <Text className="text-muted-foreground">
                No templates found. Create one by clicking the + button.
              </Text>
            </View>
          )}
        </View>

        {/* Add some bottom padding for FAB */}
        <View className="h-20" />
      </ScrollView>

      {/* Template Details with tabs */}
      {selectedTemplate && (
        <TemplateDetails
          template={selectedTemplate}
          open={!!selectedTemplate}
          onOpenChange={(open) => {
            if (!open) setSelectedTemplate(null);
          }}
        />
      )}

      <FloatingActionButton
        icon={Plus}
        onPress={() => setShowNewTemplate(true)}
      />

      <NewTemplateSheet 
        isOpen={showNewTemplate}
        onClose={() => setShowNewTemplate(false)}
        onSubmit={handleAddTemplate}
      />
    </View>
  );
}