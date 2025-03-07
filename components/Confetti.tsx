// components/Confetti.tsx - enhanced version
import React, { useEffect, useRef } from 'react';
import { View, Dimensions, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Adjust number of confetti based on device performance capabilities
const CONFETTI_SIZE = 15;
const NUMBER_OF_CONFETTI = Platform.OS === 'web' ? 80 : 60; // Reduce for mobile
const ANIMATION_DURATION = 5000; // 5 seconds total
const CONFETTI_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple (match app's purple)
  '#EC4899', // pink
  '#F97316', // orange
  '#06B6D4', // cyan
];

interface ConfettiProps {
  onComplete?: () => void;
  zIndex?: number; // Allow customizing z-index
  density?: 'low' | 'medium' | 'high'; // Control confetti density
}

const Confetti: React.FC<ConfettiProps> = ({ 
  onComplete, 
  zIndex = 1000,
  density = 'medium' 
}) => {
  // Track animations for cleanup
  const animationsRef = useRef<Animated.SharedValue<number>[]>([]);
  
  // Adjust number of confetti based on density
  const confettiCount = density === 'low' ? 
    Math.floor(NUMBER_OF_CONFETTI * 0.6) : 
    density === 'high' ? 
      Math.floor(NUMBER_OF_CONFETTI * 1.3) : 
      NUMBER_OF_CONFETTI;

  // Call onComplete callback
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };
  
  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      animationsRef.current.forEach(anim => {
        cancelAnimation(anim);
      });
    };
  }, []);

  const confettiPieces = Array.from({ length: confettiCount }).map((_, index) => {
    // Randomize starting position within a narrower area for more focal explosion
    const startX = SCREEN_WIDTH / 2 + (Math.random() - 0.5) * SCREEN_WIDTH * 0.3;
    const startY = SCREEN_HEIGHT * 0.55; // Start more centrally
    
    const translateY = useSharedValue(startY);
    const translateX = useSharedValue(startX);
    const rotate = useSharedValue(0);
    const scale = useSharedValue(0);
    const opacity = useSharedValue(1);
    
    // Track animation values for cleanup
    animationsRef.current.push(translateY, translateX, rotate, scale, opacity);

    // Varied random positions
    const angle = (Math.random() * Math.PI * 2); // Random angle in radians
    const distance = Math.random() * Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 0.5;
    const randomEndX = startX + Math.cos(angle) * distance;
    
    // More upward movement for most confetti
    const upwardBias = Math.random() * 0.8 + 0.1; // 0.1 to 0.9
    const randomEndY = startY - (SCREEN_HEIGHT * upwardBias);
    
    const randomRotation = Math.random() * 1000 - 500; // -500 to 500 degrees
    const randomDelay = Math.random() * 500; // 0 to 500ms
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    
    // Add gravity effect for more natural falling
    const gravityEffect = Math.random() * 300 + 100; // Different "weights"

    useEffect(() => {
      // Dramatic scale up
      scale.value = withSequence(
        withDelay(randomDelay, withSpring(1.2, { damping: 3 })),
        withDelay(ANIMATION_DURATION - 1000, withTiming(0, { duration: 1000 }))
      );

      // Natural movement with gravity
      translateY.value = withSequence(
        // Initial burst upward
        withDelay(
          randomDelay,
          withSpring(randomEndY, {
            velocity: -100,
            damping: 10,
            stiffness: 80
          })
        ),
        // Then fall with gravity
        withTiming(randomEndY + gravityEffect, {
          duration: ANIMATION_DURATION - randomDelay - 1000
        })
      );

      translateX.value = withSequence(
        withDelay(
          randomDelay,
          withSpring(randomEndX, {
            velocity: 50,
            damping: 15,
            stiffness: 40
          })
        )
      );

      // Continuous rotation
      rotate.value = withSequence(
        withDelay(
          randomDelay,
          withTiming(randomRotation, {
            duration: ANIMATION_DURATION
          })
        )
      );

      // Slower fade out
      opacity.value = withDelay(
        ANIMATION_DURATION - 1000,
        withTiming(0, { 
          duration: 1000,
        })
      );

      // Trigger completion callback after all confetti are done
      if (index === confettiCount - 1) {
        setTimeout(() => {
          runOnJS(handleComplete)();
        }, ANIMATION_DURATION + 500); // Add a small buffer to ensure all pieces are done
      }
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
        { scale: scale.value }
      ],
      opacity: opacity.value,
    }));

    // More varied shapes
    const shapeType = index % 4; // 4 different shapes
    const shape = {
      width: shapeType === 1 ? CONFETTI_SIZE * 2 : CONFETTI_SIZE,
      height: shapeType === 1 ? CONFETTI_SIZE : shapeType === 2 ? CONFETTI_SIZE * 2 : CONFETTI_SIZE,
      borderRadius: shapeType === 3 ? CONFETTI_SIZE / 2 : 2,
    };

    return (
      <Animated.View
        key={index}
        style={[
          {
            position: 'absolute',
            width: shape.width,
            height: shape.height,
            backgroundColor: color,
            borderRadius: shape.borderRadius,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 1,
            },
            shadowOpacity: 0.2,
            shadowRadius: 1.5,
            elevation: 2,
          },
          animatedStyle,
        ]}
      />
    );
  });

  return (
    <View 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: zIndex,
        pointerEvents: 'none', // Allow interaction with elements behind confetti
      }}
      pointerEvents="none"
    >
      {confettiPieces}
    </View>
  );
};

export default Confetti;