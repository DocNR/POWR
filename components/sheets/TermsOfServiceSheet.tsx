// components/sheets/TermsOfServiceSheet.tsx
import React from 'react';
import { View, ScrollView, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { X } from 'lucide-react-native';
import { useColorScheme } from '@/lib/theme/useColorScheme';

interface TermsOfServiceSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function TermsOfServiceSheet({ open, onClose }: TermsOfServiceSheetProps) {
  const insets = useSafeAreaInsets();
  const { isDarkColorScheme } = useColorScheme();
  const currentDate = format(new Date(), 'MMMM d, yyyy');
  
  if (!open) return null;
  
  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[
          styles.modalContent,
          { backgroundColor: isDarkColorScheme ? '#1c1c1e' : '#ffffff' }
        ]}>
          <View style={styles.header}>
            <Text style={styles.title}>Terms of Service</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={isDarkColorScheme ? '#ffffff' : '#000000'} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView}>
            <Text style={[styles.heading, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              POWR App Terms of Service
            </Text>
            
            <Text style={[styles.paragraph, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              POWR is a local-first fitness tracking application that integrates with the Nostr protocol.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              Data Storage and Privacy
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • POWR stores your workout data, exercise templates, and preferences locally on your device.
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • We do not collect, store, or track any personal data on our servers.
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • Any content you choose to publish to Nostr relays (such as workouts or templates) will be publicly available to anyone with access to those relays. Think of Nostr posts as public broadcasts.
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • Your private keys are stored locally on your device and are never transmitted to us.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              User Responsibility
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • You are responsible for safeguarding your private keys.
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • You are solely responsible for any content you publish to Nostr relays.
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • Exercise caution when sharing personal information through public Nostr posts.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              Fitness Disclaimer
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • POWR provides fitness tracking tools, not medical advice. Consult a healthcare professional before starting any fitness program.
            </Text>
            <Text style={[styles.bulletPoint, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              • You are solely responsible for any injuries or health issues that may result from exercises tracked using this app.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              Changes to Terms
            </Text>
            <Text style={[styles.paragraph, { color: isDarkColorScheme ? '#ffffff' : '#000000' }]}>
              We may update these terms from time to time. Continued use of the app constitutes acceptance of any changes.
            </Text>
            
            <Text style={[styles.lastUpdated, { color: isDarkColorScheme ? '#a1a1a1' : '#6b7280' }]}>
              Last Updated: {currentDate}
            </Text>
          </ScrollView>
          
          <Button 
            variant="purple"
            onPress={onClose}
            className="mt-4"
          >
            <Text className="text-white">Close</Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 16,
    lineHeight: 20,
  },
  bulletPoint: {
    marginBottom: 8,
    lineHeight: 20,
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
  },
});
