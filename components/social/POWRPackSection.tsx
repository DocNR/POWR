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
import { nip19 } from 'nostr-tools';

export default function POWRPackSection() {
  const { ndk } = useNDK();
  const powrPackService = usePOWRPackService();
  const [featuredPacks, setFeaturedPacks] = useState<NDKEvent[]>([]);
  
  // Subscribe to POWR packs (kind 30004 with powrpack hashtag)
  const { events, isLoading } = useSubscribe(
    ndk ? [{ kinds: [30004], '#t': ['powrpack', 'fitness', 'workout'], limit: 10 }] : false,
    { enabled: !!ndk }
  );
  
  // Update featured packs when events change
  useEffect(() => {
    if (events.length > 0) {
      setFeaturedPacks(events);
    }
  }, [events]);
  
  // Handle pack click
  const handlePackClick = (packEvent: NDKEvent) => {
    try {
      // Get dTag for the pack
      const dTag = findTagValue(packEvent.tags, 'd');
      if (!dTag) {
        throw new Error('Pack is missing identifier (d tag)');
      }
      
      // Create shareable naddr
      const naddr = nip19.naddrEncode({
        kind: 30004,
        pubkey: packEvent.pubkey,
        identifier: dTag,
        relays: ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band']
      });
      
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
  
  // Only show section if we have packs or are loading
  const showSection = featuredPacks.length > 0 || isLoading;
  
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