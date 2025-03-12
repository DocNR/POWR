// components/RelayManagement.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ActivityIndicator, TextInput, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRelayStore } from '@/lib/stores/relayStore';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, PlusCircle, AlertTriangle } from 'lucide-react-native';
import { RelayWithStatus } from '@/lib/db/services/RelayService';

interface RelayManagementProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function RelayManagement({ isVisible, onClose }: RelayManagementProps) {
  const relays = useRelayStore(state => state.relays);
  const isLoading = useRelayStore(state => state.isLoading);
  const isSaving = useRelayStore(state => state.isSaving);
  const loadRelays = useRelayStore(state => state.loadRelays);
  const updateRelay = useRelayStore(state => state.updateRelay);
  const applyChanges = useRelayStore(state => state.applyChanges);
  const resetToDefaults = useRelayStore(state => state.resetToDefaults);
  const addRelay = useRelayStore(state => state.addRelay);
  
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [showAddRelay, setShowAddRelay] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      loadRelays();
    }
  }, [isVisible]);
  
  // Track if there are unapplied changes
  const handleRelayUpdate = (url: string, changes: Partial<RelayWithStatus>) => {
    updateRelay(url, changes);
    setHasUnappliedChanges(true);
  };
  
  // Handle applying changes
  const handleApplyChanges = async () => {
    const success = await applyChanges();
    if (success) {
      setHasUnappliedChanges(false);
      // Success notification could be added here
    }
  };
  
  // Add new relay
  const handleAddRelay = async () => {
    if (!newRelayUrl || !newRelayUrl.startsWith('wss://')) {
      alert('Please enter a valid relay URL starting with wss://');
      return;
    }
    
    try {
      await addRelay(newRelayUrl);
      setNewRelayUrl('');
      setShowAddRelay(false);
      setHasUnappliedChanges(true);
    } catch (error) {
      alert(`Failed to add relay: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Reset to defaults with confirmation
  const handleResetToDefaults = async () => {
    if (confirmReset) {
      await resetToDefaults();
      setConfirmReset(false);
      setHasUnappliedChanges(true);
    } else {
      setConfirmReset(true);
      // Auto-reset the confirmation after 3 seconds
      setTimeout(() => setConfirmReset(false), 3000);
    }
  };
  
  // Status indicator color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected': return '#10b981'; // Green
      case 'connecting': return '#f59e0b'; // Amber
      case 'error': 
      case 'disconnected': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };
  
  // Render a relay item
  const renderRelayItem = ({ item }: { item: RelayWithStatus }) => (
    <View className="p-4 bg-card mb-2 rounded-lg border border-border">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: getStatusColor(item.status),
              marginRight: 8
            }}
          />
          <Text className="text-foreground flex-1" numberOfLines={1}>{item.url}</Text>
        </View>
        
        <Text className="text-xs text-muted-foreground capitalize">
          {item.status}
        </Text>
      </View>
      
      <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-border/30">
        <View className="flex-row items-center">
          <Text className="text-foreground mr-2">Read</Text>
          <Switch
            checked={item.read}
            onCheckedChange={() => handleRelayUpdate(item.url, { read: !item.read })}
          />
        </View>
        
        <View className="flex-row items-center">
          <Text className="text-foreground mr-2">Write</Text>
          <Switch
            checked={item.write}
            onCheckedChange={() => handleRelayUpdate(item.url, { write: !item.write })}
          />
        </View>
      </View>
    </View>
  );
  
  // Main Render
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} className="bg-background/95">
          {/* Header */}
          <View className="p-4 flex-row items-center justify-between bg-card border-b border-border">
            <Text className="text-xl font-semibold text-foreground">Relay Management</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} className="text-foreground" />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View className="flex-1 px-4 pt-2">
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
                <Text className="mt-2 text-foreground">Loading relays...</Text>
              </View>
            ) : (
              <>
                {/* Summary */}
                <View className="flex-row justify-between mb-2 items-center">
                  <Text className="text-foreground">
                    {relays.length} Relays ({relays.filter(r => r.status === 'connected').length} Connected)
                  </Text>
                  <TouchableOpacity onPress={loadRelays} className="p-2">
                    <RefreshCw size={18} className="text-primary" />
                  </TouchableOpacity>
                </View>
                
                {/* Relay List */}
                {relays.length === 0 ? (
                  <View className="items-center justify-center py-8">
                    <Text className="text-muted-foreground mb-4">No relays configured</Text>
                    <Button 
                      variant="outline" 
                      onPress={handleResetToDefaults}
                    >
                      <Text>Reset to Defaults</Text>
                    </Button>
                  </View>
                ) : (
                  <FlatList
                    data={relays}
                    renderItem={renderRelayItem}
                    keyExtractor={(item) => item.url}
                    ListEmptyComponent={
                      <View className="items-center justify-center py-8">
                        <Text className="text-muted-foreground">No relays found</Text>
                      </View>
                    }
                    contentContainerStyle={{ paddingBottom: showAddRelay ? 180 : 100 }}
                  />
                )}
                
                {/* Add Relay Form */}
                {showAddRelay && (
                  <View className="bg-card p-4 rounded-lg mb-4 mt-2 border border-border">
                    <Text className="text-foreground mb-2">Add New Relay</Text>
                    <TextInput
                      className="bg-background text-foreground p-2 rounded-md border border-border mb-2"
                      placeholder="wss://relay.example.com"
                      placeholderTextColor="#6b7280"
                      value={newRelayUrl}
                      onChangeText={setNewRelayUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <View className="flex-row justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onPress={() => setShowAddRelay(false)}
                      >
                        <Text>Cancel</Text>
                      </Button>
                      <Button 
                        onPress={handleAddRelay}
                        disabled={!newRelayUrl.startsWith('wss://')}
                      >
                        <Text className="text-primary-foreground">Add Relay</Text>
                      </Button>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
          
          {/* Footer */}
          <View className="p-4 bg-card border-t border-border">
            <View className="flex-row gap-2 mb-2">
              <Button 
                className="flex-1" 
                onPress={handleApplyChanges}
                disabled={!hasUnappliedChanges || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-primary-foreground">Apply Changes</Text>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onPress={() => setShowAddRelay(true)}
                disabled={showAddRelay}
              >
                <PlusCircle size={18} className="mr-1" />
                <Text>Add Relay</Text>
              </Button>
            </View>
            
            <Button 
              variant={confirmReset ? "destructive" : "outline"} 
              onPress={handleResetToDefaults}
            >
              <Text className={confirmReset ? "text-destructive-foreground" : ""}>
                {confirmReset ? "Confirm Reset" : "Reset to Defaults"}
              </Text>
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}