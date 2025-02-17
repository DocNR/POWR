// app/(tabs)/library/exercises.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, SectionList, TouchableOpacity, SectionListData } from 'react-native';
import { Text } from '@/components/ui/text';
import { ExerciseCard } from '@/components/exercises/ExerciseCard';
import { FloatingActionButton } from '@/components/shared/FloatingActionButton';
import { NewExerciseSheet } from '@/components/library/NewExerciseSheet';
import { Dumbbell } from 'lucide-react-native';
import { Exercise, BaseExercise } from '@/types/exercise';
import { useSQLiteContext } from 'expo-sqlite';
import { ExerciseService } from '@/lib/db/services/ExerciseService';

interface ExerciseSection {
  title: string;
  data: Exercise[];
}

export default function ExercisesScreen() {
  const db = useSQLiteContext();
  const exerciseService = React.useMemo(() => new ExerciseService(db), [db]);
  const sectionListRef = useRef<SectionList>(null);
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sections, setSections] = useState<ExerciseSection[]>([]);
  const [showNewExercise, setShowNewExercise] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    // Organize exercises into sections when exercises array changes
    const exercisesByLetter = exercises.reduce((acc, exercise) => {
      const firstLetter = exercise.title[0].toUpperCase();
      if (!acc[firstLetter]) {
        acc[firstLetter] = [];
      }
      acc[firstLetter].push(exercise);
      return acc;
    }, {} as Record<string, Exercise[]>);

    // Create sections array sorted alphabetically
    const newSections = Object.entries(exercisesByLetter)
      .map(([letter, exercises]) => ({
        title: letter,
        data: exercises.sort((a, b) => a.title.localeCompare(b.title))
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    setSections(newSections);
  }, [exercises]);

  const loadExercises = async () => {
    try {
      const loadedExercises = await exerciseService.getAllExercises();
      setExercises(loadedExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const handleAddExercise = async (exerciseData: BaseExercise) => {
    try {
      await exerciseService.createExercise({
        ...exerciseData,
        created_at: Date.now(),
        source: 'local'
      });
      await loadExercises();
      setShowNewExercise(false);
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await exerciseService.deleteExercise(id);
      await loadExercises();
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const handleExercisePress = (exerciseId: string) => {
    console.log('Selected exercise:', exerciseId);
  };

  const scrollToSection = (letter: string) => {
    const sectionIndex = sections.findIndex(section => section.title === letter);
    if (sectionIndex !== -1) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 20
      });
    }
  };

  const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const availableLetters = new Set(sections.map(section => section.title));

  return (
    <View className="flex-1 bg-background">
      <View className="absolute right-0 top-0 bottom-0 w-6 z-10 justify-center bg-transparent">
        {alphabet.map((letter) => (
          <TouchableOpacity
            key={letter}
            onPress={() => scrollToSection(letter)}
            className="py-0.5"
          >
            <Text 
              className={`text-xs text-center ${
                availableLetters.has(letter)
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {letter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View className="py-2 px-4 bg-background/80">
            <Text className="text-lg font-semibold text-foreground">{section.title}</Text>
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
        className="flex-1"
      />

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