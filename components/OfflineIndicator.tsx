// components/OfflineIndicator.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, TouchableOpacity, Platform, StatusBar, SafeAreaView } from 'react-native';
import { useConnectivity } from '@/lib/db/services/ConnectivityService';
import { ConnectivityService } from '@/lib/db/services/ConnectivityService';
import { WifiOffIcon, RefreshCwIcon } from 'lucide-react-native';

/**
 * A component that displays an offline indicator when the app is offline
 * This should be placed high in the component tree
 */
export default function OfflineIndicator() {
  const { isOnline, lastOnlineTime, checkConnection } = useConnectivity();
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const [visibleOffline, setVisibleOffline] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add a delay before hiding the indicator to ensure connectivity is stable
  useEffect(() => {
    if (!isOnline) {
      // Show immediately when offline
      setVisibleOffline(true);
      // Clear any existing hide timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else if (isOnline && visibleOffline) {
      // Add a delay before hiding when coming back online
      hideTimerRef.current = setTimeout(() => {
        setVisibleOffline(false);
      }, 2000); // 2 second delay before hiding
    }
    
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isOnline, visibleOffline]);
  
  // Animate the indicator in and out based on visibility
  useEffect(() => {
    if (visibleOffline) {
      // Slide in from the top
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      // Slide out to the top
      Animated.timing(slideAnim, {
        toValue: -60,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [visibleOffline, slideAnim]);
  
  // Format last online time
  const lastOnlineText = lastOnlineTime 
    ? `Last online: ${new Date(lastOnlineTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
    : 'Not connected recently';
  
  // Handle manual refresh attempt
  const handleRefresh = () => {
    checkConnection();
  };
  
  // Don't render anything if online and animation has completed
  if (isOnline && !visibleOffline) return null;
  
  // Calculate header height to position the indicator below the header
  // Standard header heights: iOS ~44-48, Android ~56
  const headerHeight = Platform.OS === 'ios' ? 48 : 56;
  
  return (
    <Animated.View 
      style={{ 
        transform: [{ translateY: slideAnim }],
        position: 'absolute',
        top: headerHeight, // Position below the header
        left: 0,
        right: 0,
        zIndex: 50,
      }}
      className="bg-yellow-500/90 dark:bg-yellow-600/90"
    >
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center flex-1">
          <WifiOffIcon size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <View className="flex-1">
            <Text style={{ color: '#ffffff', fontWeight: '500', fontSize: 14 }}>Offline Mode</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{lastOnlineText}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={handleRefresh}
          style={{ 
            backgroundColor: 'rgba(255,255,255,0.2)', 
            borderRadius: 9999,
            padding: 8,
            marginLeft: 8
          }}
        >
          <RefreshCwIcon size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
