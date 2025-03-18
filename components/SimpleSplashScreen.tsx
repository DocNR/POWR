// components/SimpleSplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error */
});

interface SplashScreenProps {
  onFinish: () => void;
}

const SimpleSplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    // Hide the native splash screen
    SplashScreen.hideAsync().catch(() => {
      /* ignore error */
    });

    // Simulate video duration with a timeout
    const timer = setTimeout(() => {
      onFinish();
    }, 2000); // 2 seconds splash display

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      {/* Use a static image as fallback */}
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <ActivityIndicator 
        size="large" 
        color="#ffffff" 
        style={styles.loader} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '80%',
    height: '80%',
  },
  loader: {
    position: 'absolute',
    bottom: 100,
  },
});

export default SimpleSplashScreen;