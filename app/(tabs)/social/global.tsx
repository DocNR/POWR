// app/(tabs)/social/global.tsx
import React, { useState, useCallback, useRef } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import { ChevronUp, Globe } from 'lucide-react-native';
import { router } from 'expo-router';
import { withOfflineState } from '@/components/social/SocialOfflineState';
import { useSocialFeed } from '@/lib/hooks/useSocialFeed';

function GlobalScreen() {
  const { 
    feedItems, 
    loading, 
    refresh,
    isOffline
  } = useSocialFeed({
    feedType: 'global',
    limit: 30
  });
  
  // Convert feed items to the format expected by the UI
  const entries = React.useMemo(() => {
    return feedItems.map(item => ({
      id: item.id,
      eventId: item.id,
      event: item.originalEvent,
      content: item.parsedContent,
      timestamp: item.createdAt * 1000,
      type: item.type as any
    }));
  }, [feedItems]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewButton, setShowNewButton] = useState(false);
  const [newEntries, setNewEntries] = useState<any[]>([]);
  
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
    setNewEntries([]);
    setShowNewButton(false);
    // Scroll to top
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);
  
  // Handle refresh - updated to use forceRefresh parameter
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('[GlobalScreen] Starting manual refresh (force=true)');
      // Use force=true to bypass cooldown
      await refresh(true);
      // Add a slight delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[GlobalScreen] Manual refresh completed successfully');
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);
  
  // Handle post selection - simplified for testing
  const handlePostPress = useCallback((entry: any) => {
    // Just show an alert with the entry info for testing
    alert(`Selected ${entry.type} with ID: ${entry.id || entry.eventId}`);
    
    // Alternatively, log to console for debugging
    console.log(`Selected ${entry.type}:`, entry);
  }, []);
  
  // Memoize render item to prevent re-renders
  const renderItem = useCallback(({ item }: { item: any }) => (
    <EnhancedSocialPost 
      item={{
        id: item.id || item.eventId,
        type: item.type,
        originalEvent: item.originalEvent || item.event,
        parsedContent: item.parsedContent || item.content,
        createdAt: item.createdAt || (item.timestamp ? item.timestamp / 1000 : Date.now() / 1000)
      }}
      onPress={() => handlePostPress(item)}
    />
  ), [handlePostPress]);
  
  // Header component
  const renderHeaderComponent = useCallback(() => (
    <View className="p-4 border-b border-border bg-primary/5 mb-2">
      <View className="flex-row items-center mb-2">
        <Globe size={20} className="mr-2 text-primary" />
        <Text className="text-lg font-bold">Community Feed</Text>
      </View>
      <Text className="text-muted-foreground">
        Discover workout content from the broader POWR community.
      </Text>
    </View>
  ), []);
  
  // Memoize empty component
  const renderEmptyComponent = useCallback(() => (
    loading ? (
      <View className="flex-1 items-center justify-center p-8">
        <Text>Loading community content from your relays...</Text>
      </View>
    ) : (
      <View className="flex-1 items-center justify-center p-8">
        <Text>{isOffline ? "No cached global content available" : "No global content found"}</Text>
        {isOffline && (
          <Text className="text-muted-foreground text-center mt-2">
            You're currently offline. Connect to the internet to see the latest content.
          </Text>
        )}
      </View>
    )
  ), [loading, isOffline]);
  
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
        data={entries as any[]}
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

// Export the component wrapped with the offline state HOC
export default withOfflineState(GlobalScreen);
