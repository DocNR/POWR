// components/SimpleSplashScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Error preventing auto hide of splash screen:', error);
});

interface SplashScreenProps {
  onFinish: () => void;
}

const SimpleSplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('SimpleSplashScreen mounted');
    
    try {
      // Hide the native splash screen
      SplashScreen.hideAsync().catch((error) => {
        console.warn('Error hiding native splash screen:', error);
      });
    } catch (e) {
      console.error('Exception hiding splash screen:', e);
    }

    // Simulate video duration with a timeout
    const timer = setTimeout(() => {
      console.log('SimpleSplashScreen timer complete, calling onFinish');
      onFinish();
    }, 3000); // 3 seconds splash display for better visibility

    return () => {
      console.log('SimpleSplashScreen unmounting, clearing timer');
      clearTimeout(timer);
    };
  }, [onFinish]);

  const handleImageLoad = () => {
    console.log('Splash image loaded successfully');
    setImageLoaded(true);
  };

  const handleImageError = (e: any) => {
    console.error('Error loading splash image:', e);
    setError('Failed to load splash image');
  };

  return (
    <View style={styles.container}>
      {/* Logo image */}
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.image}
        resizeMode="contain"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {/* Show app name as text for better reliability */}
      <Text style={styles.appName}>POWR</Text>
      
      {/* Loading indicator */}
      <ActivityIndicator 
        size="large" 
        color="#ffffff" 
        style={styles.loader} 
      />
      
      {/* Error message if image fails to load */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
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
    width: Platform.OS === 'android' ? '70%' : '80%',
    height: Platform.OS === 'android' ? '70%' : '80%',
  },
  appName: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
  },
  loader: {
    marginTop: 30,
  },
  errorText: {
    color: '#ff6666',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});

export default SimpleSplashScreen;
