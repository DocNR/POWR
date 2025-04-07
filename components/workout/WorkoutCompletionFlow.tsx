// components/workout/WorkoutCompletionFlow.tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';
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
        
        {/* Workout Description field and Next button */}
        <View>
          <Text className="text-lg font-semibold text-foreground">Workout Notes</Text>
          <Text className="text-muted-foreground mb-2">
            Add context or details about your workout
          </Text>
          <Input
            multiline
            numberOfLines={4}
            placeholder="Tough upper body workout today. Feeling stronger!"
            value={options.workoutDescription || ''}
            onChangeText={(text) => setOptions({
              ...options,
              workoutDescription: text
            })}
            className="min-h-[100px] p-3 bg-background dark:bg-muted border-[0.5px] border-input dark:border-0"
            style={{ marginBottom: 16 }}
          />
        </View>
        
        {/* Next button with direct styling */}
        <Button 
          onPress={onNext}
          className="w-full"
          style={{ 
            backgroundColor: purpleColor,
            marginTop: 16
          }}
        >
          <Text className="text-white font-medium">
            Next
          </Text>
        </Button>
        
        {/* Template options section removed as it was causing bugs */}
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
  const { activeWorkout, isPublishing, publishingStatus, publishError } = useWorkoutStore();
  const [showConfetti, setShowConfetti] = useState(true);
  const [shareMessage, setShareMessage] = useState('');
  
  // Purple color used throughout the app
  const purpleColor = 'hsl(261, 90%, 66%)';
  
  // Disable buttons during publishing
  const isDisabled = isPublishing;
  
  // Generate default share message on load
  useEffect(() => {
    if (activeWorkout) {
      // Use the enhanced formatter from NostrWorkoutService
      const formattedMessage = NostrWorkoutService.createFormattedSocialMessage(
        activeWorkout,
        "Just completed a workout! 💪"
      );
      setShareMessage(formattedMessage);
    } else {
      setShareMessage("Just completed a workout! 💪 #powr #nostr");
    }
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
          
          {/* Show publishing status */}
          {isPublishing && (
            <View className="mb-4 p-4 bg-primary/10 rounded-lg w-full">
              <Text className="text-foreground font-medium mb-2 text-center">
                {publishingStatus === 'saving' && 'Saving workout...'}
                {publishingStatus === 'publishing-workout' && 'Publishing workout record...'}
                {publishingStatus === 'publishing-social' && 'Sharing to Nostr...'}
              </Text>
              <ActivityIndicator size="small" className="my-2" />
            </View>
          )}
          
          {/* Show error if any */}
          {publishError && (
            <View className="mb-4 p-4 bg-destructive/10 rounded-lg w-full">
              <Text className="text-destructive font-medium">{publishError}</Text>
            </View>
          )}
          
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
                  className="min-h-[120px] p-3 mb-4 bg-background dark:bg-muted border-[0.5px] border-input dark:border-0"
                  editable={!isDisabled}
                />
                
                <Button
                  className="w-full mb-3"
                  style={{ 
                    backgroundColor: purpleColor,
                    opacity: isDisabled ? 0.5 : 1 
                  }}
                  onPress={handleShare}
                  disabled={isDisabled}
                >
                  <Text className="text-white font-medium">
                    Share to Nostr
                  </Text>
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onPress={handleSkip}
                  disabled={isDisabled}
                  style={{ opacity: isDisabled ? 0.5 : 1 }}
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
              style={{ 
                backgroundColor: purpleColor,
                opacity: isDisabled ? 0.5 : 1
              }}
              disabled={isDisabled}
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
