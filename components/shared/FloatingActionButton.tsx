// components/shared/FloatingActionButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { spacing } from '@/styles/sharedStyles';
import { LucideIcon } from 'lucide-react-native';
import Animated, { 
  SharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';

interface FABProps {
  onPress: () => void;
  icon: LucideIcon;
  scrollY?: SharedValue<number>;
  style?: ViewStyle;
}

export default function FloatingActionButton({ 
  onPress, 
  icon: Icon, 
  scrollY,
  style
}: FABProps) {
  const { colors } = useColorScheme();

  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};

    return {
      transform: [{
        translateY: interpolate(
          scrollY.value,
          [0, 100],
          [0, 100],
          Extrapolate.CLAMP
        ),
      }],
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0],
        Extrapolate.CLAMP
      ),
    };
  });

  return (
    <Animated.View style={[styles.fabContainer, animatedStyle, style]}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Icon size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: spacing.medium,
    bottom: Platform.OS === 'ios' ? 100 : 80,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});