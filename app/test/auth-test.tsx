import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Button, Text, Platform, ActivityIndicator } from 'react-native';
import { useAuthState, useAuth } from '@/lib/auth/AuthProvider';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { useNDKStore } from '@/lib/stores/ndk';
import AuthStatus from '@/components/auth/AuthStatus';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

/**
 * Internal component that uses auth hooks - must be inside AuthProvider
 */
function AuthTestContent() {
  const { top, bottom } = useSafeAreaInsets();
  const authState = useAuthState();
  const { authService } = useAuth();
  const [privateKey, setPrivateKey] = React.useState('');
  
  // Login with private key
  const handleLoginWithPrivateKey = async () => {
    try {
      // For testing, just use a generated key or a newly generated one
      if (privateKey) {
        await authService.loginWithPrivateKey(privateKey);
      } else {
        await authService.createEphemeralKey();
      }
    } catch (error) {
      console.error("Login error:", error);
    }
  };
  
  // Create ephemeral key
  const handleCreateEphemeralKey = async () => {
    try {
      await authService.createEphemeralKey();
    } catch (error) {
      console.error("Ephemeral key error:", error);
    }
  };
  
  // Generate signing operations for testing
  const handleSimulateSigningOperations = async () => {
    // We can only test this if we're authenticated
    if (authState.status !== 'authenticated') {
      console.log("Can't simulate signing operations when not authenticated");
      return;
    }
    
    // Simulate signing 3 operations with delays
    for (let i = 0; i < 3; i++) {
      // Create a minimal NostrEvent for testing
      const event = {
        id: `event-${i}`,
        pubkey: authState.user.pubkey,
        content: `Test event ${i}`,
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        sig: '',
      };
      
      // Create a proper SigningOperation
      const operation = {
        event: event as any, // Type assertion to satisfy NostrEvent requirement
        timestamp: Date.now(),
        resolve: () => {},
        reject: () => {},
      };
      
      // Start signing
      authState.setSigningInProgress(true, operation);
      
      // After 1 second, complete the operation
      setTimeout(() => {
        authState.setSigningInProgress(false, operation);
      }, 1000 * (i + 1));
    }
  };
  
  return (
    <View style={[styles.container, { paddingTop: top, paddingBottom: bottom }]}>
      <Stack.Screen
        options={{
          title: 'Authentication Test',
          headerShown: true,
        }}
      />
      <StatusBar style="auto" />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Authentication System Test</Text>
        
        {/* Current authentication status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <AuthStatus />
        </View>
        
        {/* Authentication actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication Actions</Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              title="Create Ephemeral Key" 
              onPress={handleCreateEphemeralKey}
              disabled={authState.status === 'authenticating' || authState.status === 'signing'}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              title="Login with Private Key" 
              onPress={handleLoginWithPrivateKey}
              disabled={authState.status === 'authenticating' || authState.status === 'signing'}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              title="Simulate Signing Operations" 
              onPress={handleSimulateSigningOperations}
              disabled={authState.status !== 'authenticated'}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              title="Logout" 
              onPress={() => authService.logout()}
              disabled={!['authenticated', 'error', 'signing'].includes(authState.status)}
              color="#d32f2f"
            />
          </View>
        </View>
        
        {/* State details for debugging */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auth State Details</Text>
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              {(() => {
                // Create base state object with just status
                const stateObj: any = {
                  status: authState.status
                };
                
                // Add properties based on auth state
                if (authState.status === 'authenticated' || authState.status === 'signing') {
                  stateObj.method = (authState as any).method;
                  if ((authState as any).user) {
                    stateObj.user = {
                      npub: (authState as any).user.npub,
                      pubkey: (authState as any).user.pubkey,
                    };
                  }
                }
                
                if (authState.status === 'signing') {
                  stateObj.operationCount = (authState as any).operationCount;
                }
                
                if (authState.status === 'authenticating') {
                  stateObj.method = (authState as any).method;
                }
                
                if (authState.status === 'error') {
                  stateObj.error = (authState as any).error?.message;
                }
                
                return JSON.stringify(stateObj, null, 2);
              })()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Wrapper component that provides the AuthProvider
 */
export default function AuthTestPage() {
  // Get NDK instance from the store (already initialized in app root)
  const ndk = useNDKStore(state => state.ndk);
  const [isInitialized, setIsInitialized] = useState(false);

  // Wait for NDK to be available
  useEffect(() => {
    if (ndk) {
      setIsInitialized(true);
    }
  }, [ndk]);

  // Loading state while NDK initializes
  if (!isInitialized || !ndk) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading NDK for auth test...</Text>
      </View>
    );
  }

  return (
    <AuthProvider ndk={ndk}>
      <AuthTestContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  buttonContainer: {
    marginBottom: 12,
  },
  stateContainer: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  stateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
});
