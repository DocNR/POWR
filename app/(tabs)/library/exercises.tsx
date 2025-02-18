// app/(tabs)/library/exercises.tsx
import React, { useRef, useState, useCallback } from 'react';
import { View, SectionList, TouchableOpacity, ViewToken } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';
import { Dumbbell } from 'lucide-react-native';
import { BaseExercise, Exercise } from '@/types/exercise';
import { useExercises } from '@/lib/hooks/useExercises';

export default function ExercisesScreen() {
  const sectionListRef = useRef<SectionList>(null);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>('');

  const {
    exercises,
    loading,
    error,
    stats,
    createExercise,
    deleteExercise,
    refreshExercises
  } = useExercises();

  // Organize exercises into sections
  const sections = React.useMemo(() => {
    const exercisesByLetter = exercises.reduce((acc, exercise) => {
      const firstLetter = exercise.title[0].toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(exercise);
      return acc;
    }, {} as Record<string, Exercise[]>);

    return Object.entries(exercisesByLetter)
      .map(([letter, exercises]) => ({
        title: letter,
        data: exercises.sort((a, b) => a.title.localeCompare(b.title))
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [exercises]);

  const handleViewableItemsChanged = useCallback(({
    viewableItems
  }: {
    viewableItems: ViewToken[];
  }) => {
    const firstSection = viewableItems.find(item => item.section)?.section?.title;
    if (firstSection) {
      setCurrentSection(firstSection);
    }
  }, []);

  const scrollToSection = useCallback((letter: string) => {
    const sectionIndex = sections.findIndex(section => section.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      // Try to scroll to section
      sectionListRef.current.scrollToLocation({
        animated: true,
        sectionIndex,
        itemIndex: 0,
        viewPosition: 0, // 0 means top of the view
      });

      // Log for debugging
      if (__DEV__) {
        console.log('Scrolling to section:', {
          letter,
          sectionIndex,
          totalSections: sections.length
        });
      }
    }
  }, [sections]);

  // Add getItemLayout to optimize scrolling
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 100, // Approximate height of each item
    offset: 100 * index,
    index,
  }), []);


  const handleAddExercise = async (exerciseData: Omit<BaseExercise, 'id' | 'availability' | 'created_at'>) => {
    try {
      const newExercise: Omit<Exercise, 'id'> = {
        ...exerciseData,
        source: 'local',
        created_at: Date.now(),
        availability: {
          source: ['local']
        },
        format_json: exerciseData.format ? JSON.stringify(exerciseData.format) : undefined,
        format_units_json: exerciseData.format_units ? JSON.stringify(exerciseData.format_units) : undefined
      };
  
      await createExercise(newExercise);
      setShowNewExercise(false);
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExercise(id);
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const handleExercisePress = (exerciseId: string) => {
    console.log('Selected exercise:', exerciseId);
  };

  const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = new Set(sections.map(section => section.title));

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text>Loading exercises...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4 bg-background">
        <Text className="text-destructive text-center mb-4">
          {error.message}
        </Text>
        <Button onPress={refreshExercises}>
          <Text>Retry</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Stats Bar */}
      <View className="flex-row justify-between items-center p-4 bg-card border-b border-border">
        <View>
          <Text className="text-sm text-muted-foreground">Total Exercises</Text>
          <Text className="text-2xl font-bold">{stats.totalCount}</Text>
        </View>
        <View className="flex-row gap-4">
          <View>
            <Text className="text-xs text-muted-foreground">Push</Text>
            <Text className="text-base font-medium">{stats.byCategory['Push'] || 0}</Text>
          </View>
          <View>
            <Text className="text-xs text-muted-foreground">Pull</Text>
            <Text className="text-base font-medium">{stats.byCategory['Pull'] || 0}</Text>
          </View>
          <View>
            <Text className="text-xs text-muted-foreground">Legs</Text>
            <Text className="text-base font-medium">{stats.byCategory['Legs'] || 0}</Text>
          </View>
          <View>
            <Text className="text-xs text-muted-foreground">Core</Text>
            <Text className="text-base font-medium">{stats.byCategory['Core'] || 0}</Text>
          </View>
        </View>
      </View>

      {/* Exercise List with Alphabet Scroll */}
      <View className="flex-1 flex-row">
        {/* Main List */}
        <View className="flex-1">
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => item.id}
            getItemLayout={getItemLayout}
            renderSectionHeader={({ section }) => (
              <View className="py-2 px-4 bg-background/80">
                <Text className="text-lg font-semibold text-foreground">
                  {section.title}
                </Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View className="px-4 py-1">
                <ExerciseCard
                  {...item}
                  onPress={() => handleExercisePress(item.id)}
                  onDelete={() => handleDelete(item.id)}
                />
              </View>
            )}
            stickySectionHeadersEnabled
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={{
              itemVisiblePercentThreshold: 50
            }}
          />
        </View>

        {/* Alphabet List */}
        <View 
          className="w-8 justify-center bg-transparent px-1"
          onStartShouldSetResponder={() => true}
          onResponderMove={(evt) => {
            const touch = evt.nativeEvent;
            const element = evt.target;
            
            // Get the layout of the alphabet bar
            if (element) {
              const elementPosition = (element as any).measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
                // Calculate which letter we're touching based on position
                const totalHeight = height;
                const letterHeight = totalHeight / alphabet.length;
                const touchY = touch.pageY - pageY;
                const index = Math.min(
                  Math.max(Math.floor(touchY / letterHeight), 0),
                  alphabet.length - 1
                );
                
                const letter = alphabet[index];
                if (availableLetters.has(letter)) {
                  scrollToSection(letter);
                }
              });
            }
          }}
        >
          {alphabet.map((letter) => (
            <Text 
              key={letter}
              className={
                letter === currentSection
                  ? 'text-xs text-center text-primary font-bold py-0.5'
                  : availableLetters.has(letter)
                  ? 'text-xs text-center text-primary font-medium py-0.5'
                  : 'text-xs text-center text-muted-foreground py-0.5'
              }
            >
              {letter}
            </Text>
          ))}
        </View>
      </View>

      <FloatingActionButton
        icon={Dumbbell}
        onPress={() => setShowNewExercise(true)}
      />

      <NewExerciseSheet 
        isOpen={showNewExercise}
        onClose={() => setShowNewExercise(false)}
        onSubmit={handleAddExercise}
      />
    </View>
  );
}