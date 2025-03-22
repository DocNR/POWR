// app/(tabs)/social/powr.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import { ChevronUp, Zap } from 'lucide-react-native';
import POWRPackSection from '@/components/social/POWRPackSection';
import { usePOWRFeed } from '@/lib/hooks/useFeedHooks';
import { router } from 'expo-router';
import { AnyFeedEntry } from '@/types/feed';

// Define the conversion function here to avoid import issues
function convertToLegacyFeedItem(entry: AnyFeedEntry) {
  return {
    id: entry.eventId,
    type: entry.type,
    originalEvent: entry.event!,
    parsedContent: entry.content!,
    createdAt: (entry.timestamp || Date.now()) / 1000
  };
}

export default function PowerScreen() {
  const { 
    entries, 
    newEntries, 
    loading, 
    resetFeed, 
    clearNewEntries 
  } = usePOWRFeed();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewButton, setShowNewButton] = useState(false);
  
  // Use ref for list to scroll to top
  const listRef = useRef<FlatList>(null);
  
  // Break the dependency cycle by using proper effect
  useEffect(() => {
    // Only set the button if we have new entries
    if (newEntries.length > 0) {
      setShowNewButton(true);
    }
  }, [newEntries.length]); // Depend only on length change, not the array itself
  
  // Handle showing new entries
  const handleShowNewEntries = useCallback(() => {
    clearNewEntries();
    setShowNewButton(false);
    // Scroll to top
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [clearNewEntries]);
  
  // Handle refresh - updated with proper reset handling
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await resetFeed();
      // Add a slight delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [resetFeed]);
  
  // Handle post selection - simplified for testing
  const handlePostPress = useCallback((entry: AnyFeedEntry) => {
    // Just show an alert with the entry info for testing
    alert(`Selected ${entry.type} with ID: ${entry.eventId}`);
    
    // Alternatively, log to console for debugging
    console.log(`Selected ${entry.type}:`, entry);
  }, []);
  
  // Memoize render item to prevent re-renders
  const renderItem = useCallback(({ item }: { item: AnyFeedEntry }) => (
    <EnhancedSocialPost 
      item={convertToLegacyFeedItem(item)}
      onPress={() => handlePostPress(item)}
    />
  ), [handlePostPress]);
  
  // Memoize empty component
  const renderEmptyComponent = useCallback(() => (
    loading ? (
      <View className="flex-1 items-center justify-center p-8">
        <Text>Loading POWR content...</Text>
      </View>
    ) : (
      <View className="flex-1 items-center justify-center p-8">
        <Text>No POWR content found</Text>
      </View>
    )
  ), [loading]);

  // Header component
  const renderHeaderComponent = useCallback(() => (
    <>
      {/* POWR Welcome Section */}
      <View className="p-4 border-b border-border bg-primary/5 mb-2">
        <View className="flex-row items-center mb-2">
          <Zap size={20} className="mr-2 text-primary" fill="currentColor" />
          <Text className="text-lg font-bold">POWR Community</Text>
        </View>
        <Text className="text-muted-foreground">
          Official updates, featured content, and community highlights from the POWR team.
        </Text>
      </View>

      {/* POWR Packs Section */}
      <POWRPackSection />
    </>
  ), []);
  
  return (
    <View className="flex-1">
      {showNewButton && (
        <TouchableOpacity 
          className="absolute top-2 left-0 right-0 z-10 mx-auto w-40 rounded-full bg-primary py-2 px-4 flex-row items-center justify-center"
          onPress={handleShowNewEntries}
          activeOpacity={0.8}
        >
          <ChevronUp size={16} color="white" />
          <Text className="text-white font-medium ml-1">
            New Posts ({newEntries.length})
          </Text>
        </TouchableOpacity>
      )}
      
      <FlatList
        ref={listRef}
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={renderHeaderComponent}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
      />
    </View>
  );
}