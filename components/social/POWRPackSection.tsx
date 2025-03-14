// components/social/POWRPackSection.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useNDK } from '@/lib/hooks/useNDK';
import { useSubscribe } from '@/lib/hooks/useSubscribe';
import { findTagValue } from '@/utils/nostr-utils';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen, ArrowRight } from 'lucide-react-native';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { usePOWRPackService } from '@/components/DatabaseProvider';
import { Clipboard } from 'react-native';

// Hardcoded test pack naddr
const TEST_PACK_NADDR = 'naddr1qq88qmmhwgkhgetnwskhqctrdvqs6amnwvaz7tmwdaejumr0dsq3gamnwvaz7tmjv4kxz7fwv3sk6atn9e5k7q3q25f8lj0pcq7xk3v68w4h9ldenhh3v3x97gumm5yl8e0mgq0dnvssxpqqqp6ng325rsl';

export default function POWRPackSection() {
  const { ndk } = useNDK();
  const powrPackService = usePOWRPackService();
  const [featuredPacks, setFeaturedPacks] = useState<NDKEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Subscribe to POWR packs (kind 30004 with powrpack hashtag)
  const { events, isLoading: isSubscribeLoading } = useSubscribe(
    ndk ? [{ kinds: [30004], '#t': ['powrpack'], limit: 10 }] : false,
    { enabled: !!ndk }
  );
  
  // Set up test data on component mount
  useEffect(() => {
    const setupTestData = async () => {
      try {
        setIsLoading(true);
        // For testing, create a mock event that mimics what we'd get from the network
        const testPack = new NDKEvent(ndk || undefined);
        testPack.kind = 30004;
        testPack.pubkey = '55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21';
        testPack.content = 'This is a test POWR Pack containing 2 workout templates and 2 exercises. Created for testing POWR Pack import functionality.';
        testPack.id = 'c1838367545275c12a969b7f1b84c60edbaec548332bfb4af7e2d12926090211';
        testPack.created_at = 1741832829;
        
        // Add all the tags
        testPack.tags = [
          ['d', 'powr-test-pack'],
          ['name', 'POWR Test Pack'],
          ['about', 'A test collection of workout templates and exercises for POWR app'],
          ['a', '33402:55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21:e8256e9f70b87ad9fc4cf5712fe8f61641fc1313c608c38525c81537b5b411a5'],
          ['a', '33402:55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21:404faf8c2bc3cf2477b7753b0888af48fd1416c3ff77a019fef89a8199826bcd'],
          ['a', '33401:55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21:d25892222f1bb4a457c840c5c829915c4e2a0d1ced55b40d69e4682d9a8e3fb2'],
          ['a', '33401:55127fc9e1c03c6b459a3bab72fdb99def1644c5f239bdd09f3e5fb401ed9b21:9f93ee6c8c314e7938ebf00e3de86e6e255c3ed48ad9763843758669092bb92a']
        ];
        
        // Always include the test pack in our featured packs
        setFeaturedPacks([testPack]);
      } catch (error) {
        console.error('Error setting up test data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    setupTestData();
  }, [ndk]);
  
  // Update featured packs when events change
  useEffect(() => {
    if (events.length > 0) {
      // Combine the test pack with any events from the subscription
      setFeaturedPacks(prevPacks => {
        // Filter out duplicates by ID
        const uniqueEvents = events.filter(event => 
          !prevPacks.some(pack => pack.id === event.id)
        );
        return [...prevPacks, ...uniqueEvents];
      });
    }
  }, [events]);
  
  // Handle pack click
  const handlePackClick = (packEvent: NDKEvent) => {
    try {
      // Create shareable naddr
      const naddr = TEST_PACK_NADDR; // Use hardcoded test pack naddr for now
      
      // Copy to clipboard
      Clipboard.setString(naddr);
      
      // Navigate to import screen
      router.push('/(packs)/import');
      
      // Alert user that the address has been copied
      alert('Pack address copied to clipboard. Paste it in the import field.');
    } catch (error) {
      console.error('Error handling pack click:', error);
      alert('Failed to prepare pack for import. Please try again.');
    }
  };
  
  // View all packs
  const handleViewAll = () => {
    router.push('/(packs)/manage');
  };
  
  // Even if there are no network packs, we'll always show our test pack
  const showSection = true;
  
  if (!showSection) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>POWR Packs</Text>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View All</Text>
          <ArrowRight size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={`skeleton-${index}`} style={styles.packCard}>
              <CardContent style={styles.cardContent}>
                <View style={styles.packImage}>
                  <Skeleton className="w-full h-full rounded-lg" />
                </View>
                <View style={styles.titleSkeleton}>
                  <Skeleton className="w-full h-full rounded" />
                </View>
                <View style={styles.subtitleSkeleton}>
                  <Skeleton className="w-full h-full rounded" />
                </View>
              </CardContent>
            </Card>
          ))
        ) : featuredPacks.length > 0 ? (
          // Pack cards
          featuredPacks.map(pack => {
            const title = findTagValue(pack.tags, 'name') || 'Unnamed Pack';
            const description = findTagValue(pack.tags, 'about') || '';
            const image = findTagValue(pack.tags, 'image') || null;
            const exerciseCount = pack.tags.filter(t => t[0] === 'a' && t[1].startsWith('33401')).length;
            const templateCount = pack.tags.filter(t => t[0] === 'a' && t[1].startsWith('33402')).length;
            
            return (
              <TouchableOpacity 
                key={pack.id} 
                onPress={() => handlePackClick(pack)}
                activeOpacity={0.7}
              >
                <Card style={styles.packCard}>
                  <CardContent style={styles.cardContent}>
                    {image ? (
                      <Image source={{ uri: image }} style={styles.packImage} />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <PackageOpen size={32} color="#6b7280" />
                      </View>
                    )}
                    <Text style={styles.packTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.packSubtitle} numberOfLines={2}>
                      {templateCount} template{templateCount !== 1 ? 's' : ''} • {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                    </Text>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          // No packs found
          <View style={styles.emptyState}>
            <PackageOpen size={32} color="#6b7280" />
            <Text style={styles.emptyText}>No packs found</Text>
            <Button
              onPress={() => router.push('/(packs)/manage')}
              size="sm"
              variant="outline"
              style={styles.emptyButton}
            >
              <Text>Import Pack</Text>
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 4,
  },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  packCard: {
    width: 160,
    marginRight: 8,
    borderRadius: 12,
  },
  cardContent: {
    padding: 8,
  },
  packImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  placeholderImage: {
    width: '100%',
    height: 90,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  packSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  titleSkeleton: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    marginBottom: 8,
  },
  subtitleSkeleton: {
    height: 12,
    width: '60%',
    borderRadius: 4,
  },
  emptyState: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 16,
    color: '#6b7280',
  },
  emptyButton: {
    marginTop: 8,
  }
});