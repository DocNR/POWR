// app/(workout)/workout/[id].tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { WorkoutHistoryService } from '@/lib/db/services/EnhancedWorkoutHistoryService';
import WorkoutDetailView from '@/components/workout/WorkoutDetailView';
import { Workout } from '@/types/workout';
import { useNDK, useNDKAuth, useNDKEvents } from '@/lib/hooks/useNDK';
import { NostrWorkoutService } from '@/lib/db/services/NostrWorkoutService';
import { useNDKStore } from '@/lib/stores/ndk';
import { Share } from 'react-native';

export default function WorkoutDetailScreen() {
  // Add error state
  const [error, setError] = useState<string | null>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const { ndk } = useNDK();
  const { isAuthenticated } = useNDKAuth();
  const { publishEvent } = useNDKEvents();
  
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Initialize service
  const workoutHistoryService = React.useMemo(() => new WorkoutHistoryService(db), [db]);
  
  // Load workout details
  useEffect(() => {
    const loadWorkout = async () => {
      if (!id) {
        console.log('No workout ID provided');
        return;
      }
      
      console.log(`Loading workout details for ID: ${id}`);
      
      try {
        setIsLoading(true);
        setError(null); // Reset error state
        console.log('Calling workoutHistoryService.getWorkoutDetails...');
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout loading workout details')), 10000);
        });
        
        // Race the workout details fetch against the timeout
        const workoutDetails = await Promise.race([
          workoutHistoryService.getWorkoutDetails(id),
          timeoutPromise
        ]) as Workout | null;
        
        console.log('getWorkoutDetails returned:', workoutDetails ? 'workout found' : 'workout not found');
        
        if (workoutDetails) {
          console.log(`Workout title: ${workoutDetails.title}`);
          console.log(`Workout has ${workoutDetails.exercises?.length || 0} exercises`);
          setWorkout(workoutDetails);
        } else {
          console.error('Workout not found');
          setError('Workout not found. It may have been deleted.');
        }
      } catch (error) {
        console.error('Error loading workout:', error);
        setError(`Error loading workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        console.log('Setting isLoading to false');
        setIsLoading(false);
      }
    };
    
    loadWorkout();
  }, [id, workoutHistoryService]);
  
  // Handle publishing to Nostr
  const handlePublish = async () => {
    if (!workout || !ndk || !isAuthenticated) {
      alert('You need to be logged in to Nostr to publish workouts');
      return;
    }
    
    try {
      setIsPublishing(true);
      
      // Create Nostr event
      const nostrEvent = NostrWorkoutService.createCompleteWorkoutEvent(workout);
      
      // Publish event using the kind, content, and tags from the created event
      const publishedEvent = await publishEvent(
        nostrEvent.kind,
        nostrEvent.content,
        nostrEvent.tags
      );
      
      if (publishedEvent?.id) {
        // Update local database with Nostr event ID
        const relayCount = ndk.pool?.relays.size || 0;
        
        // Update workout in memory
        setWorkout({
          ...workout,
          availability: {
            ...workout.availability,
            nostrEventId: publishedEvent.id,
            nostrPublishedAt: Date.now(),
            nostrRelayCount: relayCount
          }
        });
        
        console.log(`Workout published to Nostr with event ID: ${publishedEvent.id}`);
        alert('Workout published successfully!');
      }
    } catch (error) {
      console.error('Error publishing workout to Nostr:', error);
      alert('Failed to publish workout. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Handle importing from Nostr to local
  const handleImport = async () => {
    if (!workout) return;
    
    try {
      setIsImporting(true);
      
      // Import workout to local database
      // This would be implemented in a future version
      console.log('Importing workout from Nostr to local database');
      
      // For now, just show a message
      alert('Workout import functionality will be available in a future update');
    } catch (error) {
      console.error('Error importing workout:', error);
    } finally {
      setIsImporting(false);
    }
  };
  
  // Handle exporting workout data
  const handleExport = async (format: 'csv' | 'json') => {
    if (!workout) return;
    
    try {
      setIsExporting(true);
      
      // Create export data
      let exportData = '';
      
      if (format === 'json') {
        // Export as JSON
        exportData = JSON.stringify(workout, null, 2);
      } else {
        // Export as CSV
        const headers = 'ID,Title,Type,Start Time,End Time,Completed,Volume,Reps,Notes\n';
        const row = [
          workout.id,
          `"${workout.title.replace(/"/g, '""')}"`, // Escape quotes in title
          workout.type,
          new Date(workout.startTime).toISOString(),
          workout.endTime ? new Date(workout.endTime).toISOString() : '',
          workout.isCompleted ? 'Yes' : 'No',
          workout.totalVolume || '',
          workout.totalReps || '',
          workout.notes ? `"${workout.notes.replace(/"/g, '""')}"` : '' // Escape quotes in notes
        ];
        
        exportData = headers + row.join(',');
      }
      
      // Share the exported data
      await Share.share({
        message: exportData,
        title: `${workout.title} - Workout Export (${format.toUpperCase()})`,
      });
    } catch (error) {
      console.error(`Error exporting workout as ${format}:`, error);
      alert(`Failed to export workout as ${format}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: workout?.title || 'Workout Details',
          headerShown: true,
        }}
      />
      
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" className="mb-4" />
          <Text className="text-muted-foreground">Loading workout details...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-foreground text-lg mb-2">Error</Text>
          <Text className="text-muted-foreground text-center mb-4">{error}</Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="bg-primary px-4 py-2 rounded-md"
          >
            <Text className="text-primary-foreground">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : workout ? (
        <WorkoutDetailView
          workout={workout}
          onPublish={handlePublish}
          onImport={handleImport}
          onExport={handleExport}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-foreground text-lg mb-2">Workout not found</Text>
          <Text className="text-muted-foreground text-center mb-4">
            The workout you're looking for could not be found or may have been deleted.
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            className="bg-primary px-4 py-2 rounded-md"
          >
            <Text className="text-primary-foreground">Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}