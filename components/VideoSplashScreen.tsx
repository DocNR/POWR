// components/VideoSplashScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

interface VideoSplashScreenProps {
  onFinish: () => void;
}

const VideoSplashScreen: React.FC<VideoSplashScreenProps> = ({ onFinish }) => {
  const videoRef = useRef<Video>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Hide the native splash screen once our component is ready
    if (isVideoLoaded) {
      console.log('Video loaded, hiding native splash screen');
      SplashScreen.hideAsync().catch(e => console.log('Error hiding splash screen:', e));
    }
  }, [isVideoLoaded]);

  const handleVideoLoad = () => {
    console.log('Video loaded successfully');
    setIsVideoLoaded(true);
    // Start playing the video once it's loaded
    videoRef.current?.playAsync().catch(e => {
      console.error('Error playing video:', e);
      // If video fails to play, just call onFinish
      onFinish();
    });
  };

  const handleVideoError = (error: string) => {
    console.error('Video error:', error);
    setError(error);
    // On error, skip the video and move to the app
    onFinish();
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    // Type-safe handling of playback status
    if (!status.isLoaded) {
      // Handle error state
      if (status.error) {
        handleVideoError(`Video error: ${status.error}`);
      }
      return;
    }
    
    // When video finishes playing, call the onFinish callback
    if (status.didJustFinish) {
      console.log('Video finished playing');
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require('../assets/splash.mov')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        onLoad={handleVideoLoad}
        onError={(error) => handleVideoError(error.toString())}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        shouldPlay={false} // We'll play it manually after load
        progressUpdateIntervalMillis={50} // More frequent updates
      />
      {!isVideoLoaded && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default VideoSplashScreen;