import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

/**
 * Demo index page for showcasing implemented React Query features.
 * This page serves as a central hub for navigating to different test components
 * that demonstrate various aspects of the React Query integration.
 */
export default function ReactQueryDemoIndex() {
  const router = useRouter();

  // Only include the demo options that are currently available
  const demoOptions = [
    {
      id: 'react-query-auth-test',
      title: 'Authentication Demo',
      description: 'Demonstrates authentication flow using React Query, including login, logout, and profile management.',
      icon: '🔐',
    },
    {
      id: 'auth-test',
      title: 'Legacy Auth Demo',
      description: 'Original authentication implementation for comparison.',
      icon: '👤',
    },
    {
      id: 'simple-auth',
      title: 'Simple Auth Demo',
      description: 'Simpler authentication implementation for testing.',
      icon: '🔑',
    },
    {
      id: 'robohash',
      title: 'Robohash Avatar Demo',
      description: 'Demonstrates the Robohash avatar generation system.',
      icon: '🤖',
    },
    {
      id: 'cache-test',
      title: 'Image Cache Demo',
      description: 'Tests React Query integration with profile and banner image caching.',
      icon: '🖼️',
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>React Query Integration</Text>
        <Text style={styles.subheader}>Phase 1 Implementation Demo</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>🚀 Implementation Complete</Text>
          <Text style={styles.cardText}>
            Phase 1 of the React Query integration has been implemented. This includes:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Authentication with React Query</Text>
            <Text style={styles.bulletItem}>• Profile data management</Text>
            <Text style={styles.bulletItem}>• Network connectivity tracking</Text>
            <Text style={styles.bulletItem}>• Optimized query client configuration</Text>
            <Text style={styles.bulletItem}>• Standardized query key structure</Text>
          </View>
          <Text style={styles.cardText}>
            Select a demo below to explore the implementation.
          </Text>
        </View>
        
        <Text style={styles.sectionTitle}>Available Demos</Text>
        
        {demoOptions.map((demo) => (
          <TouchableOpacity
            key={demo.id}
            style={styles.demoOption}
            onPress={() => router.push({
              pathname: `/test/${demo.id}` as any
            })}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{demo.icon}</Text>
            </View>
            <View style={styles.demoContent}>
              <Text style={styles.demoTitle}>{demo.title}</Text>
              <Text style={styles.demoDescription}>{demo.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>📝 Implementation Notes</Text>
          <Text style={styles.cardText}>
            This implementation follows the phased approach outlined in the React Query Integration Plan.
            Phase 1 focuses on core authentication and network status management.
          </Text>
          <Text style={[styles.cardText, {color: '#e65100', fontWeight: 'bold'}]}>
            Note: Test components have been updated with isolated providers to prevent hook ordering conflicts. 
            Each test now uses dedicated providers and properly manages its own state.
          </Text>
          <Text style={styles.cardText}>
            The hooks are designed to be drop-in replacements for existing hooks, with enhanced functionality:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Automatic loading states</Text>
            <Text style={styles.bulletItem}>• Standardized error handling</Text>
            <Text style={styles.bulletItem}>• Optimistic updates</Text>
            <Text style={styles.bulletItem}>• Smart caching and refetching</Text>
            <Text style={styles.bulletItem}>• Automatic query invalidation</Text>
          </View>
        </View>
        
        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>Next Steps:</Text>
          <Text style={styles.nextStepsText}>
            1. Implement domain-specific hooks (workouts, exercises, templates)
          </Text>
          <Text style={styles.nextStepsText}>
            2. Integrate with UI components
          </Text>
          <Text style={styles.nextStepsText}>
            3. Add advanced features (prefetching, suspense)
          </Text>
          <Text style={styles.nextStepsText}>
            4. Complete full migration of state management
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    color: '#333',
  },
  subheader: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  cardText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 16,
  },
  bulletItem: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  demoOption: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  demoContent: {
    flex: 1,
    justifyContent: 'center',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  demoDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  nextSteps: {
    backgroundColor: '#e6f7ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1890ff',
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  nextStepsText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 24,
  },
});
