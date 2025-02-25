// components/workout/HomeWorkout.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Plus } from 'lucide-react-native'
import { Text } from '@/components/ui/text' // Import Text from our UI components

interface HomeWorkoutProps {
  onStartBlank?: () => void;
  onSelectTemplate?: () => void;
}

export default function HomeWorkout({ onStartBlank, onSelectTemplate }: HomeWorkoutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a Workout</CardTitle>
        <CardDescription>Begin a new workout or choose from your templates</CardDescription>
      </CardHeader>
      <CardContent className="flex-col gap-4">
        <Button 
          size="lg"
          className="w-full flex-row items-center justify-center gap-2"
          onPress={onStartBlank}
        >
          <Play className="h-5 w-5" />
          <Text className="text-primary-foreground">Quick Start</Text>
        </Button>
        
        <Button 
          variant="outline"
          size="lg"
          className="w-full flex-row items-center justify-center gap-2"
          onPress={onSelectTemplate}
        >
          <Plus className="h-5 w-5" />
          <Text>Use Template</Text>
        </Button>
      </CardContent>
    </Card>
  );
}