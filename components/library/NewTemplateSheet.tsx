// components/library/NewTemplateSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Template, 
  TemplateType, 
  TemplateCategory,
  TemplateExerciseDisplay 
} from '@/types/templates';
import { ExerciseDisplay } from '@/types/exercise';
import { generateId } from '@/utils/ids';
import { useSQLiteContext } from 'expo-sqlite';
import { LibraryService } from '@/lib/db/services/LibraryService';
import { ChevronLeft, Dumbbell, Clock, RotateCw, List, Search, X } from 'lucide-react-native';
import { useColorScheme } from '@/lib/theme/useColorScheme';

interface NewTemplateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: Template) => void;
}

// Steps in template creation
type CreationStep = 'type' | 'info' | 'exercises' | 'config' | 'review';

// Purple color used throughout the app
const purpleColor = 'hsl(261, 90%, 66%)';

// Enhanced template exercise display that includes the original exercise object
interface EnhancedTemplateExerciseDisplay extends TemplateExerciseDisplay {
  exercise: ExerciseDisplay;
}

// Step 0: Workout Type Selection
interface WorkoutTypeStepProps {
  onSelectType: (type: TemplateType) => void;
  onCancel: () => void;
}

function WorkoutTypeStep({ onSelectType, onCancel }: WorkoutTypeStepProps) {
  const workoutTypes = [
    {
      type: 'strength' as TemplateType,
      title: 'Strength Workout',
      description: 'Traditional sets and reps with rest periods',
      icon: Dumbbell,
      available: true
    },
    {
      type: 'circuit' as TemplateType,
      title: 'Circuit Training',
      description: 'Multiple exercises performed in sequence',
      icon: RotateCw,
      available: false
    },
    {
      type: 'emom' as TemplateType,
      title: 'EMOM Workout',
      description: 'Every Minute On the Minute timed exercises',
      icon: Clock,
      available: false
    },
    {
      type: 'amrap' as TemplateType,
      title: 'AMRAP Workout',
      description: 'As Many Rounds As Possible in a time cap',
      icon: List,
      available: false
    }
  ];

  return (
    <ScrollView className="flex-1">
      <View className="gap-4 py-4 px-4">
        <Text className="text-base mb-4">Select the type of workout template you want to create:</Text>
        
        <View className="gap-3">
          {workoutTypes.map(workout => (
            <View key={workout.type} className="p-4 bg-card border border-border rounded-md">
              {workout.available ? (
                <TouchableOpacity 
                  onPress={() => onSelectType(workout.type)}
                  className="flex-row justify-between items-center"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <workout.icon size={24} color={purpleColor} />
                    <View className="flex-1">
                      <Text className="text-lg font-semibold">{workout.title}</Text>
                      <Text className="text-sm text-muted-foreground mt-1">
                        {workout.description}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View>
                  <View className="flex-row items-center gap-3 opacity-70">
                    <workout.icon size={24} className="text-muted-foreground" />
                    <View className="flex-1">
                      <Text className="text-lg font-semibold">{workout.title}</Text>
                      <Text className="text-sm text-muted-foreground mt-1">
                        {workout.description}
                      </Text>
                    </View>
                  </View>
                  <View className="mt-3 opacity-70">
                    <Badge variant="outline" className="bg-muted self-start">
                      <Text className="text-xs">Coming Soon</Text>
                    </Badge>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// Step 1: Basic Info
interface BasicInfoStepProps {
  title: string;
  description: string;
  category: TemplateCategory;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onCategoryChange: (category: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

function BasicInfoStep({
  title,
  description,
  category,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onNext,
  onCancel
}: BasicInfoStepProps) {
  const categories: TemplateCategory[] = ['Full Body', 'Custom', 'Push/Pull/Legs', 'Upper/Lower', 'Conditioning'];
  
  return (
    <ScrollView className="flex-1">
      <View className="gap-4 py-4 px-4">
        <View>
          <Text className="text-base font-medium mb-2">Workout Name</Text>
          <Input
            value={title}
            onChangeText={onTitleChange}
            placeholder="e.g., Full Body Strength"
            className="text-foreground"
          />
          {!title && (
            <Text className="text-xs text-muted-foreground mt-1 ml-1">
              * Required field
            </Text>
          )}
        </View>
        
        <View>
          <Text className="text-base font-medium mb-2">Description (Optional)</Text>
          <Textarea
            value={description}
            onChangeText={onDescriptionChange}
            placeholder="Describe this workout..."
            numberOfLines={4}
            className="bg-input placeholder:text-muted-foreground min-h-24"
            textAlignVertical="top"
          />
        </View>
        
        <View>
          <Text className="text-base font-medium mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                onPress={() => onCategoryChange(cat)}
                style={category === cat ? { backgroundColor: purpleColor } : {}}
              >
                <Text className={category === cat ? 'text-white' : ''}>
                  {cat}
                </Text>
              </Button>
            ))}
          </View>
        </View>
        
        <View className="flex-row justify-end gap-3 mt-4">
          <Button 
            onPress={onNext} 
            disabled={!title}
            style={!title ? {} : { backgroundColor: purpleColor }}
          >
            <Text className={!title ? '' : 'text-white'}>Next</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

// Step 2: Exercise Selection
interface ExerciseSelectionStepProps {
  exercises: ExerciseDisplay[];
  onExercisesSelected: (selected: ExerciseDisplay[]) => void;
  onBack: () => void;
}

function ExerciseSelectionStep({
  exercises,
  onExercisesSelected,
  onBack
}: ExerciseSelectionStepProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  
  const filteredExercises = exercises.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );
  
  const handleToggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };
  
  const handleContinue = () => {
    // Get the full exercise objects with their original IDs
    const selected = exercises.filter(e => selectedIds.includes(e.id));
    onExercisesSelected(selected);
  };
  
  return (
    <View className="flex-1">
      <View className="px-4 pt-4 pb-2">
        <View className="relative">
          <View className="absolute left-3 h-full justify-center z-10">
            <Search size={18} className="text-muted-foreground" />
          </View>
          <Input
            placeholder="Search exercises..."
            value={search}
            onChangeText={setSearch}
            className="pl-10 bg-muted/50 border-0"
          />
        </View>
      </View>
      
      <ScrollView className="flex-1">
        <View className="px-4">
          <Text className="mb-4 text-muted-foreground">
            Selected: {selectedIds.length} exercises
          </Text>
          
          <View className="gap-3">
            {filteredExercises.map(exercise => (
              <TouchableOpacity 
                key={exercise.id} 
                onPress={() => handleToggleSelection(exercise.id)}
                activeOpacity={0.7}
              >
                <View 
                  className="p-4 bg-card border border-border rounded-md"
                  style={selectedIds.includes(exercise.id) ? { borderColor: purpleColor, borderWidth: 1.5 } : {}}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold">{exercise.title}</Text>
                      <Text className="text-sm text-muted-foreground mt-1">{exercise.category}</Text>
                      {exercise.equipment && (
                        <Text className="text-xs text-muted-foreground mt-0.5">{exercise.equipment}</Text>
                      )}
                    </View>
                    <Button
                      variant={selectedIds.includes(exercise.id) ? 'default' : 'outline'}
                      onPress={() => handleToggleSelection(exercise.id)}
                      size="sm"
                      style={selectedIds.includes(exercise.id) ? { backgroundColor: purpleColor } : {}}
                    >
                      <Text className={selectedIds.includes(exercise.id) ? 'text-white' : ''}>
                        {selectedIds.includes(exercise.id) ? 'Selected' : 'Add'}
                      </Text>
                    </Button>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            {filteredExercises.length === 0 && (
              <View className="items-center justify-center py-12">
                <Text className="text-muted-foreground">No exercises found</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      
      <View className="p-4 flex-row justify-between border-t border-border">
        <Button
          onPress={handleContinue}
          disabled={selectedIds.length === 0}
          style={selectedIds.length === 0 ? {} : { backgroundColor: purpleColor }}
          className="w-full"
        >
          <Text className={selectedIds.length === 0 ? '' : 'text-white'}>
            Continue with {selectedIds.length} Exercise{selectedIds.length !== 1 ? 's' : ''}
          </Text>
        </Button>
      </View>
    </View>
  );
}

// Step 3: Exercise Configuration
interface ExerciseConfigStepProps {
  exercises: ExerciseDisplay[];
  config: EnhancedTemplateExerciseDisplay[];
  onUpdateConfig: (index: number, sets: number, reps: number) => void;
  onNext: () => void;
  onBack: () => void;
}

function ExerciseConfigStep({
  exercises,
  config,
  onUpdateConfig,
  onNext,
  onBack
}: ExerciseConfigStepProps) {
  return (
    <View className="flex-1">
      <ScrollView className="flex-1">
        <View className="px-4 gap-3 py-4">
          {exercises.map((exercise, index) => (
            <View key={exercise.id} className="p-4 bg-card border border-border rounded-md">
              <Text className="text-lg font-semibold mb-2">{exercise.title}</Text>
              
              <View className="flex-row gap-4 mt-2">
                <View className="flex-1">
                  <Text className="text-sm text-muted-foreground mb-1">Sets</Text>
                  <Input
                    keyboardType="numeric"
                    value={config[index]?.targetSets ? config[index].targetSets.toString() : ''}
                    onChangeText={(text) => {
                      const sets = text ? parseInt(text) : 0;
                      const reps = config[index]?.targetReps || 0;
                      onUpdateConfig(index, sets, reps);
                    }}
                    placeholder="Optional"
                    className="bg-input placeholder:text-muted-foreground"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-muted-foreground mb-1">Reps</Text>
                  <Input
                    keyboardType="numeric"
                    value={config[index]?.targetReps ? config[index].targetReps.toString() : ''}
                    onChangeText={(text) => {
                      const reps = text ? parseInt(text) : 0;
                      const sets = config[index]?.targetSets || 0;
                      onUpdateConfig(index, sets, reps);
                    }}
                    placeholder="Optional"
                    className="bg-input placeholder:text-muted-foreground"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      
      <View className="p-4 border-t border-border">
        <Button 
          onPress={onNext}
          style={{ backgroundColor: purpleColor }}
          className="w-full"
        >
          <Text className="text-white">Review Template</Text>
        </Button>
      </View>
    </View>
  );
}

// Step 4: Review
interface ReviewStepProps {
  title: string;
  description: string;
  category: TemplateCategory;
  type: TemplateType;
  exercises: EnhancedTemplateExerciseDisplay[];
  onSubmit: () => void;
  onBack: () => void;
}

function ReviewStep({
  title,
  description,
  category,
  type,
  exercises,
  onSubmit,
  onBack
}: ReviewStepProps) {
  return (
    <View className="flex-1">
      <ScrollView className="flex-1">
        <View className="p-4 gap-6">
          <View className="mb-6">
            <Text className="text-xl font-bold">{title}</Text>
            {description ? (
              <Text className="mt-2 text-muted-foreground">{description}</Text>
            ) : null}
            <View className="flex-row gap-2 mt-3">
              <Badge variant="outline">
                <Text className="text-xs">{type}</Text>
              </Badge>
              <Badge variant="outline">
                <Text className="text-xs">{category}</Text>
              </Badge>
            </View>
          </View>
          
          <View>
            <Text className="text-lg font-semibold mb-4">Exercises</Text>
            <View className="gap-3">
              {exercises.map((exercise, index) => (
                <View key={index} className="p-4 bg-card border border-border rounded-md">
                  <Text className="text-lg font-semibold">{exercise.title}</Text>
                  <Text className="text-sm mt-1 text-muted-foreground">
                    {exercise.targetSets || exercise.targetReps ? 
                      `${exercise.targetSets || '–'} sets × ${exercise.targetReps || '–'} reps` :
                      'No prescription set'
                    }
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View className="p-4 border-t border-border">
        <Button 
          onPress={onSubmit}
          style={{ backgroundColor: purpleColor }}
          className="w-full"
        >
          <Text className="text-white">Create Template</Text>
        </Button>
      </View>
    </View>
  );
}

export function NewTemplateSheet({ isOpen, onClose, onSubmit }: NewTemplateSheetProps) {
  const db = useSQLiteContext();
  const [libraryService] = useState(() => new LibraryService(db));
  const [step, setStep] = useState<CreationStep>('type');
  const [workoutType, setWorkoutType] = useState<TemplateType>('strength');
  const [exercises, setExercises] = useState<ExerciseDisplay[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<ExerciseDisplay[]>([]);
  const [configuredExercises, setConfiguredExercises] = useState<EnhancedTemplateExerciseDisplay[]>([]);
  const { isDarkColorScheme } = useColorScheme();

  // Template info
  const [templateInfo, setTemplateInfo] = useState<{
    title: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
  }>({
    title: '',
    description: '',
    category: 'Full Body',
    tags: ['strength']
  });

  // Load exercises on mount
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const data = await libraryService.getExercises();
        setExercises(data);
      } catch (error) {
        console.error('Failed to load exercises:', error);
      }
    };
    
    if (isOpen) {
      loadExercises();
    }
  }, [isOpen, libraryService]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      // Add a delay to ensure the closing animation completes first
      const timer = setTimeout(() => {
        setStep('type');
        setWorkoutType('strength');
        setSelectedExercises([]);
        setConfiguredExercises([]);
        setTemplateInfo({
          title: '',
          description: '',
          category: 'Full Body',
          tags: ['strength']
        });
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleGoBack = () => {
    switch(step) {
      case 'info': setStep('type'); break;
      case 'exercises': setStep('info'); break;
      case 'config': setStep('exercises'); break;
      case 'review': setStep('config'); break;
    }
  };

  const handleSelectType = (type: TemplateType) => {
    setWorkoutType(type);
    setStep('info');
  };

  const handleSubmitInfo = () => {
    if (!templateInfo.title) return;
    setStep('exercises');
  };

  const handleSelectExercises = (selected: ExerciseDisplay[]) => {
    setSelectedExercises(selected);
    
    // Pre-populate configured exercises with full exercise objects
    const initialConfig = selected.map(exercise => ({
      title: exercise.title,
      exercise: exercise, // Store the complete exercise object with its original ID
      targetSets: 0,
      targetReps: 0
    }));
    
    setConfiguredExercises(initialConfig);
    setStep('config');
  };

  const handleUpdateExerciseConfig = (index: number, sets: number, reps: number) => {
    setConfiguredExercises(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        targetSets: sets,
        targetReps: reps
      };
      return updated;
    });
  };

  const handleConfigComplete = () => {
    setStep('review');
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: generateId(),
      title: templateInfo.title,
      description: templateInfo.description,
      type: workoutType,
      category: templateInfo.category,
      exercises: configuredExercises,
      tags: templateInfo.tags,
      source: 'local',
      isFavorite: false
    };
    
    // Close first, then submit with a small delay
    onClose();
    setTimeout(() => {
      onSubmit(newTemplate);
    }, 50);
  };

  // Get title based on current step
  const getStepTitle = () => {
    switch (step) {
      case 'type': return 'Select Workout Type';
      case 'info': return `New ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1)} Workout`;
      case 'exercises': return 'Select Exercises';
      case 'config': return 'Configure Exercises';
      case 'review': return 'Review Template';
    }
  };

  // Show back button for all steps except the first
  const showBackButton = step !== 'type';

  // Render content based on current step
  const renderContent = () => {
    switch (step) {
      case 'type':
        return (
          <WorkoutTypeStep
            onSelectType={handleSelectType}
            onCancel={onClose}
          />
        );
        
      case 'info':
        return (
          <BasicInfoStep
            title={templateInfo.title}
            description={templateInfo.description}
            category={templateInfo.category}
            onTitleChange={(title) => setTemplateInfo(prev => ({ ...prev, title }))}
            onDescriptionChange={(description) => setTemplateInfo(prev => ({ ...prev, description }))}
            onCategoryChange={(category) => setTemplateInfo(prev => ({ ...prev, category: category as TemplateCategory }))}
            onNext={handleSubmitInfo}
            onCancel={onClose}
          />
        );
      
      case 'exercises':
        return (
          <ExerciseSelectionStep
            exercises={exercises}
            onExercisesSelected={handleSelectExercises}
            onBack={() => setStep('info')}
          />
        );
      
      case 'config':
        return (
          <ExerciseConfigStep
            exercises={selectedExercises}
            config={configuredExercises}
            onUpdateConfig={handleUpdateExerciseConfig}
            onNext={handleConfigComplete}
            onBack={() => setStep('exercises')}
          />
        );
      
      case 'review':
        return (
          <ReviewStep
            title={templateInfo.title}
            description={templateInfo.description}
            category={templateInfo.category}
            type={workoutType}
            exercises={configuredExercises}
            onSubmit={handleCreateTemplate}
            onBack={() => setStep('config')}
          />
        );
    }
  };

  // Return null if not open
  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View 
          className={`bg-background ${isDarkColorScheme ? 'bg-card border border-border' : ''} rounded-lg w-[95%] h-[85%] max-w-xl shadow-xl overflow-hidden`}
          style={{ maxHeight: 700 }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <View className="flex-row items-center">
              {showBackButton && (
                <TouchableOpacity 
                  onPress={handleGoBack}
                  className="mr-2 p-1"
                >
                  <ChevronLeft size={24} />
                </TouchableOpacity>
              )}
              <Text className="text-xl font-bold text-foreground">{getStepTitle()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View className="flex-1">
            {renderContent()}
          </View>
        </View>
      </View>
    </Modal>
  );
}
