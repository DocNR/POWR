import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useRelayStore } from '@/lib/stores/relayStore';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react-native';
import { RelayWithStatus } from '@/lib/db/services/RelayService';

// Define proper interface for component props
interface RelayManagementProps {
  isVisible: boolean;
  onClose: () => void;
}

// Simple RelayManagement component
export default function RelayManagement({ isVisible, onClose }: RelayManagementProps) {
  const relays = useRelayStore(state => state.relays);
  const isLoading = useRelayStore(state => state.isLoading);
  const loadRelays = useRelayStore(state => state.loadRelays);
  const updateRelay = useRelayStore(state => state.updateRelay);
  
  useEffect(() => {
    if (isVisible) {
      loadRelays();
    }
  }, [isVisible]);
  
  // Status indicator color with proper typing
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected': return '#10b981'; // Green
      case 'connecting': return '#f59e0b'; // Amber
      case 'error': 
      case 'disconnected': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };
  
  // Render a relay item with proper typing
  const renderRelayItem = ({ item }: { item: RelayWithStatus }) => (
    <View style={{
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      backgroundColor: 'white',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: getStatusColor(item.status),
            marginRight: 8
          }} />
          <Text style={{ flex: 1 }}>{item.url}</Text>
        </View>
        
        <Text style={{ fontSize: 12, color: '#6b7280' }}>
          {item.status}
        </Text>
      </View>
      
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 8 }}>Read</Text>
          <Switch
            checked={item.read}
            onCheckedChange={() => updateRelay(item.url, { read: !item.read })}
          />
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 8 }}>Write</Text>
          <Switch
            checked={item.write}
            onCheckedChange={() => updateRelay(item.url, { write: !item.write })}
          />
        </View>
      </View>
    </View>
  );
  
  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingBottom: 20,
          maxHeight: '80%',
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Manage Relays</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          {isLoading ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10 }}>Loading relays...</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={relays}
                keyExtractor={(item) => item.url}
                renderItem={renderRelayItem}
                style={{ maxHeight: '70%' }}
              />
              
              <View style={{ padding: 16 }}>
                <Button onPress={loadRelays} style={{ marginBottom: 8 }}>
                  <Text style={{ color: 'white' }}>Refresh Relays</Text>
                </Button>
                
                <Button
                  variant="outline"
                  onPress={onClose}
                >
                  <Text>Close</Text>
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}