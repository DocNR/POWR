// components/NDKTest.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, AlertCircle, Check, RefreshCw, Zap } from 'lucide-react-native';
import { useNDK, useNDKAuth, useNDKCurrentUser, useNDKEvents } from '@/lib/hooks/useNDK';
import { useSubscribe } from '@/lib/hooks/useSubscribe';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk-mobile';
import { NostrEventKind } from '@/types/nostr';

export default function NDKTest() {
  const { ndk, isLoading: ndkLoading } = useNDK();
  const { isAuthenticated } = useNDKCurrentUser();
  const { publishEvent } = useNDKEvents();
  const [testStatus, setTestStatus] = useState<string>('Ready');
  const [testEvent, setTestEvent] = useState<NDKEvent | null>(null);
  
  // Test subscription to see our own events
  const { events: receivedEvents, isLoading: subLoading, resubscribe } = 
    useSubscribe(
      testEvent ? [{ kinds: [1], ids: [testEvent.id] }] : false,
      { closeOnEose: false }
    );
  
  useEffect(() => {
    if (receivedEvents.length > 0) {
      setTestStatus('Event successfully published and received!');
    }
  }, [receivedEvents]);
  
  const runPublishTest = async () => {
    if (!ndk || !isAuthenticated) {
      setTestStatus('Error: Not authenticated');
      return;
    }
    
    try {
      setTestStatus('Creating test event...');
      
      // Create event using NDK Mobile
      const event = new NDKEvent(ndk);
      event.kind = NDKKind.Text;
      event.content = `Testing NDK Mobile from POWR app! ${new Date().toISOString()}`;
      
      // Sign and publish
      await event.publish();
      
      setTestEvent(event);
      setTestStatus(`Event published with ID: ${event.id}`);
      
      // Resubscribe to see if we can receive our own event
      resubscribe();
    } catch (error) {
      console.error('Test error:', error);
      setTestStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const runCustomEventTest = async () => {
    if (!ndk || !isAuthenticated) {
      setTestStatus('Error: Not authenticated');
      return;
    }
    
    try {
      setTestStatus('Creating custom exercise event...');
      
      const result = await publishEvent(
        NostrEventKind.EXERCISE,
        "Test exercise description",
        [
          ['d', `exercise-${Date.now()}`],
          ['title', 'Test Exercise'],
          ['type', 'strength'],
          ['category', 'Legs'],
          ['format', 'weight', 'reps'],
          ['format_units', 'kg', 'count'],
          ['equipment', 'barbell']
        ]
      );
      
      if (result) {
        setTestStatus(`Custom event published with ID: ${result.id}`);
      } else {
        setTestStatus('Failed to publish custom event');
      }
    } catch (error) {
      console.error('Custom event test error:', error);
      setTestStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  return (
    <ScrollView className="flex-1 p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex-row items-center gap-2">
            <Wifi size={20} className="text-foreground" />
            <Text className="text-lg font-semibold">NDK Mobile Test</Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <View className="space-y-4">
            <Text>Status: {ndkLoading ? 'Loading NDK...' : ndk ? 'NDK initialized' : 'Not initialized'}</Text>
            <Text>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
            
            <View className="bg-muted p-3 rounded-md">
              <View className="flex-row items-center mb-2">
                <Zap size={16} className="mr-3 text-primary" />
                <Text className="font-semibold">Test Status: {testStatus}</Text>
              </View>
              
              {testEvent && (
                <Text className="text-xs text-muted-foreground mt-2">
                  Event ID: {testEvent.id}
                </Text>
              )}
              
              {receivedEvents.length > 0 && (
                <View className="mt-2 border-t border-border pt-2">
                  <View className="flex-row items-center">
                    <Check size={16} className="mr-2 text-green-500" />
                    <Text className="text-green-500">Event successfully verified</Text>
                  </View>
                </View>
              )}
            </View>
            
            <Button 
              onPress={runPublishTest} 
              disabled={!isAuthenticated || ndkLoading}
              className="w-full"
            >
              <RefreshCw size={18} className="mr-2 text-primary-foreground" />
              <Text className="text-primary-foreground">Test Basic Event</Text>
            </Button>
            
            <Button 
              onPress={runCustomEventTest} 
              disabled={!isAuthenticated || ndkLoading}
              className="w-full"
            >
              <Zap size={18} className="mr-2 text-primary-foreground" />
              <Text className="text-primary-foreground">Test Custom Event</Text>
            </Button>
          </View>
        </CardContent>
      </Card>
    </ScrollView>
  );
}