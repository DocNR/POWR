// components/sheets/RelayManagementSheet.tsx
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  X, Trash, RefreshCw, RotateCcw, Upload, Download, Info 
} from 'lucide-react-native';
import { Switch } from '@/components/ui/switch';
import { useColorScheme } from '@/lib/useColorScheme';
import { useRelayStore } from '@/lib/stores/relayStore';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';

interface RelayManagementSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function RelayManagementSheet({ open, onClose }: RelayManagementSheetProps) {
  const { isDarkColorScheme } = useColorScheme();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  
  // Use relay store
  const {
    relays,
    isLoading,
    isRefreshing,
    isSaving,
    error,
    loadRelays,
    addRelay,
    removeRelay,
    updateRelay,
    applyChanges,
    resetToDefaults,
    importFromMetadata,
    publishRelayList
  } = useRelayStore();
  
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Status refresh interval
  const [statusRefreshInterval, setStatusRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Load relays when sheet opens
  useEffect(() => {
    if (open) {
      // Load relays only once when opening
      loadRelays();
      
      // Optional: Set up a one-time refresh after a delay 
      // to update status after connections are established
      const timeout = setTimeout(() => {
        if (!isLoading && !isRefreshing) {
          loadRelays();
        }
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [open, loadRelays, isLoading, isRefreshing]);
  
  // Add a manual refresh button instead of auto-refreshing
  const RefreshButton = () => (
    <Button 
      variant="ghost" 
      size="icon"
      onPress={handleRefreshStatus}
      disabled={isLoading || isRefreshing}
    >
      <RefreshCw size={20} color={isLoading || isRefreshing ? "#ccc" : undefined} />
    </Button>
  );
  
  // Function to manually refresh relay status
  const handleRefreshStatus = () => {
    if (!isLoading && !isRefreshing) {
      loadRelays();
    }
  };
  
  // Function to add a new relay
  const handleAddRelay = async () => {
    try {
      await addRelay(newRelayUrl);
      // Reset input
      setNewRelayUrl('');
      setIsAddingNew(false);
      
      // Refresh relay status after adding
      setTimeout(() => loadRelays(), 1000);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add relay');
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
              
              // Refresh relay status after removing
              setTimeout(() => loadRelays(), 1000);
            } catch (err) {
              Alert.alert('Error', 'Failed to remove relay');
            }
          }
        }
      ]
    );
  };
  
  // Function to toggle read/write permission
  const handleTogglePermission = async (url: string, permission: 'read' | 'write') => {
    const relay = relays.find(r => r.url === url);
    if (relay) {
      try {
        await updateRelay(url, { [permission]: !relay[permission] });
        
        // No need to refresh status immediately as permissions don't affect connection
        // But we do need to update the UI
        loadRelays();
      } catch (err) {
        Alert.alert('Error', 'Failed to update relay permission');
      }
    }
  };
  
  // Function to handle saving relay changes
  const handleSaveRelays = async () => {
    try {
      const success = await applyChanges();
      if (success) {
        Alert.alert('Success', 'Relay configuration applied successfully');
        
        // Refresh relay status after applying changes
        setTimeout(() => loadRelays(), 2000);
      } else {
        Alert.alert('Error', 'Failed to apply relay configuration');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save relay configuration');
    }
  };
  
  // Function to handle resetting to defaults with confirmation
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
            } catch (err) {
              Alert.alert('Error', 'Failed to reset relays');
            }
          }
        }
      ]
    );
  };
  
  // Import from user metadata with confirmation
  const handleImportFromMetadata = async () => {
    if (!isAuthenticated || !currentUser?.pubkey) {
      Alert.alert('Error', 'You must be logged in to import relay preferences');
      return;
    }
    
    Alert.alert(
      'Import from Profile',
      'This will import relay preferences from your published metadata. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Import', 
          onPress: async () => {
            try {
              await importFromMetadata(currentUser.pubkey);
              Alert.alert('Success', 'Relay preferences imported successfully');
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to import relay preferences');
            }
          }
        }
      ]
    );
  };
  
  // Publish relay list with confirmation
  const handlePublishRelayList = async () => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'You must be logged in to publish relay preferences');
      return;
    }
    
    Alert.alert(
      'Publish Relay List',
      'This will publish your relay preferences to the Nostr network. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Publish', 
          onPress: async () => {
            try {
              const success = await publishRelayList();
              if (success) {
                Alert.alert('Success', 'Relay list published successfully');
              } else {
                Alert.alert('Error', 'Failed to publish relay list');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to publish relay list');
            }
          }
        }
      ]
    );
  };
  
  const getRelayStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return '#10b981'; // green
      case 'connecting': return '#f59e0b'; // amber
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };
  
  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View className={`bg-background ${isDarkColorScheme ? 'bg-card border border-border' : ''} rounded-lg w-[95%] max-h-[80%] shadow-xl`}>
          <View className="flex-row justify-between items-center p-6 border-b border-border">
            <Text className="text-xl font-bold">Manage Relays</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="p-6" contentContainerStyle={{ paddingBottom: 20 }}>
            {isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" />
                <Text className="mt-4">Loading relays...</Text>
              </View>
            ) : relays.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-center mb-4">No relays configured</Text>
                <Button onPress={handleResetToDefaults}>
                  <RotateCcw size={18} className="mr-2" />
                  <Text>Reset to Defaults</Text>
                </Button>
              </View>
            ) : (
              <View className="space-y-4">
                {/* Relay list */}
                {relays.map((relay) => (
                  <View key={relay.url} className="border border-border rounded-lg p-4">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1 mr-2">
                        <View className="flex-row items-center">
                          <View 
                            style={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: 5, 
                              backgroundColor: getRelayStatusColor(relay.status),
                              marginRight: 8
                            }}
                          />
                          <Text className="font-medium" numberOfLines={1}>
                            {relay.url}
                          </Text>
                        </View>
                        <Text className="text-sm text-muted-foreground mt-1">
                          {relay.status === 'connected' ? 'Connected' : 
                           relay.status === 'connecting' ? 'Connecting...' : 
                           relay.status === 'error' ? 'Connection Error' : 'Disconnected'}
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => handleRemoveRelay(relay.url)}
                        className="p-2"
                      >
                        <Trash size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Relay permissions */}
                    <View className="flex-row mt-3 space-x-6">
                      <View className="flex-row items-center">
                        <Text className="mr-2">Read</Text>
                        <Switch 
                          checked={relay.read}
                          onCheckedChange={() => handleTogglePermission(relay.url, 'read')}
                        />
                      </View>
                      <View className="flex-row items-center">
                        <Text className="mr-2">Write</Text>
                        <Switch 
                          checked={relay.write}
                          onCheckedChange={() => handleTogglePermission(relay.url, 'write')}
                        />
                      </View>
                    </View>
                  </View>
                ))}
                
                {/* Add new relay section */}
                {isAddingNew ? (
                  <View className="mt-4 border border-border rounded-lg p-4">
                    <Text className="mb-2">Add New Relay</Text>
                    <Input
                      placeholder="wss://relay.example.com"
                      value={newRelayUrl}
                      onChangeText={setNewRelayUrl}
                      autoCapitalize="none"
                      style={{ paddingVertical: 12 }}
                    />
                    <View className="flex-row gap-4 mt-4">
                      <Button 
                        variant="outline"
                        onPress={() => setIsAddingNew(false)}
                        className="flex-1"
                      >
                        <Text>Cancel</Text>
                      </Button>
                      <Button 
                        onPress={handleAddRelay}
                        disabled={!newRelayUrl.startsWith('wss://')}
                        className="flex-1"
                      >
                        <Text className="text-white">Add Relay</Text>
                      </Button>
                    </View>
                  </View>
                ) : (
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onPress={() => setIsAddingNew(true)}
                  >
                    <Text>Add Relay</Text>
                  </Button>
                )}
                
                {/* Advanced options toggle */}
                <Button
                  variant="ghost"
                  className="mt-2"
                  onPress={() => setShowAdvanced(!showAdvanced)}
                >
                  <Text>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}</Text>
                </Button>
                
                {/* Advanced options section */}
                {showAdvanced && (
                  <View className="mt-4 space-y-4">
                    <Separator />
                    
                    <Text className="font-semibold text-base">Advanced Options</Text>
                    
                    {isAuthenticated && (
                      <View className="space-y-3">
                        <Button
                          variant="outline"
                          onPress={handleImportFromMetadata}
                          className="w-full"
                        >
                          <Download size={18} className="mr-2" />
                          <Text>Import from Profile</Text>
                        </Button>
                        
                        <Button
                          variant="outline"
                          onPress={handlePublishRelayList}
                          className="w-full"
                        >
                          <Upload size={18} className="mr-2" />
                          <Text>Publish Relay List</Text>
                        </Button>
                      </View>
                    )}
                    
                    <Button
                      variant="destructive"
                      onPress={handleResetToDefaults}
                      className="w-full"
                    >
                      <RotateCcw size={18} className="mr-2" />
                      <Text className="text-white">Reset to Defaults</Text>
                    </Button>
                    
                    <View className={`${isDarkColorScheme ? 'bg-background/50' : 'bg-secondary/30'} p-4 rounded-md mt-2 border border-border`}>
                      <View className="flex-row items-center mb-2">
                        <Info size={18} className="mr-2 text-muted-foreground" />
                        <Text className="font-semibold text-base">What are Relays?</Text>
                      </View>
                      <Text className="text-sm text-muted-foreground">
                        Nostr relays are servers that store and distribute content on the Nostr network.
                        You can connect to multiple relays to improve your experience and discover more content.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
          
          <View className="p-6 border-t border-border">
            <Button
              onPress={handleSaveRelays}
              disabled={isSaving}
              className="w-full py-3"
              style={{ backgroundColor: isSaving ? undefined : 'hsl(261, 90%, 66%)' }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text className="text-white font-medium">Apply Changes</Text>
                </>
              )}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}