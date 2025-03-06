// components/library/ExerciseSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, 
         Keyboard, Modal, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { generateId } from '@/utils/ids';
import { X } from 'lucide-react-native';
import { useColorScheme } from '@/lib/useColorScheme';
import { 
  BaseExercise, 
  ExerciseType, 
  ExerciseCategory, 
  Equipment,
  ExerciseFormat,
  ExerciseFormatUnits,
  ExerciseDisplay
} from '@/types/exercise';
import { StorageSource } from '@/types/shared';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { useNDKStore } from '@/lib/stores/ndk';
import { useExerciseService, usePublicationQueue } from '@/components/DatabaseProvider';

interface ExerciseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (exercise: BaseExercise) => void;
  exerciseToEdit?: ExerciseDisplay; // Optional - if provided, we're in edit mode
  mode?: 'create' | 'edit' | 'fork'; // Optional - defaults to 'create' or 'edit' based on exerciseToEdit
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

// Default empty form data
const DEFAULT_FORM_DATA = {
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
};

export function ExerciseSheet({ isOpen, onClose, onSubmit, exerciseToEdit, mode: explicitMode }: ExerciseSheetProps) {
  const { isDarkColorScheme } = useColorScheme();
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const ndkStore = useNDKStore();
  const publicationQueue = usePublicationQueue();
  
  // Determine if we're in edit, create, or fork mode
  const hasExercise = !!exerciseToEdit;
  const isNostrExercise = exerciseToEdit?.source === 'nostr';
  const isCurrentUserAuthor = isNostrExercise && 
    exerciseToEdit?.availability?.lastSynced?.nostr?.metadata?.pubkey === ndkStore.currentUser?.pubkey;
  
  // Use explicit mode if provided, otherwise determine based on context
  const mode = explicitMode || (hasExercise ? (isNostrExercise && !isCurrentUserAuthor ? 'fork' : 'edit') : 'create');
  
  const isEditMode = mode === 'edit';
  const isForkMode = mode === 'fork';

  // Load data from exerciseToEdit when in edit mode
  useEffect(() => {
    if (isOpen && exerciseToEdit) {
      setFormData({
        title: exerciseToEdit.title,
        type: exerciseToEdit.type,
        category: exerciseToEdit.category,
        equipment: exerciseToEdit.equipment,
        description: exerciseToEdit.description || '',
        tags: exerciseToEdit.tags || [],
        format: exerciseToEdit.format || DEFAULT_FORM_DATA.format,
        format_units: exerciseToEdit.format_units || DEFAULT_FORM_DATA.format_units
      });
    } else if (isOpen && !exerciseToEdit) {
      // Reset form when opening in create mode
      setFormData(DEFAULT_FORM_DATA);
    }
  }, [isOpen, exerciseToEdit]);

  // Reset form data when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Add a delay to ensure the closing animation completes first
      const timer = setTimeout(() => {
        setFormData(DEFAULT_FORM_DATA);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.equipment) return;
    
    const timestamp = Date.now();
    const isNostrExercise = exerciseToEdit?.source === 'nostr';
    const canEditNostr = isNostrExercise && isCurrentUserAuthor;
    
    // Create BaseExercise
    const exercise: BaseExercise = {
      // Generate new ID when forking, otherwise use existing or generate new
      id: isForkMode ? generateId() : (exerciseToEdit?.id || generateId()),
      title: formData.title,
      type: formData.type,
      category: formData.category,
      equipment: formData.equipment,
      description: formData.description,
      tags: formData.tags.length ? formData.tags : [formData.category.toLowerCase()],
      format: formData.format,
      format_units: formData.format_units,
      // Use current timestamp for fork, otherwise preserve original or use current
      created_at: isForkMode ? timestamp : (exerciseToEdit?.created_at || timestamp),
      // For forked exercises, create new local availability
      availability: isForkMode ? {
        source: ['local' as StorageSource],
        lastSynced: undefined
      } : (exerciseToEdit?.availability || {
        source: ['local' as StorageSource],
        lastSynced: undefined
      })
    };

    // If this is a Nostr exercise we can edit OR a new exercise while authenticated, 
    // we should create and possibly publish the Nostr event
    if ((canEditNostr || (!exerciseToEdit && ndkStore.isAuthenticated)) && !isForkMode) {
      try {
        // Create tags for the exercise
        const nostrTags = [
          ['d', exercise.id], // Use the same 'd' tag to make it replaceable
          ['title', exercise.title],
          ['type', exercise.type],
          ['category', exercise.category],
          ['equipment', exercise.equipment || ''],
          ...(exercise.tags.map(tag => ['t', tag])),
          // Format tags - handle possible undefined with null coalescing operator
          ['format', ...Object.keys(exercise.format || {}).filter(k => 
            exercise.format && exercise.format[k as keyof ExerciseFormat]
          )]
        ];

        // Add format units if they exist
        if (exercise.format_units) {
          const unitEntries = Object.entries(exercise.format_units);
          if (unitEntries.length > 0) {
            nostrTags.push(['format_units', ...unitEntries.flat()]);
          }
        }

        // Create and attempt to publish the event
        const event = new NDKEvent(ndkStore.ndk || undefined);
        event.kind = 33401; // Or whatever kind you need
        event.content = exercise.description || '';
        event.tags = nostrTags;
        await event.sign();

        if (event) {
          // Queue for publication (this will publish immediately if online)
          await publicationQueue.queueEvent(event);
          
          // If this is a new exercise, add nostr to sources
          if (!exerciseToEdit) {
            exercise.availability.source.push('nostr');
            
            // Add nostr metadata
            exercise.availability.lastSynced = {
              ...exercise.availability.lastSynced,
              nostr: {
                timestamp: Date.now(),
                metadata: {
                  id: event.id || exercise.id,
                  pubkey: ndkStore.currentUser?.pubkey || '',
                  relayUrl: 'wss://relay.damus.io', // Default relay
                  created_at: event.created_at || Math.floor(Date.now() / 1000)
                }
              }
            };
          }
          
          console.log(isEditMode ? 'Exercise updated on Nostr' : 'Exercise published to Nostr');
        }
      } catch (error) {
        console.error('Error with Nostr event:', error);
        // Continue with local update even if Nostr fails
      }
    }
    
    // Close first, then submit with a small delay
    onClose();
    setTimeout(() => {
      onSubmit(exercise);
    }, 50);
  };

  // Purple color used throughout the app
  const purpleColor = 'hsl(261, 90%, 66%)';

  // Get title and button text based on mode
  const getTitle = () => {
    if (isEditMode) return "Edit Exercise";
    if (isForkMode) return "Fork Exercise";
    return "Create New Exercise";
  };
  
  const getButtonText = () => {
    if (isEditMode) return "Update Exercise";
    if (isForkMode) return "Save as My Exercise";
    return "Create Exercise";
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
            <Text className="text-xl font-bold text-foreground">{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                  <View className="gap-5 py-5 px-4">
                    {/* Source badge for edit/fork mode */}
                    {(isEditMode || isForkMode) && (
                      <View className="flex-row mb-2 items-center gap-2">
                        <View className={`px-2 py-1 rounded-md ${exerciseToEdit?.source === 'nostr' ? 'bg-purple-100 dark:bg-purple-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                          <Text className={`text-xs ${exerciseToEdit?.source === 'nostr' ? 'text-purple-800 dark:text-purple-200' : 'text-blue-800 dark:text-blue-200'}`}>
                            {exerciseToEdit?.source === 'nostr' ? 'Nostr' : exerciseToEdit?.source}
                          </Text>
                        </View>
                        
                        {/* Show forked badge when in fork mode */}
                        {isForkMode && (
                          <View className="px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900">
                            <Text className="text-xs text-amber-800 dark:text-amber-200">
                              Creating Local Copy
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View>
                      <Text className="text-base font-medium mb-2">Exercise Name</Text>
                      <Input
                        value={formData.title}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                        placeholder="e.g., Barbell Back Squat"
                        className="text-foreground"
                      />
                      {!formData.title && (
                        <Text className="text-xs text-muted-foreground mt-1 ml-1">
                          * Required field
                        </Text>
                      )}
                    </View>

                    <View>
                      <Text className="text-base font-medium mb-2">Type</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {EXERCISE_TYPES.map((type) => (
                          <Button
                            key={type}
                            variant={formData.type === type ? 'default' : 'outline'}
                            onPress={() => setFormData(prev => ({ ...prev, type }))}
                            style={formData.type === type ? { backgroundColor: purpleColor } : {}}
                          >
                            <Text className={formData.type === type ? 'text-white' : ''}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
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
                            style={formData.category === category ? { backgroundColor: purpleColor } : {}}
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
                            variant={formData.equipment === eq ? 'default' : 'outline'}
                            onPress={() => setFormData(prev => ({ ...prev, equipment: eq }))}
                            style={formData.equipment === eq ? { backgroundColor: purpleColor } : {}}
                          >
                            <Text className={formData.equipment === eq ? 'text-white' : ''}>
                              {eq.charAt(0).toUpperCase() + eq.slice(1)}
                            </Text>
                          </Button>
                        ))}
                      </View>
                      {!formData.equipment && (
                        <Text className="text-xs text-muted-foreground mt-1 ml-1">
                          * Required field
                        </Text>
                      )}
                    </View>

                    <View>
                      <Text className="text-base font-medium mb-2">Description</Text>
                      <Input
                        value={formData.description}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                        placeholder="Exercise description..."
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        className="min-h-24 py-2"
                      />
                    </View>

                    <View>
                      <Text className="text-base font-medium mb-2">Tags</Text>
                      <Input
                        value={formData.tags.join(', ')}
                        onChangeText={(text) => {
                          const tags = text.split(',')
                            .map(tag => tag.trim())
                            .filter(tag => tag.length > 0);
                          setFormData(prev => ({ ...prev, tags }));
                        }}
                        placeholder="strength, compound, legs..."
                        className="text-foreground"
                      />
                      <Text className="text-xs text-muted-foreground mt-1 ml-1">
                        Separate tags with commas
                      </Text>
                    </View>

                    {/* Additional Nostr information */}
                    {exerciseToEdit?.source === 'nostr' && exerciseToEdit?.availability?.lastSynced?.nostr && (
                      <View className="mt-2 p-3 bg-muted rounded-md">
                        <Text className="text-sm text-muted-foreground">
                          Last synced with Nostr: {new Date(exerciseToEdit.availability.lastSynced.nostr.timestamp).toLocaleString()}
                        </Text>
                        
                        {isEditMode && !isCurrentUserAuthor && (
                          <Text className="text-xs text-amber-500 mt-1">
                            You're not the original author. Use the "Fork" option to create your own copy.
                          </Text>
                        )}
                        
                        {isEditMode && isCurrentUserAuthor && !ndkStore.isAuthenticated && (
                          <Text className="text-xs">
                            Changes will be saved locally and synced to Nostr when you're online and logged in.
                          </Text>
                        )}
                        
                        {isForkMode && (
                          <Text className="text-xs text-green-500 mt-1">
                            Creating a local copy of this exercise that you can customize
                          </Text>
                        )}
                        
                        {isNostrExercise && exerciseToEdit.availability.lastSynced.nostr.metadata.pubkey && (
                          <Text className="text-xs text-muted-foreground mt-1">
                            Author: {exerciseToEdit.availability.lastSynced.nostr.metadata.pubkey.substring(0, 8)}...
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>
                
                {/* Create/Update button at bottom */}
                <View className="p-4 border-t border-border">
                  {/* Show fork button when editing Nostr content we don't own */}
                  {isEditMode && isNostrExercise && !isCurrentUserAuthor ? (
                    <View className="flex-row gap-2">
                      <Button 
                        className="flex-1 py-5"
                        variant='outline'
                        onPress={onClose}
                      >
                        <Text>Cancel</Text>
                      </Button>
                      <Button 
                        className="flex-1 py-5"
                        variant='default'
                        onPress={() => {
                          // Close this modal and reopen in fork mode
                          onClose();
                          // This would be implemented in the parent component
                          // by reopening the modal with mode="fork"
                        }}
                        style={{ backgroundColor: purpleColor }}
                      >
                        <Text className="text-white font-semibold">
                          Fork Exercise
                        </Text>
                      </Button>
                    </View>
                  ) : (
                    // Regular submit button for create/edit/fork
                    <Button 
                      className="w-full py-5"
                      variant='default'
                      onPress={handleSubmit}
                      disabled={!formData.title || !formData.equipment}
                      style={(!formData.title || !formData.equipment) 
                        ? {} 
                        : { backgroundColor: purpleColor }}
                    >
                      <Text className={(!formData.title || !formData.equipment) 
                        ? 'text-white opacity-50' 
                        : 'text-white font-semibold'}>
                        {getButtonText()}
                      </Text>
                    </Button>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}