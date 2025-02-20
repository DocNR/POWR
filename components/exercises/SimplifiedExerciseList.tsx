// components/exercises/SimplifiedExerciseList.tsx
import React, { useRef, useState, useCallback } from 'react';
import { View, SectionList, TouchableOpacity, ViewToken } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { ExerciseDisplay, WorkoutExercise } from '@/types/exercise';

// Create a combined interface for exercises that could have workout data
interface DisplayWorkoutExercise extends ExerciseDisplay, WorkoutExercise {}

interface SimplifiedExerciseListProps {
  exercises: ExerciseDisplay[];
  onExercisePress: (exercise: ExerciseDisplay) => void;
}

export const SimplifiedExerciseList = ({
  exercises,
  onExercisePress
}: SimplifiedExerciseListProps) => {
  const sectionListRef = useRef<SectionList>(null);
  const [currentSection, setCurrentSection] = useState<string>('');

  // Organize exercises into sections
  const sections = React.useMemo(() => {
    const exercisesByLetter = exercises.reduce((acc, exercise) => {
      const firstLetter = exercise.title[0].toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(exercise);
      return acc;
    }, {} as Record<string, ExerciseDisplay[]>);

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
      sectionListRef.current.scrollToLocation({
        animated: true,
        sectionIndex,
        itemIndex: 0,
        viewPosition: 0,
      });
    }
  }, [sections]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 85, // Approximate height of each item
    offset: 85 * index,
    index,
  }), []);

  const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = new Set(sections.map(section => section.title));

  // Updated type guard
  function isWorkoutExercise(exercise: ExerciseDisplay): exercise is DisplayWorkoutExercise {
    return 'sets' in exercise && Array.isArray((exercise as any).sets);
  }

  const renderExerciseItem = ({ item }: { item: ExerciseDisplay }) => {
    const firstLetter = item.title.charAt(0).toUpperCase();
    
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => onExercisePress(item)}
        className="flex-row items-center px-4 py-3 border-b border-border"
      >
        {/* Image placeholder or first letter */}
        <View className="w-12 h-12 rounded-full bg-card flex items-center justify-center mr-3 overflow-hidden">
          <Text className="text-2xl font-bold text-foreground">
            {firstLetter}
          </Text>
        </View>
        
        <View className="flex-1">
          {/* Title */}
          <Text className="text-base font-semibold text-foreground mb-1">
            {item.title}
          </Text>
          
          {/* Tags row */}
          <View className="flex-row flex-wrap gap-1">
            {/* Category Badge */}
            <Badge variant="outline" className="rounded-full py-0.5">
              <Text className="text-xs">{item.category}</Text>
            </Badge>
            
            {/* Equipment Badge (if available) */}
            {item.equipment && (
              <Badge variant="outline" className="rounded-full py-0.5">
                <Text className="text-xs">{item.equipment}</Text>
              </Badge>
            )}
            
            {/* Type Badge */}
            <Badge variant="outline" className="rounded-full py-0.5">
              <Text className="text-xs">{item.type}</Text>
            </Badge>
            
            {/* Source Badge - colored for 'powr' */}
            {item.source && (
              <Badge 
                variant={item.source === 'powr' ? 'default' : 'secondary'} 
                className={`rounded-full py-0.5 ${
                  item.source === 'powr' ? 'bg-violet-500' : ''
                }`}
              >
                <Text className={`text-xs ${
                  item.source === 'powr' ? 'text-white' : ''
                }`}>
                  {item.source}
                </Text>
              </Badge>
            )}
          </View>
        </View>
        
        {/* Weight/Rep information if it was a WorkoutExercise */}
        {isWorkoutExercise(item) && (
          <View className="items-end">
            <Text className="text-muted-foreground text-sm">
              {item.sets?.[0]?.weight && `${item.sets[0].weight} lb`}
              {item.sets?.[0]?.weight && item.sets?.[0]?.reps && ' '}
              {item.sets?.[0]?.reps && `(×${item.sets[0].reps})`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 flex-row bg-background">
      {/* Main List */}
      <View className="flex-1">
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          getItemLayout={getItemLayout}
          renderSectionHeader={({ section }) => (
            <View className="py-2 px-4 bg-muted/80 border-b border-border">
              <Text className="text-base font-semibold text-foreground">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={renderExerciseItem}
          stickySectionHeadersEnabled
          initialNumToRender={15}
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
          
          if (element) {
            (element as any).measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
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
  );
};

export default SimplifiedExerciseList;