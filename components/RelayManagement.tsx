// components/RelayManagement.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, Alert, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Switch } from 'react-native-gesture-handler'; // Or your UI library's Switch component
import { useRelayStore } from '@/lib/stores/relayStore';
import { useNDKStore } from '@/lib/stores/ndk';
import { RelayWithStatus } from '@/lib/db/services/RelayService';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export default function RelayManagement({ isVisible, onClose }: Props) {
  // Get relay state and actions from the store
  const relays = useRelayStore(state => state.relays);
  const isLoading = useRelayStore(state => state.isLoading);
  const isRefreshing = useRelayStore(state => state.isRefreshing);
  const isSaving = useRelayStore(state => state.isSaving);
  const loadRelays = useRelayStore(state => state.loadRelays);
  const addRelay = useRelayStore(state => state.addRelay);
  const removeRelay = useRelayStore(state => state.removeRelay);
  const updateRelay = useRelayStore(state => state.updateRelay);
  const applyChanges = useRelayStore(state => state.applyChanges);
  const resetToDefaults = useRelayStore(state => state.resetToDefaults);
  
  // Get current user for import/export functions
  const { ndk, currentUser } = useNDKStore();
  
  // Local state
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [isAddingRelay, setIsAddingRelay] = useState(false);
  
  // Load relays when component mounts or becomes visible
  useEffect(() => {
    if (isVisible) {
      console.log('[RelayManagement] Component became visible, loading relays');
      loadRelays();
    }
  }, [isVisible, loadRelays]);

  // Debug logging
  useEffect(() => {
    if (isVisible) {
      console.log('[RelayManagement] Component state:', {
        relaysCount: relays.length,
        isLoading,
        isRefreshing,
        isAddingRelay
      });
      
      // Log the first relay for inspection
      if (relays.length > 0) {
        console.log('[RelayManagement] First relay:', relays[0]);
      } else {
        console.log('[RelayManagement] No relays loaded');
      }
    }
  }, [isVisible, relays, isLoading, isRefreshing, isAddingRelay]);
  
  // Function to add a new relay
  const handleAddRelay = async () => {
    if (!newRelayUrl || !newRelayUrl.startsWith('wss://')) {
      Alert.alert('Invalid Relay URL', 'Relay URL must start with wss://');
      return;
    }
    
    try {
      await addRelay(newRelayUrl);
      setNewRelayUrl('');
      setIsAddingRelay(false);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add relay');
    }
  };
  
  // Function to handle relay removal with confirmation
  const handleRemoveRelay = (url: string) => {
    Alert.alert(
      'Remove Relay',
      `Are you sure you want to remove ${url}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeRelay(url);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove relay');
            }
          }
        }
      ]
    );
  };
  
  // Function to toggle read/write permission
  const handleTogglePermission = (url: string, permission: 'read' | 'write') => {
    const relay = relays.find(r => r.url === url);
    if (relay) {
      console.log(`[RelayManagement] Toggling ${permission} for relay ${url}`);
      updateRelay(url, { [permission]: !relay[permission] });
    }
  };
  
  // Function to apply changes
  const handleApplyChanges = async () => {
    try {
      console.log('[RelayManagement] Applying changes...');
      const success = await applyChanges();
      if (success) {
        Alert.alert('Success', 'Relay configuration applied successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to apply relay configuration');
    }
  };
  
  // Function to reset to defaults with confirmation
  const handleResetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all relays to the default configuration?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToDefaults();
              Alert.alert('Success', 'Relays reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset relays');
            }
          }
        }
      ]
    );
  };
  
  // Function to get color based on relay status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10b981'; // Green
      case 'connecting': return '#f59e0b'; // Amber
      case 'error': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };
  
  // Render a relay item
  const renderRelayItem = ({ item }: { item: RelayWithStatus }) => {
    console.log(`[RelayManagement] Rendering relay: ${item.url}, status: ${item.status}`);
    return (
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View 
              style={{ 
                width: 12, 
                height: 12, 
                borderRadius: 6, 
                backgroundColor: getStatusColor(item.status),
                marginRight: 8 
              }} 
            />
            <Text numberOfLines={1} style={{ flex: 1 }}>{item.url}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => handleRemoveRelay(item.url)}
            style={{ padding: 8 }}
          >
            <Text style={{ color: '#ef4444' }}>Remove</Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'space-around' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ marginRight: 8 }}>Read</Text>
            <Switch 
              value={item.read} 
              onValueChange={() => handleTogglePermission(item.url, 'read')}
            />
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ marginRight: 8 }}>Write</Text>
            <Switch 
              value={item.write} 
              onValueChange={() => handleTogglePermission(item.url, 'write')}
            />
          </View>
        </View>
      </View>
    );
  };
  
  // Reset component state
  const resetComponent = () => {
    setIsAddingRelay(false);
    setNewRelayUrl('');
    loadRelays();
  };

  // Error handler
  const handleError = (error: any) => {
    console.error('[RelayManagement] Error:', error);
    Alert.alert('Error', error instanceof Error ? error.message : 'An unknown error occurred');
    resetComponent();
  };
  
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12 }}>
          {/* Header */}
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Manage Relays</Text>
            <TouchableOpacity onPress={onClose}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View style={{ flex: 1 }}>
            {isLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 16 }}>Loading relays...</Text>
              </View>
            ) : (
              <>
                {/* Relay list */}
                {relays.length === 0 ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ marginBottom: 16 }}>No relays configured</Text>
                    <TouchableOpacity 
                      onPress={handleResetToDefaults}
                      style={{ padding: 10, backgroundColor: '#e5e7eb', borderRadius: 8 }}
                    >
                      <Text>Reset to Defaults</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={relays}
                    keyExtractor={(item) => item.url}
                    renderItem={renderRelayItem}
                    ListEmptyComponent={
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text>No relays found. Try resetting to defaults.</Text>
                      </View>
                    }
                  />
                )}
                
                {/* Add relay section */}
                {isAddingRelay ? (
                  <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                    <Text style={{ marginBottom: 8 }}>Add New Relay</Text>
                    <TextInput
                      style={{ 
                        borderWidth: 1, 
                        borderColor: '#e5e7eb', 
                        borderRadius: 8, 
                        padding: 10,
                        marginBottom: 12
                      }}
                      placeholder="wss://relay.example.com"
                      value={newRelayUrl}
                      onChangeText={setNewRelayUrl}
                      autoCapitalize="none"
                    />
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <TouchableOpacity 
                        onPress={() => setIsAddingRelay(false)}
                        style={{ 
                          padding: 10, 
                          backgroundColor: '#e5e7eb', 
                          borderRadius: 8,
                          flex: 1,
                          marginRight: 8,
                          alignItems: 'center'
                        }}
                      >
                        <Text>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={handleAddRelay}
                        style={{ 
                          padding: 10, 
                          backgroundColor: '#3b82f6', 
                          borderRadius: 8,
                          flex: 1,
                          alignItems: 'center'
                        }}
                        disabled={!newRelayUrl.startsWith('wss://')}
                      >
                        <Text style={{ color: '#fff' }}>Add Relay</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
                    <TouchableOpacity 
                      onPress={() => setIsAddingRelay(true)}
                      style={{ 
                        padding: 10, 
                        backgroundColor: '#e5e7eb', 
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                    >
                      <Text>Add New Relay</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
          
          {/* Footer */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
            <TouchableOpacity 
              onPress={handleApplyChanges}
              style={{ 
                padding: 14, 
                backgroundColor: '#3b82f6', 
                borderRadius: 8,
                alignItems: 'center'
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '500' }}>Apply Changes</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleResetToDefaults}
              style={{ 
                padding: 14, 
                backgroundColor: 'transparent', 
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 8
              }}
            >
              <Text>Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}