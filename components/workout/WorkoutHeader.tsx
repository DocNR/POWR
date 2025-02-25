// components/workout/WorkoutHeader.tsx
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Pause, Play, Square, ChevronLeft } from 'lucide-react-native';
import { useWorkoutStore } from '@/stores/workoutStore';
import { formatTime } from '@/utils/formatTime';
import { cn } from '@/lib/utils';
import { useRouter } from 'expo-router';
import EditableText from '@/components/EditableText';

interface WorkoutHeaderProps {
  title?: string;
  onBack?: () => void;
}

export default function WorkoutHeader({ title, onBack }: WorkoutHeaderProps) {
  const router = useRouter();
  const status = useWorkoutStore.use.status();
  const activeWorkout = useWorkoutStore.use.activeWorkout();
  const elapsedTime = useWorkoutStore.use.elapsedTime();
  const { pauseWorkout, resumeWorkout, completeWorkout, updateWorkoutTitle } = useWorkoutStore.getState();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  if (!activeWorkout) return null;

  return (
    <View className={cn(
      "px-4 py-2 border-b border-border",
      status === 'paused' && "bg-muted/50"
    )}>
      {/* Header Row */}
      <View className="flex-row items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="icon"
          onPress={handleBack}
        >
          <ChevronLeft className="text-foreground" />
        </Button>
        
        <View className="flex-1 px-4">
          <EditableText
            value={activeWorkout.title}
            onChangeText={(newTitle) => updateWorkoutTitle(newTitle)}
            style={{ alignItems: 'center' }}
            placeholder="Workout Title"
          />
        </View>

        <View className="flex-row gap-2">
          {status === 'active' ? (
            <Button
              variant="ghost"
              size="icon"
              onPress={pauseWorkout}
            >
              <Pause className="text-foreground" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onPress={resumeWorkout}
            >
              <Play className="text-foreground" />
            </Button>
          )}

          <Button
            variant="destructive"
            size="icon"
            onPress={completeWorkout}
          >
            <Square className="text-destructive-foreground" />
          </Button>
        </View>
      </View>

      {/* Status Row */}
      <View className="flex-row items-center justify-between">
        <Text className={cn(
          "text-2xl font-bold",
          status === 'paused' ? "text-muted-foreground" : "text-foreground"
        )}>
          {formatTime(elapsedTime)}
        </Text>

        <Text className="text-sm text-muted-foreground capitalize">
          {activeWorkout.type}
        </Text>
      </View>
    </View>
  );
}