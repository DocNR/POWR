// components/workout/WorkoutOfflineState.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { WifiOffIcon, RefreshCwIcon, ArrowLeftIcon } from 'lucide-react-native';
import { useConnectivity } from '@/lib/db/services/ConnectivityService';
import { useRouter } from 'expo-router';

interface WorkoutOfflineStateProps {
  workoutId?: string;
}

export default function WorkoutOfflineState({ workoutId }: WorkoutOfflineStateProps) {
  const { lastOnlineTime, checkConnection } = useConnectivity();
  const router = useRouter();
  
  // Format last online time
  const lastOnlineText = lastOnlineTime 
    ? `Last online: ${new Date(lastOnlineTime).toLocaleDateString()} at ${new Date(lastOnlineTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
    : 'Not connected recently';
  
  // Handle manual refresh attempt
  const handleRefresh = () => {
    checkConnection();
  };
  
  // Handle go back
  const handleGoBack = () => {
    router.back();
  };
  
  return (
    <View className="flex-1 items-center justify-center p-6 bg-background">
      <View className="bg-muted rounded-xl p-6 items-center max-w-md w-full">
        <WifiOffIcon size={48} color="#666" style={{ marginBottom: 16 }} />
        
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
          You're offline
        </Text>
        
        <Text style={{ textAlign: 'center', marginBottom: 16, color: '#666' }}>
          {workoutId 
            ? "This workout can't be loaded while you're offline. Please check your connection and try again."
            : "Workout details can't be loaded while you're offline. Please check your connection and try again."}
        </Text>
        
        <Text style={{ fontSize: 12, marginBottom: 24, color: 'rgba(102,102,102,0.7)' }}>
          {lastOnlineText}
        </Text>
        
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={{
              backgroundColor: 'rgba(200,200,200,0.5)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              marginRight: 8
            }}
          >
            <ArrowLeftIcon size={16} color="#666" style={{ marginRight: 8 }} />
            <Text style={{ color: '#666', fontWeight: '500' }}>
              Go Back
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              backgroundColor: '#007bff',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <RefreshCwIcon size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '500' }}>
              Check Connection
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * A higher-order component that wraps workout detail screens to handle offline state
 */
export function withWorkoutOfflineState<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { workoutId?: string; workout?: any }> {
  return (props: P & { workoutId?: string; workout?: any }) => {
    const { isOnline } = useConnectivity();
    
    // If we're online or we already have the workout data locally, show the component
    if (isOnline || props.workout) {
      return <Component {...props} />;
    }
    
    // Otherwise show the offline state
    return <WorkoutOfflineState workoutId={props.workoutId} />;
  };
}
