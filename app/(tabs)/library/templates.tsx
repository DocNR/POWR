// app/(tabs)/library/templates.tsx
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
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
  toWorkoutTemplate 
} from '@/types/templates';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useTemplateService } from '@/components/DatabaseProvider';

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

// Initial templates - empty array
const initialTemplates: Template[] = [];

export default function TemplatesScreen() {
  const templateService = useTemplateService(); // Get the template service
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [templates, setTemplates] = useState(initialTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters);
  const [activeFilters, setActiveFilters] = useState(0);
  const { isActive, isMinimized } = useWorkoutStore();
  const shouldShowFAB = !isActive || !isMinimized;
  const [debugInfo, setDebugInfo] = useState('');
  
  // State for the modal template details
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  const handleDelete = (id: string) => {
    setTemplates(current => current.filter(t => t.id !== id));
  };

  const handleTemplatePress = (template: Template) => {
    // Just open the modal without navigating to a route
    setSelectedTemplateId(template.id);
    setShowTemplateModal(true);
  };

  const handleStartWorkout = async (template: Template) => {
    try {
      // Convert to WorkoutTemplate format
      const workoutTemplate = toWorkoutTemplate(template);
      
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
      
      // Update local state to reflect change
      setTemplates(current =>
        current.map(t =>
          t.id === template.id
            ? { ...t, isFavorite: !isFavorite }
            : t
        )
      );
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
    // Update local state to reflect change
    setTemplates(current =>
      current.map(t =>
        t.id === templateId
          ? { ...t, isFavorite }
          : t
      )
    );
  };

  const handleDebugDB = async () => {
    try {
      // Get all templates directly
      const allTemplates = await templateService.getAllTemplates(100);
      
      let info = "Database Stats:\n";
      info += "--------------\n";
      info += `Total templates: ${allTemplates.length}\n\n`;
      
      // Template list
      info += "Templates:\n";
      allTemplates.forEach(template => {
        info += `- ${template.title} (${template.id}) [${template.availability?.source[0] || 'unknown'}]\n`;
        info += `  Exercises: ${template.exercises.length}\n`;
      });
      
      setDebugInfo(info);
      console.log(info);
    } catch (error) {
      console.error('Debug error:', error);
      setDebugInfo(`Error: ${String(error)}`);
    }
  };

  // Load templates when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      async function loadTemplates() {
        try {
          console.log('[TemplateScreen] Loading templates...');
          
          // Load templates from the database
          const data = await templateService.getAllTemplates(100);
          
          console.log(`[TemplateScreen] Loaded ${data.length} templates from database`);
          
          // Convert to Template[] format that the screen expects
          const formattedTemplates: Template[] = [];
          
          for (const template of data) {
            // Get favorite status
            const isFavorite = useWorkoutStore.getState().checkFavoriteStatus(template.id);
            
            // Convert to Template format
            formattedTemplates.push({
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
            });
          }
          
          // Update the templates state
          setTemplates(formattedTemplates);
        } catch (error) {
          console.error('[TemplateScreen] Error loading templates:', error);
        }
      }
      
      loadTemplates();
      
      return () => {};
    }, [])
  );

  const handleAddTemplate = (template: Template) => {
    setTemplates(prev => [...prev, template]);
    setShowNewTemplate(false);
  };

  // Filter templates based on search and applied filters
  const filteredTemplates = templates.filter(template => {
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

      {/* Debug button */}
      <View className="p-2">
        <Button
          variant="outline"
          size="sm"
          onPress={handleDebugDB}
        >
          <Text className="text-xs">Debug Templates</Text>
        </Button>
      </View>

      {/* Debug info display */}
      {debugInfo ? (
        <View className="px-4 py-2 mx-4 mb-2 bg-primary/10 rounded-md">
          <ScrollView style={{ maxHeight: 150 }}>
            <Text className="font-mono text-xs">{debugInfo}</Text>
          </ScrollView>
        </View>
      ) : null}

      {/* Templates list */}
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
                No templates found. {templates.length > 0 ? 'Try changing your filters.' : 'Create a new workout template by clicking the + button.'}
              </Text>
            </View>
          )}
        </View>

        {/* Add some bottom padding for FAB */}
        <View className="h-20" />
      </ScrollView>

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