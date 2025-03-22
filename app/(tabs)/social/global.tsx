// app/(tabs)/social/global.tsx
import React, { useCallback, useState, useRef } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import { useGlobalFeed } from '@/lib/hooks/useFeedHooks';
import { router } from 'expo-router';
import { ChevronUp } from 'lucide-react-native';
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

export default function GlobalScreen() {
  const { 
    entries, 
    newEntries, 
    loading, 
    resetFeed, 
    clearNewEntries 
  } = useGlobalFeed();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewButton, setShowNewButton] = useState(false);
  
  // Use ref for FlatList to scroll to top
  const listRef = useRef<FlatList>(null);
  
  // Show new entries button when we have new content
  React.useEffect(() => {
    if (newEntries.length > 0) {
      setShowNewButton(true);
    }
  }, [newEntries.length]); // Depend on length, not array reference
  
  // Handle showing new entries
  const handleShowNewEntries = useCallback(() => {
    clearNewEntries();
    setShowNewButton(false);
    // Scroll to top
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [clearNewEntries]);
  
  // Handle refresh
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

  // Memoize render item function
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
        <Text>Loading global content...</Text>
      </View>
    ) : (
      <View className="flex-1 items-center justify-center p-8">
        <Text>No global content found</Text>
        <Text className="text-sm text-gray-500 mt-2">
          Try connecting to more relays or check back later.
        </Text>
      </View>
    )
  ), [loading]);
  
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
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={{ paddingVertical: 0 }}
      />
    </View>
  );
}