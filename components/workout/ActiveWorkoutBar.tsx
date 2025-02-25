// components/workout/ActiveWorkoutBar.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat,
  withSequence,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { useWorkoutStore } from '@/stores/workoutStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity } from 'lucide-react-native';
import { router } from 'expo-router';
import { formatTime } from '@/utils/formatTime';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';

export default function ActiveWorkoutBar() {
  // Use Zustand store
  const { 
    activeWorkout,
    isActive,
    isMinimized,
    status,
    elapsedTime
  } = useWorkoutStore();
  
  const { maximizeWorkout } = useWorkoutStore.getState();
  const insets = useSafeAreaInsets();
  const theme = useTheme() as CustomTheme;

  // Animation values
  const glowOpacity = useSharedValue(0.5);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  useEffect(() => {
    // Only run animations if the bar should be visible
    if (isActive && isMinimized && activeWorkout && activeWorkout.exercises.length > 0) {
      // Pulse animation
      scale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Glow animation
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.5, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [isActive, isMinimized, activeWorkout]);

  const handlePress = () => {
    maximizeWorkout();
    router.push('/(workout)/create');
  };

  // Don't render anything if there's no active workout or if it's not minimized
  if (!isActive || !isMinimized || !activeWorkout) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { bottom: insets.bottom + 60 },
        animatedStyle
      ]}
    >
      <TouchableOpacity
        style={[styles.touchable, { backgroundColor: theme.colors.primary }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View 
          style={[
            styles.glow,
            { backgroundColor: theme.colors.primary },
            glowStyle
          ]} 
        />
        <View style={styles.content}>
          <View style={styles.leftContent}>
            <Activity size={16} color="white" />
            <Text style={styles.title} numberOfLines={1}>{activeWorkout.title}</Text>
          </View>
          <View style={styles.rightContent}>
            <Text style={styles.time}>{formatTime(elapsedTime)}</Text>
            <Text style={styles.exerciseCount}>
              {activeWorkout.exercises.length} exercise{activeWorkout.exercises.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: Platform.OS === 'android' ? 1 : 0,
  },
  touchable: {
    flex: 1,
    borderRadius: 8,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 16,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  time: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace'
    }),
    marginBottom: 2,
  },
  exerciseCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
});