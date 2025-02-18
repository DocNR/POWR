// components/exercises/ExerciseList.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, SectionList } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { Exercise } from '@/types/exercise';

interface ExerciseListProps {
  exercises: Exercise[];
  onExercisePress: (exercise: Exercise) => void;
  onExerciseDelete: (id: string) => void;
}

const ExerciseList = ({
  exercises,
  onExercisePress,
  onExerciseDelete
}: ExerciseListProps) => {
  const [sections, setSections] = useState<{title: string, data: Exercise[]}[]>([]);

  const organizeExercises = useCallback(() => {
    // Group by first letter
    const grouped = exercises.reduce((acc, exercise) => {
      const firstLetter = exercise.title[0].toUpperCase();
      const section = acc.find(s => s.title === firstLetter);
      if (section) {
        section.data.push(exercise);
      } else {
        acc.push({title: firstLetter, data: [exercise]});
      }
      return acc;
    }, [] as {title: string, data: Exercise[]}[]);

    // Sort sections alphabetically
    grouped.sort((a,b) => a.title.localeCompare(b.title));
    
    // Sort exercises within sections
    grouped.forEach(section => {
      section.data.sort((a,b) => a.title.localeCompare(b.title));
    });

    setSections(grouped);
  }, [exercises]);

  useEffect(() => {
    organizeExercises();
  }, [organizeExercises]);

  const renderSectionHeader = ({ section }: { section: {title: string} }) => (
    <View className="sticky top-0 z-10 bg-background border-b border-border py-2 px-4">
      <Text className="text-lg font-semibold">{section.title}</Text>
    </View>
  );

  const renderExercise = ({ item }: { item: Exercise }) => (
    <View className="px-4 py-1">
      <ExerciseCard
        {...item}
        onPress={() => onExercisePress(item)}
        onDelete={() => onExerciseDelete(item.id)}
      />
    </View>
  );

  return (
    <SectionList
      sections={sections}
      renderItem={renderExercise}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled
      keyExtractor={item => item.id}
    />
  );
};

export default ExerciseList;