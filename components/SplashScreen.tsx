// components/SplashScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import Animated, { 
  useAnimatedStyle,
  withTiming,
  Easing,
  useSharedValue,
  runOnJS
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const deviceColorScheme = useDeviceColorScheme();
  const backgroundColor = deviceColorScheme === 'dark' ? '#000000' : '#FFFFFF';
  const [videoFinished, setVideoFinished] = useState(false);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (videoFinished) {
      opacity.value = withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      }, (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      });
    }
  }, [videoFinished]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }));

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor },
        animatedStyle
      ]}
    >
      <Video
        source={require('@/assets/videos/splash.mov')}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            setVideoFinished(true);
          }
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: '100%',
    height: Platform.OS === 'web' ? SCREEN_HEIGHT : '100%',
  }
});