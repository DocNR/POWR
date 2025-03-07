// app/(workout)/complete.tsx - revised version
import React from 'react';
import { View, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { X } from 'lucide-react-native';
import { useWorkoutStore } from '@/stores/workoutStore';
import { WorkoutCompletionFlow } from '@/components/workout/WorkoutCompletionFlow';
import { WorkoutCompletionOptions } from '@/types/workout';
import { useColorScheme } from '@/lib/useColorScheme';

export default function CompleteWorkoutScreen() {
  const { resumeWorkout } = useWorkoutStore.getState();
  const { isDarkColorScheme } = useColorScheme();
  
// Handle complete with options
const handleComplete = async (options: WorkoutCompletionOptions) => {
    // Get a fresh reference to completeWorkout and other functions
    const { completeWorkout, activeWorkout } = useWorkoutStore.getState();
    
    // 1. Complete the workout locally first
    await completeWorkout();
    
    // 2. If publishing to Nostr is selected, create and publish workout event
    let workoutEventId = null;
    if (options.storageType !== 'local_only' && activeWorkout) {
      try {
        const ndkStore = require('@/lib/stores/ndk').useNDKStore.getState();
        
        // Create workout tags based on NIP-4e
        const workoutTags = [
          ['d', activeWorkout.id], // Unique identifier
          ['title', activeWorkout.title],
          ['type', activeWorkout.type],
          ['start', Math.floor(activeWorkout.startTime / 1000).toString()],
          ['end', Math.floor(Date.now() / 1000).toString()],
          ['completed', 'true']
        ];
        
        // Add exercise tags
        activeWorkout.exercises.forEach(exercise => {
          // Add exercise tags following NIP-4e format
          exercise.sets.forEach(set => {
            if (set.isCompleted) {
              workoutTags.push([
                'exercise', 
                `33401:${exercise.id}`, 
                '', // relay URL can be empty for now
                set.weight?.toString() || '',
                set.reps?.toString() || '',
                set.rpe?.toString() || '',
                set.type || 'normal'
              ]);
            }
          });
        });
        
        // Add template reference if workout was based on a template
        if (activeWorkout.templateId) {
          workoutTags.push(['template', `33402:${activeWorkout.templateId}`, '']);
        }
        
        // Add hashtags
        workoutTags.push(['t', 'workout'], ['t', 'fitness']);
        
        // Attempt to publish the workout event
        console.log("Publishing workout event with tags:", workoutTags);
        const workoutEvent = await ndkStore.publishEvent(
          1301, // Use kind 1301 for workout records
          activeWorkout.notes || "Completed workout", // Content is workout notes
          workoutTags
        );
        
        if (workoutEvent) {
          workoutEventId = workoutEvent.id;
          console.log("Successfully published workout event:", workoutEventId);
        }
      } catch (error) {
        console.error("Error publishing workout event:", error);
      }
    }
    
    // 3. If social sharing is enabled, create a reference to the workout event
    if (options.shareOnSocial && options.socialMessage && workoutEventId) {
        try {
          const ndkStore = require('@/lib/stores/ndk').useNDKStore.getState();
          
          // Create social post tags
          const socialTags = [
            ['t', 'workout'],
            ['t', 'fitness'],
            ['t', 'powr'],
            ['client', 'POWR']
          ];
          
          // Get current user pubkey
          const currentUserPubkey = ndkStore.currentUser?.pubkey;
          
          // Add quote reference to the workout event using 'q' tag
          if (workoutEventId) {
            // Format: ["q", "<event-id>", "<relay-url>", "<author-pubkey>"]
            socialTags.push(['q', workoutEventId, '', currentUserPubkey || '']);
          }
          
          // Publish social post
          await ndkStore.publishEvent(1, options.socialMessage, socialTags);
          console.log("Successfully published social post quoting workout");
        } catch (error) {
          console.error("Error publishing social post:", error);
        }
      }
    
    // 4. Handle template updates if needed
    if (activeWorkout?.templateId && options.templateAction !== 'keep_original') {
      try {
        const TemplateService = require('@/lib/db/services/TemplateService').TemplateService;
        
        if (options.templateAction === 'update_existing') {
          await TemplateService.updateExistingTemplate(activeWorkout);
        } else if (options.templateAction === 'save_as_new' && options.newTemplateName) {
          await TemplateService.saveAsNewTemplate(activeWorkout, options.newTemplateName);
        }
      } catch (error) {
        console.error('Error handling template action:', error);
      }
    }
    
    // Navigate to home or history page
    router.replace('/(tabs)/history');
  };
  
  // Handle cancellation
  const handleCancel = () => {
    resumeWorkout();
    router.back();
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View 
          className={`bg-background ${isDarkColorScheme ? 'bg-card border border-border' : ''} rounded-lg w-[95%] h-[85%] max-w-xl shadow-xl overflow-hidden`}
          style={{ maxHeight: 700 }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-xl font-bold text-foreground">Complete Workout</Text>
            <TouchableOpacity onPress={handleCancel} className="p-1">
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View className="flex-1 p-4">
            <WorkoutCompletionFlow 
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}