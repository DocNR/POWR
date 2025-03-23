// app/(tabs)/profile/terms.tsx
import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const currentDate = format(new Date(), 'MMMM d, yyyy');
  
  return (
    <View className="flex-1 bg-background">
      <View 
        className="flex-row items-center px-4 border-b border-border"
        style={{ paddingTop: insets.top, height: insets.top + 56 }}
      >
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mr-4 p-2"
        >
          <ChevronLeft size={24} className="text-foreground" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-foreground">Terms of Service</Text>
      </View>
      
      <ScrollView 
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
          paddingTop: 16
        }}
      >
        <Text className="text-lg font-bold mb-4 text-foreground">POWR App Terms of Service</Text>
        
        <Text className="mb-6 text-foreground">
          POWR is a local-first fitness tracking application that integrates with the Nostr protocol.
        </Text>
        
        <Text className="text-base font-semibold mb-2 text-foreground">Data Storage and Privacy</Text>
        <View className="mb-6">
          <Text className="mb-2 text-foreground">• POWR stores your workout data, exercise templates, and preferences locally on your device.</Text>
          <Text className="mb-2 text-foreground">• We do not collect, store, or track any personal data on our servers.</Text>
          <Text className="mb-2 text-foreground">• Any content you choose to publish to Nostr relays (such as workouts or templates) will be publicly available to anyone with access to those relays. Think of Nostr posts as public broadcasts.</Text>
          <Text className="mb-2 text-foreground">• Your private keys are stored locally on your device and are never transmitted to us.</Text>
        </View>
        
        <Text className="text-base font-semibold mb-2 text-foreground">User Responsibility</Text>
        <View className="mb-6">
          <Text className="mb-2 text-foreground">• You are responsible for safeguarding your private keys.</Text>
          <Text className="mb-2 text-foreground">• You are solely responsible for any content you publish to Nostr relays.</Text>
          <Text className="mb-2 text-foreground">• Exercise caution when sharing personal information through public Nostr posts.</Text>
        </View>
        
        <Text className="text-base font-semibold mb-2 text-foreground">Fitness Disclaimer</Text>
        <View className="mb-6">
          <Text className="mb-2 text-foreground">• POWR provides fitness tracking tools, not medical advice. Consult a healthcare professional before starting any fitness program.</Text>
          <Text className="mb-2 text-foreground">• You are solely responsible for any injuries or health issues that may result from exercises tracked using this app.</Text>
        </View>
        
        <Text className="text-base font-semibold mb-2 text-foreground">Changes to Terms</Text>
        <View className="mb-6">
          <Text className="mb-2 text-foreground">We may update these terms from time to time. Continued use of the app constitutes acceptance of any changes.</Text>
        </View>
        
        <Text className="text-sm text-muted-foreground mt-4">
          Last Updated: {currentDate}
        </Text>
      </ScrollView>
    </View>
  );
}
