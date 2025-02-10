// app/(tabs)/library/templates.tsx
import { View, ScrollView } from 'react-native';
import { useState, useCallback } from 'react';
import { Text } from '@/components/ui/text';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { SearchHeader } from '@/components/library/SearchHeader';
import { FilterSheet } from '@/components/library/FilterSheet';
import { NewTemplateSheet } from '@/components/library/NewTemplateSheet';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Template, FilterOptions, ContentSource, ExerciseEquipment } from '@/types/library';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    equipment: [],
    tags: [],
    source: []
  });
  const [templates, setTemplates] = useState(initialTemplates);

  const availableFilters = {
    equipment: ['barbell', 'dumbbell', 'bodyweight', 'machine', 'cable', 'other'] as ExerciseEquipment[],
    tags: ['strength', 'circuit', 'emom', 'amrap', 'Full Body', 'Upper Body', 'Lower Body', 'Conditioning'],
    source: ['local', 'powr', 'nostr'] as ContentSource[]
  };

  const filteredTemplates = useCallback(() => {
    return templates.filter(template => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (!template.title.toLowerCase().includes(searchLower) &&
            !template.exercises.some(ex => 
              ex.title.toLowerCase().includes(searchLower)
            )) {
          return false;
        }
      }

      // Tags filter (includes type and category)
      if (filterOptions.tags.length > 0) {
        if (!filterOptions.tags.includes(template.type) &&
            !filterOptions.tags.includes(template.category) &&
            !template.tags.some(tag => filterOptions.tags.includes(tag))) {
          return false;
        }
      }

      // Source filter
      if (filterOptions.source.length > 0) {
        if (!filterOptions.source.includes(template.source)) {
          return false;
        }
      }

      return true;
    });
  }, [templates, searchQuery, filterOptions]);

  const activeFilterCount = Object.values(filterOptions)
    .reduce((count, filters) => count + filters.length, 0);

  const handleDelete = (id: string) => {
    setTemplates(current => current.filter(t => t.id !== id));
  };

  const handleTemplatePress = (template: Template) => {
    // TODO: Show template details
    console.log('Selected template:', template);
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

  // Separate favorites and regular templates
  const favoriteTemplates = templates.filter(t => t.isFavorite);
  const regularTemplates = templates.filter(t => !t.isFavorite);

  return (
    <View className="flex-1 bg-background">
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilters={activeFilterCount}
        onOpenFilters={() => setShowFilters(true)}
      />
      
      <ScrollView className="flex-1">
        {/* Favorites Section */}
        {favoriteTemplates.length > 0 && (
          <View className="py-4">
            <Text className="text-lg font-semibold mb-4 px-4">
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
        <View className="py-4">
          <Text className="text-lg font-semibold mb-4 px-4">
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

      <FloatingActionButton
        icon={Plus}
        onPress={() => setShowNewTemplate(true)}
      />

      <NewTemplateSheet 
        isOpen={showNewTemplate}
        onClose={() => setShowNewTemplate(false)}
        onSubmit={handleAddTemplate}
      />

      <FilterSheet
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        options={filterOptions}
        onApplyFilters={setFilterOptions}
        availableFilters={availableFilters}
      />
    </View>
  );
}