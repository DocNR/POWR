// components/TermsOfServiceModal.tsx
import React from 'react';
import { View, ScrollView, Modal, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { X } from 'lucide-react-native';
import { Button } from '@/components/ui/button';
import { useColorScheme } from '@/lib/theme/useColorScheme';

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsOfServiceModal({ visible, onClose }: TermsOfServiceModalProps) {
  const insets = useSafeAreaInsets();
  const { isDarkColorScheme } = useColorScheme();
  const currentDate = format(new Date(), 'MMMM d, yyyy');
  
  const textColor = isDarkColorScheme ? '#FFFFFF' : '#000000';
  const backgroundColor = isDarkColorScheme ? '#1c1c1e' : '#FFFFFF';
  const mutedTextColor = isDarkColorScheme ? '#A1A1A1' : '#6B7280';
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>Terms of Service</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollView}>
            <Text style={[styles.heading, { color: textColor }]}>
              POWR App Terms of Service
            </Text>
            
            <Text style={[styles.paragraph, { color: textColor }]}>
              POWR is a local-first fitness tracking application that integrates with the Nostr protocol.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Data Storage and Privacy
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • POWR stores your workout data, exercise templates, and preferences locally on your device.
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • We do not collect, store, or track any personal data on our servers.
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • Any content you choose to publish to Nostr relays (such as workouts or templates) will be publicly available to anyone with access to those relays. Think of Nostr posts as public broadcasts.
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • Your private keys are stored locally on your device and are never transmitted to us.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              User Responsibility
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • You are responsible for safeguarding your private keys.
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • You are solely responsible for any content you publish to Nostr relays.
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • Exercise caution when sharing personal information through public Nostr posts.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Fitness Disclaimer
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • POWR provides fitness tracking tools, not medical advice. Consult a healthcare professional before starting any fitness program.
            </Text>
            <Text style={[styles.bulletPoint, { color: textColor }]}>
              • You are solely responsible for any injuries or health issues that may result from exercises tracked using this app.
            </Text>
            
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Changes to Terms
            </Text>
            <Text style={[styles.paragraph, { color: textColor }]}>
              We may update these terms from time to time. Continued use of the app constitutes acceptance of any changes.
            </Text>
            
            <Text style={[styles.lastUpdated, { color: mutedTextColor }]}>
              Last Updated: {currentDate}
            </Text>
          </ScrollView>
          
          <Button 
            variant="purple"
            onPress={onClose}
            className="mt-4"
          >
            <Text style={{ color: '#FFFFFF' }}>Close</Text>
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
