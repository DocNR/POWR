// components/social/POWRPackSection.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useNDK } from '@/lib/hooks/useNDK';
import { findTagValue } from '@/utils/nostr-utils';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PackageOpen, ArrowRight, RefreshCw } from 'lucide-react-native';
import { NDKEvent } from '@nostr-dev-kit/ndk-mobile';
import { Clipboard } from 'react-native';
import { nip19 } from 'nostr-tools';

export default function POWRPackSection() {
  const { ndk } = useNDK();
  const [isLoading, setIsLoading] = useState(false);
  const [featuredPacks, setFeaturedPacks] = useState<NDKEvent[]>([]);
  const [error, setError] = useState<Error | null>(null);
  
  // Manual fetch function
  const handleFetchPacks = async () => {
    if (!ndk) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Manually fetching POWR packs');
      const events = await ndk.fetchEvents({ 
        kinds: [30004], 
        "#t": ["powrpack"],
        limit: 20 
      });
      const eventsArray = Array.from(events);
      
      console.log(`Fetched ${eventsArray.length} events`);
      
      // Filter to find POWR packs
      const powrPacks = eventsArray.filter(event => {
        // Check if any tag has 'powrpack', 'fitness', or 'workout'
        return event.tags.some(tag => 
          tag[0] === 't' && ['powrpack', 'fitness', 'workout'].includes(tag[1])
        );
      });
      
      console.log(`Found ${powrPacks.length} POWR packs`);
      setFeaturedPacks(powrPacks);
    } catch (err) {
      console.error('Error fetching packs:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch packs'));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle pack click
  const handlePackClick = (packEvent: NDKEvent) => {
    try {
      // Get dTag for the pack
      const dTag = findTagValue(packEvent.tags, 'd');
      if (!dTag) {
        throw new Error('Pack is missing identifier (d tag)');
      }
      
      // Get relay hints from event tags
      const relayHints = packEvent.tags
        .filter(tag => tag[0] === 'r')
        .map(tag => tag[1])
        .filter(relay => relay.startsWith('wss://'));
      
      // Default relays if none found
      const relays = relayHints.length > 0 
        ? relayHints 
        : ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band'];
      
      // Create shareable naddr
      const naddr = nip19.naddrEncode({
        kind: 30004,
        pubkey: packEvent.pubkey,
        identifier: dTag,
        relays
      });
      
      // Navigate to import screen with the naddr as a parameter
      router.push({
        pathname: '/(packs)/import',
        params: { naddr }
      });
      
    } catch (error) {
      console.error('Error handling pack click:', error);
      alert('Failed to prepare pack for import. Please try again.');
    }
  };
  
  // View all packs
  const handleViewAll = () => {
    router.push('/(packs)/manage');
  };
  
  // Fetch packs when mounted
  React.useEffect(() => {
    if (ndk) {
      handleFetchPacks();
    }
  }, [ndk]);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>POWR Packs</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={handleFetchPacks} 
            style={styles.refreshButton}
            disabled={isLoading}
          >
            <RefreshCw size={16} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleViewAll} style={styles.viewAll}>
            <Text style={styles.viewAllText}>View All</Text>
            <ArrowRight size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>
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
        ) : error ? (
          // Error state
          <View style={styles.emptyState}>
            <Text style={styles.errorText}>Error loading packs</Text>
            <Button
              onPress={handleFetchPacks}
              size="sm"
              variant="outline"
              style={styles.emptyButton}
            >
              <Text>Try Again</Text>
            </Button>
          </View>
        ) : (
          // No packs found
          <View style={styles.emptyState}>
            <PackageOpen size={32} color="#6b7280" />
            <Text style={styles.emptyText}>No packs found</Text>
            <Button
              onPress={() => router.push('/(packs)/import')}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
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
    width: 280,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    marginBottom: 16,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 8,
    marginBottom: 16,
    color: '#ef4444',
  },
  emptyButton: {
    marginTop: 8,
  }
});