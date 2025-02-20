// components/library/NewTemplateSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import { ChevronLeft, ChevronRight, Dumbbell, Clock, RotateCw, List } from 'lucide-react-native';

interface NewTemplateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: Template) => void;
}

// Steps in template creation
type CreationStep = 'type' | 'info' | 'exercises' | 'config' | 'review';

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
      <View className="gap-4 py-4">
        <Text className="text-base mb-4">Select the type of workout template you want to create:</Text>
        
        <View className="gap-3">
          {workoutTypes.map(workout => (
            <View key={workout.type} className="p-4 bg-card border border-border rounded-md">
              {workout.available ? (
                <TouchableOpacity 
                  onPress={() => onSelectType(workout.type)}
                  className="flex-row justify-between items-center"
                >
                  <View className="flex-row items-center gap-3">
                    <workout.icon size={24} className="text-foreground" />
                    <View className="flex-1">
                      <Text className="text-lg font-semibold">{workout.title}</Text>
                      <Text className="text-sm text-muted-foreground mt-1">
                        {workout.description}
                      </Text>
                    </View>
                  </View>
                  <View className="pl-2 pr-1">
                    <ChevronRight className="text-muted-foreground" size={20} />
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
        
        <Button variant="outline" onPress={onCancel} className="mt-4">
          <Text>Cancel</Text>
        </Button>
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
      <View className="gap-4 py-4">
        <View>
          <Text className="text-base font-medium mb-2">Workout Name</Text>
          <Input
            value={title}
            onChangeText={onTitleChange}
            placeholder="e.g., Full Body Strength"
            className="text-foreground"
          />
        </View>
        
        <View>
          <Text className="text-base font-medium mb-2">Description (Optional)</Text>
          <Textarea
            value={description}
            onChangeText={onDescriptionChange}
            placeholder="Describe this workout..."
            numberOfLines={4}
            className="bg-input placeholder:text-muted-foreground"
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
              >
                <Text className={category === cat ? 'text-primary-foreground' : ''}>
                  {cat}
                </Text>
              </Button>
            ))}
          </View>
        </View>
        
        <View className="flex-row justify-end gap-3 mt-4">
          <Button variant="outline" onPress={onCancel}>
            <Text>Cancel</Text>
          </Button>
          <Button onPress={onNext} disabled={!title}>
            <Text className="text-primary-foreground">Next</Text>
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
    const selected = exercises.filter(e => selectedIds.includes(e.id));
    onExercisesSelected(selected);
  };
  
  return (
    <View className="flex-1">
      <View className="px-4 pt-4 pb-2">
        <Input
          placeholder="Search exercises..."
          value={search}
          onChangeText={setSearch}
          className="text-foreground"
        />
      </View>
      
      <ScrollView className="flex-1">
        <View className="px-4">
          <Text className="mb-4 text-muted-foreground">
            Selected: {selectedIds.length} exercises
          </Text>
          
          <View className="gap-3">
            {filteredExercises.map(exercise => (
              <View key={exercise.id} className="p-4 bg-card border border-border rounded-md">
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
                  >
                    <Text className={selectedIds.includes(exercise.id) ? 'text-primary-foreground' : ''}>
                      {selectedIds.includes(exercise.id) ? 'Selected' : 'Add'}
                    </Text>
                  </Button>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      
      <View className="p-4 flex-row justify-between border-t border-border">
        <Button variant="outline" onPress={onBack}>
          <Text>Back</Text>
        </Button>
        <Button
          onPress={handleContinue}
          disabled={selectedIds.length === 0}
        >
          <Text className="text-primary-foreground">
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
  config: TemplateExerciseDisplay[];
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
        <View className="px-4 gap-3">
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
      
      <View className="p-4 flex-row justify-between border-t border-border">
        <Button variant="outline" onPress={onBack}>
          <Text>Back</Text>
        </Button>
        <Button onPress={onNext}>
          <Text className="text-primary-foreground">Review Template</Text>
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
  exercises: Template['exercises'];
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
      
      <View className="p-4 flex-row justify-between border-t border-border">
        <Button variant="outline" onPress={onBack}>
          <Text>Back</Text>
        </Button>
        <Button onPress={onSubmit}>
          <Text className="text-primary-foreground">Create Template</Text>
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
  const [configuredExercises, setConfiguredExercises] = useState<Template['exercises']>([]);

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
    
    // Pre-populate configured exercises
    const initialConfig = selected.map(exercise => ({
      title: exercise.title,
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
    
    onSubmit(newTemplate);
    onClose();
  };

  // Render different content based on current step
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

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetHeader>
        <View className="flex-row items-center">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onPress={handleGoBack}
            >
              <ChevronLeft className="text-foreground" size={20} />
            </Button>
          )}
          <SheetTitle>{getStepTitle()}</SheetTitle>
        </View>
      </SheetHeader>
      <SheetContent>
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}