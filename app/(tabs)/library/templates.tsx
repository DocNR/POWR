// app/(tabs)/library/templates.tsx
import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Plus, ListFilter } from 'lucide-react-native';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewTemplateSheet } from '@/components/library/NewTemplateSheet';
import { FilterSheet, type FilterOptions, type SourceType } from '@/components/library/FilterSheet';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { ModalTemplateDetails } from '@/components/templates/ModalTemplateDetails';
import { Button } from '@/components/ui/button';
import { 
  Template, 
  TemplateCategory,
  TemplateExerciseConfig,
  TemplateExerciseDisplay,
  toWorkoutTemplate 
} from '@/types/templates';
import { generateId } from '@/utils/ids';
import { ExerciseDisplay } from '@/types/exercise';

// Enhanced template exercise display that includes the original exercise object
interface EnhancedTemplateExerciseDisplay {
  title: string;
  targetSets: number;
  targetReps: number;
  equipment?: string;
  notes?: string;
  exercise: ExerciseDisplay;
}
import { useWorkoutStore } from '@/stores/workoutStore';
import { useTemplates } from '@/lib/hooks/useTemplates';
import { useIconColor } from '@/lib/theme/iconUtils';
import { useLibraryStore } from '@/lib/stores/libraryStore';

// Default available filters
const availableFilters = {
  equipment: ['Barbell', 'Dumbbell', 'Bodyweight', 'Machine', 'Cables', 'Other'],
  tags: ['Strength', 'Cardio', 'Mobility', 'Recovery'],
  source: ['local', 'powr', 'nostr'] as SourceType[]
};

// Initial filter state
const initialFilters: FilterOptions = {
  equipment: [],
  tags: [],
  source: []
};

export default function TemplatesScreen() {
  // State for UI elements
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters);
  const [activeFilters, setActiveFilters] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  
  // State for the modal template details
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Hooks
  const { getIconProps } = useIconColor();
  const { isActive, isMinimized } = useWorkoutStore();
  const { 
    templates,
    loading,
    error,
    silentRefresh,
    refreshTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate
  } = useTemplates();
  
  // Check if floating action button should be shown
  const shouldShowFAB = !isActive || !isMinimized;

  // Convert WorkoutTemplates to Template format for the UI
  const formattedTemplates = React.useMemo(() => {
    return templates.map(template => {
      // Get favorite status
      const isFavorite = useWorkoutStore.getState().checkFavoriteStatus(template.id);
      
      // Convert to Template format for the UI
      return {
        id: template.id,
        title: template.title,
        type: template.type,
        category: template.category,
        exercises: template.exercises.map(ex => ({
          title: ex.exercise.title,
          targetSets: ex.targetSets || 0,
          targetReps: ex.targetReps || 0,
          equipment: ex.exercise.equipment
        })),
        tags: template.tags || [],
        source: template.availability?.source[0] || 'local',
        isFavorite
      };
    });
  }, [templates]);

  // Refresh templates when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // This will refresh without showing loading indicators if possible
      silentRefresh();
      return () => {};
    }, [silentRefresh])
  );

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleTemplatePress = (template: Template) => {
    // Just open the modal without navigating to a route
    setSelectedTemplateId(template.id);
    setShowTemplateModal(true);
  };

  const handleStartWorkout = async (template: Template) => {
    try {
      // Start the workout - use the template ID
      await useWorkoutStore.getState().startWorkoutFromTemplate(template.id);
      
      // Navigate to the active workout screen
      router.push('/(workout)/create');
    } catch (error) {
      console.error("Error starting workout:", error);
    }
  };

  const handleFavorite = async (template: Template) => {
    try {
      const workoutTemplate = toWorkoutTemplate(template);
      const isFavorite = useWorkoutStore.getState().checkFavoriteStatus(template.id);
      
      if (isFavorite) {
        await useWorkoutStore.getState().removeFavorite(template.id);
      } else {
        await useWorkoutStore.getState().addFavorite(workoutTemplate);
      }
      
      // Add this line to trigger a refresh after favorite toggle
      useLibraryStore.getState().refreshTemplates();
    } catch (error) {
      console.error('Error toggling favorite status:', error);
    }
  };

  const handleApplyFilters = (filters: FilterOptions) => {
    setCurrentFilters(filters);
    const totalFilters = Object.values(filters).reduce(
      (acc, curr) => acc + curr.length, 
      0
    );
    setActiveFilters(totalFilters);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowTemplateModal(false);
  };

  // Handle favorite change from modal
  const handleModalFavoriteChange = (templateId: string, isFavorite: boolean) => {
    // The templates will be refreshed automatically through the store
  };

  const handleAddTemplate = (template: Template) => {
    // The template exercises should already have the exercise property from NewTemplateSheet
    // We know the exercises have the exercise property because we modified NewTemplateSheet
    const enhancedExercises = template.exercises as unknown as EnhancedTemplateExerciseDisplay[];
    
    // Convert UI Template to WorkoutTemplate, but preserve exercise IDs
    const baseWorkoutTemplate = toWorkoutTemplate(template);
    
    // Modify the exercises to use the original exercise objects with their IDs
    const workoutTemplate = {
      ...baseWorkoutTemplate,
      exercises: enhancedExercises.map(ex => {
        // Create a proper TemplateExerciseConfig object
        const config: TemplateExerciseConfig = {
          id: generateId(), // ID for the template_exercise relationship
          exercise: ex.exercise, // Use the original exercise object with its ID
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          notes: ex.notes
        };
        return config;
      })
    };
    
    // Create the template
    createTemplate(workoutTemplate);
    
    // Close the sheet
    setShowNewTemplate(false);
  };

  // Filter templates based on search and applied filters
  const filteredTemplates = formattedTemplates.filter(template => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by equipment if any selected
    const matchesEquipment = currentFilters.equipment.length === 0 || 
      (template.exercises && template.exercises.some(ex => 
        currentFilters.equipment.includes(ex.equipment || '')
      ));
    
    // Filter by tags if any selected
    const matchesTags = currentFilters.tags.length === 0 ||
      (template.tags && template.tags.some(tag => 
        currentFilters.tags.includes(tag)
      ));
    
    // Filter by source if any selected
    const matchesSource = currentFilters.source.length === 0 ||
      currentFilters.source.includes(template.source as SourceType);
    
    return matchesSearch && matchesEquipment && matchesTags && matchesSource;
  });

  // Separate favorites and regular templates
  const favoriteTemplates = filteredTemplates.filter(t => t.isFavorite);
  const regularTemplates = filteredTemplates.filter(t => !t.isFavorite);

  return (
    <View className="flex-1 bg-background">
      {/* Search bar with filter button */}
      <View className="px-4 py-2 border-b border-border">
        <View className="flex-row items-center">
          <View className="relative flex-1">
            <View className="absolute left-3 z-10 h-full justify-center">
              <Search size={18} className="text-muted-foreground" />
            </View>
            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search templates"
              className="pl-9 pr-10 bg-muted/50 border-0"
            />
            <View className="absolute right-2 z-10 h-full justify-center">
              <Button 
                variant="ghost" 
                size="icon"
                onPress={() => setFilterSheetOpen(true)}
              >
                <View className="relative">
                  <ListFilter className="text-muted-foreground" size={20} />
                  {activeFilters > 0 && (
                    <View className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f7931a' }} />
                  )}
                </View>
              </Button>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Sheet */}
      <FilterSheet 
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        options={currentFilters}
        onApplyFilters={handleApplyFilters}
        availableFilters={availableFilters}
      />

      {/* Templates list with loading state */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" className="mb-2" />
          <Text className="text-muted-foreground">Loading templates...</Text>
        </View>
      ) : (
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
                    onDelete={() => handleDelete(template.id)}
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
                    onDelete={() => handleDelete(template.id)}
                    onFavorite={() => handleFavorite(template)}
                    onStartWorkout={() => handleStartWorkout(template)}
                  />
                ))}
              </View>
            ) : (
              <View className="px-4">
                <Text className="text-muted-foreground">
                  {formattedTemplates.length > 0 
                    ? 'No templates match your current filters.' 
                    : 'No templates found. Create a new workout template by clicking the + button.'}
                </Text>
              </View>
            )}
          </View>

          {/* Add some bottom padding for FAB */}
          <View className="h-20" />
        </ScrollView>
      )}

      {shouldShowFAB && (
        <FloatingActionButton
          icon={Plus}
          onPress={() => setShowNewTemplate(true)}
        />
      )}

      {/* Template Details Modal */}
      <ModalTemplateDetails
        templateId={selectedTemplateId || ''}
        open={showTemplateModal}
        onClose={handleModalClose}
        onFavoriteChange={handleModalFavoriteChange}
      />

      {/* New Template Sheet */}
      <NewTemplateSheet 
        isOpen={showNewTemplate}
        onClose={() => setShowNewTemplate(false)}
        onSubmit={handleAddTemplate}
      />
    </View>
  );
}
