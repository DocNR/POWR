// components/social/SocialOfflineState.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { WifiOffIcon, RefreshCwIcon } from 'lucide-react-native';
import { useConnectivity } from '@/lib/db/services/ConnectivityService';

/**
 * A component to display when social features are unavailable due to offline status
 */
export default function SocialOfflineState() {
  const { isOnline, lastOnlineTime, checkConnection } = useConnectivity();
  
  // Format last online time
  const lastOnlineText = lastOnlineTime 
    ? `Last online: ${new Date(lastOnlineTime).toLocaleDateString()} at ${new Date(lastOnlineTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
    : 'Not connected recently';
  
  // Handle manual refresh attempt
  const handleRefresh = () => {
    checkConnection();
  };
  
  return (
    <View className="flex-1 items-center justify-center p-6">
      <View className="bg-muted rounded-xl p-6 items-center max-w-md w-full">
        <WifiOffIcon size={48} color="#666" style={{ marginBottom: 16 }} />
        
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#333' }}>
          You're offline
        </Text>
        
        <Text style={{ textAlign: 'center', marginBottom: 16, color: '#666' }}>
          Social features require an internet connection. Your workouts are still being saved locally and will sync when you're back online.
        </Text>
        
        <Text style={{ fontSize: 12, marginBottom: 24, color: 'rgba(102,102,102,0.7)' }}>
          {lastOnlineText}
        </Text>
        
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
  );
}

/**
 * A higher-order component that wraps social screens to handle offline state
 */
export function withOfflineState<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    const { isOnline } = useConnectivity();
    
    if (!isOnline) {
      return <SocialOfflineState />;
    }
    
    return <Component {...props} />;
  };
}
