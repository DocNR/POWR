// components/workout/WorkoutCompletionFlow.tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useNDK, useNDKCurrentUser } from '@/lib/hooks/useNDK';
import { WorkoutCompletionOptions } from '@/types/workout';
import { 
  Shield, 
  Lock, 
  FileText,
  Clock,
  Dumbbell,
  Trophy,
  Cog
} from 'lucide-react-native';
import { TemplateService } from '@/lib/db/services/TemplateService';
import Confetti from '@/components/Confetti';

/**
 * Workout Completion Flow Component
 * 
 * This component manages the multi-step process of completing a workout:
 * 1. Storage Options - How the workout data should be stored (local/published)
 * 2. Summary - Displaying workout statistics before finalizing
 * 3. Celebration - Confirming completion and providing sharing options
 * 
 * Key features:
 * - Step-based navigation with back/next functionality
 * - Nostr sharing options for completed workouts
 * - Template management options if workout was based on a template
 * 
 * This component handles UI state and user input, but delegates the actual
 * workout completion to the parent component via the onComplete callback.
 * The Nostr publishing happens in the WorkoutStore after receiving the
 * selected options from this flow.
 */

// Storage options component
function StorageOptionsTab({ 
  options, 
  setOptions, 
  onNext 
}: { 
  options: WorkoutCompletionOptions, 
  setOptions: (options: WorkoutCompletionOptions) => void,
  onNext: () => void
}) {
  const { isAuthenticated } = useNDKCurrentUser();
  
  // Handle storage option selection
  const handleStorageOptionSelect = (value: 'local_only' | 'publish_complete' | 'publish_limited') => {
    setOptions({
      ...options,
      storageType: value
    });
  };
  
  // Handle template action selection
  const handleTemplateAction = (value: 'keep_original' | 'update_existing' | 'save_as_new') => {
    setOptions({
      ...options,
      templateAction: value
    });
  };
  
  // Purple color used throughout the app
  const purpleColor = 'hsl(261, 90%, 66%)';
  
  // Check if the workout is based on a template
  const { activeWorkout } = useWorkoutStore();
  
  // Use a try-catch block for more resilience
  let hasTemplateChanges = false;
  try {
    if (activeWorkout && activeWorkout.templateId) {
      hasTemplateChanges = TemplateService.hasTemplateChanges(activeWorkout);
    }
  } catch (error) {
    console.error('Error checking template changes:', error);
  }
  
  return (
    <ScrollView className="flex-1 px-2">
      <View className="py-4 gap-6">
        <Text className="text-lg font-semibold text-foreground">Storage Options</Text>
        <Text className="text-muted-foreground">
          Choose how you want to store your workout data
        </Text>
        
        {/* Local only option */}
        <TouchableOpacity 
          onPress={() => handleStorageOptionSelect('local_only')}
          activeOpacity={0.7}
        >
          <Card 
            style={options.storageType === 'local_only' ? { 
              borderColor: purpleColor,
              borderWidth: 1.5,
            } : {}}
          >
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-muted items-center justify-center">
                  <Lock size={20} className="text-muted-foreground" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground">Local Only</Text>
                  <Text className="text-sm text-muted-foreground">
                    Keep workout data private on this device
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </TouchableOpacity>
        
        {/* Publish complete option */}
        {isAuthenticated && (
          <TouchableOpacity 
            onPress={() => handleStorageOptionSelect('publish_complete')}
            activeOpacity={0.7}
          >
            <Card 
              style={options.storageType === 'publish_complete' ? { 
                borderColor: purpleColor,
                borderWidth: 1.5,
              } : {}}
            >
              <CardContent className="p-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-muted items-center justify-center">
                    <FileText size={20} className="text-muted-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">Publish Complete</Text>
                    <Text className="text-sm text-muted-foreground">
                      Publish full workout data to Nostr network
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        )}
        
        {/* Limited metrics option */}
        {isAuthenticated && (
          <TouchableOpacity 
            onPress={() => handleStorageOptionSelect('publish_limited')}
            activeOpacity={0.7}
          >
            <Card 
              style={options.storageType === 'publish_limited' ? { 
                borderColor: purpleColor,
                borderWidth: 1.5,
              } : {}}
            >
              <CardContent className="p-4">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-muted items-center justify-center">
                    <Shield size={20} className="text-muted-foreground" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-foreground">Limited Metrics</Text>
                    <Text className="text-sm text-muted-foreground">
                      Publish workout with limited metrics for privacy
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TouchableOpacity>
        )}
        
        {/* Template options section - only if needed */}
        {hasTemplateChanges && (
          <>
            <Separator className="my-2" />
            
            <Text className="text-lg font-semibold text-foreground">Template Options</Text>
            <Text className="text-muted-foreground">
              Your workout includes modifications to the original template
            </Text>
            
            {/* Keep original option */}
            <TouchableOpacity 
              onPress={() => handleTemplateAction('keep_original')}
              activeOpacity={0.7}
            >
              <Card 
                style={options.templateAction === 'keep_original' ? { 
                  borderColor: purpleColor,
                  borderWidth: 1.5,
                } : {}}
              >
                <CardContent className="p-4">
                  <View>
                    <Text className="font-medium text-foreground">Keep Original</Text>
                    <Text className="text-sm text-muted-foreground">
                      Don't update the template
                    </Text>
                  </View>
                </CardContent>
              </Card>
            </TouchableOpacity>
            
            {/* Update existing option */}
            <TouchableOpacity 
              onPress={() => handleTemplateAction('update_existing')}
              activeOpacity={0.7}
            >
              <Card 
                style={options.templateAction === 'update_existing' ? { 
                  borderColor: purpleColor,
                  borderWidth: 1.5,
                } : {}}
              >
                <CardContent className="p-4">
                  <View>
                    <Text className="font-medium text-foreground">Update Template</Text>
                    <Text className="text-sm text-muted-foreground">
                      Save these changes to the original template
                    </Text>
                  </View>
                </CardContent>
              </Card>
            </TouchableOpacity>
            
            {/* Save as new option */}
            <TouchableOpacity 
              onPress={() => handleTemplateAction('save_as_new')}
              activeOpacity={0.7}
            >
              <Card 
                style={options.templateAction === 'save_as_new' ? { 
                  borderColor: purpleColor,
                  borderWidth: 1.5,
                } : {}}
              >
                <CardContent className="p-4">
                  <View>
                    <Text className="font-medium text-foreground">Save as New</Text>
                    <Text className="text-sm text-muted-foreground">
                      Create a new template from this workout
                    </Text>
                  </View>
                </CardContent>
              </Card>
            </TouchableOpacity>
            
            {/* Template name input if save as new is selected */}
            {options.templateAction === 'save_as_new' && (
              <View className="mt-2 mb-4">
                <Text className="text-sm mb-2">New template name:</Text>
                <Input
                  placeholder="My Custom Template"
                  value={options.newTemplateName || activeWorkout?.title || ''}
                  onChangeText={(text) => setOptions({
                    ...options,
                    newTemplateName: text
                  })}
                />
              </View>
            )}
          </>
        )}
        
        {/* Next button */}
        <Button 
          onPress={onNext}
          className="w-full mb-6"
          style={{ backgroundColor: purpleColor }}
        >
          <Text className="text-white font-medium">
            Next
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
}

// Summary component
function SummaryTab({
  options,
  onBack,
  onFinish
}: {
  options: WorkoutCompletionOptions,
  onBack: () => void,
  onFinish: () => void
}) {
  const { activeWorkout } = useWorkoutStore();
  
  // Helper functions
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return hours > 0
      ? `${hours}h ${minutes % 60}m`
      : `${minutes}m ${seconds % 60}s`;
  };
  
  // Get workout duration using timestamps
  const getDuration = (): number => {
    if (!activeWorkout || !activeWorkout.endTime) return 0;
    return activeWorkout.endTime - activeWorkout.startTime;
  };
  
  const getTotalSets = (): number => {
    return activeWorkout?.exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0
    ) || 0;
  };
  
  const getCompletedSets = (): number => {
    return activeWorkout?.exercises.reduce(
      (total, exercise) => total + exercise.sets.filter(set => set.isCompleted).length,
      0
    ) || 0;
  };
  
  // Calculate volume
  const getTotalVolume = (): number => {
    return activeWorkout?.exercises.reduce(
      (total, exercise) => 
        total + exercise.sets.reduce(
          (setTotal, set) => setTotal + ((set.weight || 0) * (set.reps || 0)),
          0
        ),
      0
    ) || 0;
  };
  
  // Mock PRs - in a real app, you'd compare with previous workouts
  const mockPRs = [
    { exercise: "Bench Press", value: "80kg × 8 reps", previous: "75kg × 8 reps" },
    { exercise: "Squat", value: "120kg × 5 reps", previous: "110kg × 5 reps" }
  ];
  
  // Purple color used throughout the app
  const purpleColor = 'hsl(261, 90%, 66%)';
  
  return (
    <ScrollView className="flex-1 px-2">
      <View className="py-4 gap-6">
        <Text className="text-lg font-semibold text-foreground">Workout Summary</Text>
        
        <View className="gap-4">
          {/* Duration card */}
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3 mb-2">
                <Clock size={18} className="text-muted-foreground" />
                <Text className="font-medium text-foreground">Duration</Text>
              </View>
              <Text className="text-xl font-semibold text-foreground">
                {formatDuration(getDuration())}
              </Text>
            </CardContent>
          </Card>
          
          {/* Exercise stats card */}
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3 mb-2">
                <Dumbbell size={18} className="text-muted-foreground" />
                <Text className="font-medium text-foreground">Exercises</Text>
              </View>
              <View className="gap-3">
                <View className="flex-row justify-between">
                  <Text className="text-base text-muted-foreground">
                    Total Exercises:
                  </Text>
                  <Text className="text-base font-medium text-foreground">
                    {activeWorkout?.exercises.length || 0}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-base text-muted-foreground">
                    Sets Completed:
                  </Text>
                  <Text className="text-base font-medium text-foreground">
                    {getCompletedSets()} / {getTotalSets()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-base text-muted-foreground">
                    Total Volume:
                  </Text>
                  <Text className="text-base font-medium text-foreground">
                    {getTotalVolume()} kg
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-base text-muted-foreground">
                    Estimated Calories:
                  </Text>
                  <Text className="text-base font-medium text-foreground">
                    {Math.round(getDuration() / 1000 / 60 * 5)} kcal
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
          
          {/* PRs Card */}
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3 mb-3">
                <Trophy size={18} className="text-amber-500" />
                <Text className="font-medium text-foreground">Personal Records</Text>
              </View>
              
              {mockPRs.length > 0 ? (
                <View className="gap-3">
                  {mockPRs.map((pr, index) => (
                    <View key={index} className="gap-1">
                      <Text className="font-medium">{pr.exercise}</Text>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted-foreground">New PR:</Text>
                        <Text className="text-sm font-medium text-amber-500">{pr.value}</Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted-foreground">Previous:</Text>
                        <Text className="text-sm text-muted-foreground">{pr.previous}</Text>
                      </View>
                      {index < mockPRs.length - 1 && <Separator className="my-2" />}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-muted-foreground">No personal records set in this workout</Text>
              )}
            </CardContent>
          </Card>
          
          {/* Selected storage option card */}
          <Card>
            <CardContent className="p-4">
              <View className="flex-row items-center gap-3 mb-2">
                <Cog size={18} className="text-muted-foreground" />
                <Text className="font-medium text-foreground">Selected Options</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-base text-muted-foreground flex-1">
                  Storage:
                </Text>
                <Badge 
                  variant={options.storageType === 'local_only' ? 'outline' : 'secondary'} 
                  className="capitalize"
                >
                  <Text>
                    {options.storageType === 'local_only' 
                      ? 'Local Only' 
                      : options.storageType === 'publish_complete'
                        ? 'Full Metrics'
                        : 'Limited Metrics'
                    }
                  </Text>
                </Badge>
              </View>
            </CardContent>
          </Card>
        </View>
        
        {/* Navigation buttons */}
        <View className="flex-row gap-3 mt-4 mb-6">
          <Button 
            variant="outline" 
            className="flex-1"
            onPress={onBack}
          >
            <Text>Back</Text>
          </Button>
          
          <Button 
            className="flex-1"
            style={{ backgroundColor: purpleColor }}
            onPress={onFinish}
          >
            <Text className="text-white font-medium">
              Finish Workout
            </Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

// Celebration component with share option
function CelebrationTab({
  options,
  onComplete
}: {
  options: WorkoutCompletionOptions,
  onComplete: (options: WorkoutCompletionOptions) => void
}) {
  const { isAuthenticated } = useNDKCurrentUser();
  const { activeWorkout } = useWorkoutStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [shareMessage, setShareMessage] = useState('');
  
  // Purple color used throughout the app
  const purpleColor = 'hsl(261, 90%, 66%)';
  
  // Generate default share message
  useEffect(() => {
    // Create default message based on workout data
    let message = "Just completed a workout! 💪";
    
    if (activeWorkout) {
      const exerciseCount = activeWorkout.exercises.length;
      const completedSets = activeWorkout.exercises.reduce(
        (total, exercise) => total + exercise.sets.filter(set => set.isCompleted).length, 0
      );
      
      // Add workout details
      message = `Just completed a workout with ${exerciseCount} exercises and ${completedSets} sets! 💪`;
      
      // Add mock PR info
      if (Math.random() > 0.5) {
        message += " Hit some new PRs today! 🏆";
      }
    }
    
    setShareMessage(message);
  }, [activeWorkout]);
  
  const handleShare = () => {
    // This will trigger a kind 1 note creation via the onComplete handler
    onComplete({
      ...options,
      shareOnSocial: true,
      socialMessage: shareMessage
    });
  };
  
  const handleSkip = () => {
    // Complete the workout without sharing
    onComplete({
      ...options,
      shareOnSocial: false
    });
  };
  
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 items-center justify-center px-4 py-8">
        {showConfetti && (
          <Confetti onComplete={() => setShowConfetti(false)} />
        )}
        
        <View className="w-full max-w-md">
          {/* Trophy and heading */}
          <View className="items-center mb-8">
            <Trophy size={60} color="#F59E0B" />
            <Text className="text-2xl font-bold text-center mt-4 mb-2">
              Workout Complete! 
            </Text>
            <Text className="text-center text-muted-foreground">
              Great job on finishing your workout!
            </Text>
          </View>
          
          {/* Show sharing options for Nostr if appropriate */}
          {isAuthenticated && options.storageType !== 'local_only' && (
            <>
              <Separator className="my-4" />
              
              <View className="mb-4">
                <Text className="text-lg font-semibold mb-3">
                  Share Your Achievement
                </Text>
                
                <Text className="text-muted-foreground mb-3">
                  Share your workout with your followers on Nostr
                </Text>
                
                <Input
                  multiline
                  numberOfLines={4}
                  value={shareMessage}
                  onChangeText={setShareMessage}
                  className="min-h-[120px] p-3 mb-4"
                />
                
                <Button
                  className="w-full mb-3"
                  style={{ backgroundColor: purpleColor }}
                  onPress={handleShare}
                >
                  <Text className="text-white font-medium">
                    Share to Nostr
                  </Text>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onPress={handleSkip}
                >
                  <Text>
                    Skip Sharing
                  </Text>
                </Button>
              </View>
            </>
          )}
          
          {/* If local-only or not authenticated */}
          {(options.storageType === 'local_only' || !isAuthenticated) && (
            <Button
              className="w-full mt-4"
              style={{ backgroundColor: purpleColor }}
              onPress={handleSkip}
            >
              <Text className="text-white font-medium">
                Continue
              </Text>
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}   

export function WorkoutCompletionFlow({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: (options: WorkoutCompletionOptions) => void;
  onCancel: () => void;
}) {
  // States
  const [options, setOptions] = useState<WorkoutCompletionOptions>({
    storageType: 'local_only',
    shareOnSocial: false,
    templateAction: 'keep_original',
  });
  
  const [step, setStep] = useState<'options' | 'summary' | 'celebration'>('options');
  
  // Navigate through steps
  const handleNext = () => {
    setStep('summary');
  };
  
  const handleBack = () => {
    setStep('options');
  };
  
  const handleFinish = () => {
    // Move to celebration screen
    setStep('celebration');
  };
  
  const handleComplete = (finalOptions: WorkoutCompletionOptions) => {
    // Call the completion function with the selected options
    onComplete(finalOptions);
  };
  
  const renderStep = () => {
    switch (step) {
      case 'options':
        return (
          <StorageOptionsTab 
            options={options} 
            setOptions={setOptions} 
            onNext={handleNext} 
          />
        );
      case 'summary':
        return (
          <SummaryTab 
            options={options} 
            onBack={handleBack} 
            onFinish={handleFinish} 
          />
        );
      case 'celebration':
        return (
          <CelebrationTab 
            options={options} 
            onComplete={handleComplete} 
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <View className="flex-1">
      {renderStep()}
    </View>
  );
}