// app/(workout)/add-exercises.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useSQLiteContext } from 'expo-sqlite';
import { LibraryService } from '@/lib/db/services/LibraryService';
import { TabScreen } from '@/components/layout/TabScreen';
import { ChevronLeft, Search, Plus } from 'lucide-react-native';
import { BaseExercise } from '@/types/exercise';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';

export default function AddExercisesScreen() {
  const db = useSQLiteContext();
  const [libraryService] = useState(() => new LibraryService(db));
  const [exercises, setExercises] = useState<BaseExercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isNewExerciseSheetOpen, setIsNewExerciseSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();
  
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
    
    // Go back to create screen
    router.back();
  };

  const handleNewExerciseSubmit = (exercise: BaseExercise) => {
    // Add to exercises list
    setExercises(prev => [exercise, ...prev]);
    // Auto-select the new exercise
    setSelectedIds(prev => [...prev, exercise.id]);
  };

  // Purple color used throughout the app
  const purpleColor = 'hsl(261, 90%, 66%)';

  return (
    <TabScreen>
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: 'hsl(var(--background))' }}>
        {/* Header with back button */}
        <View className="px-4 py-4 flex-row items-center justify-between border-b border-border">
          <View className="flex-row items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onPress={() => router.back()}
              className="mr-2"
            >
              <ChevronLeft className="text-foreground" size={22} />
            </Button>
            <Text className="text-xl font-semibold">Add Exercises</Text>
          </View>
          
          <View className="flex-row items-center">
            <Text className="text-sm text-muted-foreground mr-3">
              {selectedIds.length} selected
            </Text>
            <Button
              variant="ghost"
              size="icon"
              onPress={() => setIsNewExerciseSheetOpen(true)}
            >
              <Plus size={22} color={purpleColor} />
            </Button>
          </View>
        </View>
        
        {/* Search input */}
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
          <View className="p-4">
            <View className="gap-3">
              {filteredExercises.map(exercise => {
                const isSelected = selectedIds.includes(exercise.id);
                return (
                  <TouchableOpacity 
                    key={exercise.id}
                    onPress={() => handleToggleSelection(exercise.id)}
                    activeOpacity={0.7}
                  >
                    <Card 
                      style={isSelected ? { 
                        borderColor: purpleColor,
                        borderWidth: 1.5,
                      } : {}}
                    >
                      <CardContent className="p-4">
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1">
                            <Text className="text-lg font-semibold">
                              {exercise.title}
                            </Text>
                            <View className="flex-row mt-1">
                              <Text className="text-sm text-muted-foreground">{exercise.category}</Text>
                              {exercise.equipment && (
                                <Text className="text-sm text-muted-foreground"> • {exercise.equipment}</Text>
                              )}
                            </View>
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  </TouchableOpacity>
                );
              })}
              
              {filteredExercises.length === 0 && (
                <View className="items-center justify-center py-12">
                  <Text className="text-muted-foreground">No exercises found</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
        
        {/* Action button with proper safe area padding */}
        <View className="px-4 pt-3 pb-3" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Button
            className="w-full py-4"
            onPress={handleAddSelected}
            disabled={selectedIds.length === 0}
            style={{ backgroundColor: purpleColor }}
          >
            <Text className="text-white font-medium">
              Add {selectedIds.length} Exercise{selectedIds.length !== 1 ? 's' : ''} to Workout
            </Text>
          </Button>
        </View>

        {/* New Exercise Sheet */}
        <NewExerciseSheet 
          isOpen={isNewExerciseSheetOpen}
          onClose={() => setIsNewExerciseSheetOpen(false)}
          onSubmit={handleNewExerciseSubmit}
        />
      </View>
    </TabScreen>
  );
}