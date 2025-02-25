// app/(workout)/add-exercises.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useSQLiteContext } from 'expo-sqlite';
import { LibraryService } from '@/lib/db/services/LibraryService';
import { TabScreen } from '@/components/layout/TabScreen';
import { X } from 'lucide-react-native';
import { BaseExercise } from '@/types/exercise';

export default function AddExercisesScreen() {
  const db = useSQLiteContext();
  const [libraryService] = useState(() => new LibraryService(db));
  const [exercises, setExercises] = useState<BaseExercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  
  const { addExercises } = useWorkoutStore();

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
    
    loadExercises();
  }, [libraryService]);

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

  const handleAddSelected = () => {
    const selectedExercises = exercises.filter(e => selectedIds.includes(e.id));
    addExercises(selectedExercises);
    
    // Just go back - this will dismiss the modal and return to create screen
    router.back();
  };

  return (
    <TabScreen>
      <View className="flex-1 pt-12">
        {/* Close button in the top right */}
        <View className="absolute top-12 right-4 z-10">
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => router.back()}
          >
            <X className="text-foreground" />
          </Button>
        </View>
        
        <View className="px-4 pt-4 pb-2">
          <Text className="text-xl font-semibold mb-4">Add Exercises</Text>
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
                <Card key={exercise.id}>
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>
        </ScrollView>
        
        <View className="p-4 border-t border-border">
          <Button
            className="w-full"
            onPress={handleAddSelected}
            disabled={selectedIds.length === 0}
          >
            <Text className="text-primary-foreground">
              Add {selectedIds.length} Exercise{selectedIds.length !== 1 ? 's' : ''}
            </Text>
          </Button>
        </View>
      </View>
    </TabScreen>
  );
}