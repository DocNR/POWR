import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuthState, useAuth } from '@/lib/auth/AuthProvider';

/**
 * Component that displays the current authentication status and provides logout functionality
 */
export default function AuthStatus() {
  const authState = useAuthState();
  const { authService } = useAuth();
  
  /**
   * Handle logout button press
   */
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  
  // Render different UI based on auth state
  switch (authState.status) {
    case 'unauthenticated':
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Not logged in</Text>
        </View>
      );
      
    case 'authenticating':
      return (
        <View style={styles.container}>
          <ActivityIndicator size="small" color="#0066cc" style={styles.spinner} />
          <Text style={styles.text}>Logging in... ({authState.method})</Text>
        </View>
      );
      
    case 'authenticated':
      return (
        <View style={styles.container}>
          <View style={styles.userInfo}>
            <Text style={styles.text}>
              Logged in as: {authState.user?.npub?.substring(0, 8)}...
            </Text>
            <Text style={styles.methodText}>
              Method: {authState.method}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      );
      
    case 'signing':
      return (
        <View style={styles.container}>
          <View style={styles.userInfo}>
            <Text style={styles.text}>
              Logged in as: {authState.user?.npub?.substring(0, 8)}...
            </Text>
            <View style={styles.signingContainer}>
              <ActivityIndicator size="small" color="#0066cc" style={styles.spinner} />
              <Text style={styles.signingText}>
                Signing {authState.operationCount} operations...
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.logoutButton, { opacity: 0.5 }]} disabled>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      );
      
    case 'error':
      return (
        <View style={styles.container}>
          <Text style={styles.errorText}>
            Error: {authState.error?.message || "Unknown error"}
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Reset</Text>
          </TouchableOpacity>
        </View>
      );
      
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginVertical: 8,
  },
  userInfo: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: '#333',
  },
  methodText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  spinner: {
    marginRight: 10,
  },
  signingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  signingText: {
    fontSize: 12,
    color: '#0066cc',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 16,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
