// app/(tabs)/social/following.tsx
import React, { useCallback, useState, useRef } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import { router } from 'expo-router';
import NostrLoginPrompt from '@/components/social/NostrLoginPrompt';
import { useNDKCurrentUser, useNDK } from '@/lib/hooks/useNDK';
import { useFollowingFeed } from '@/lib/hooks/useFeedHooks';
import { ChevronUp, Bug } from 'lucide-react-native';
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

export default function FollowingScreen() {
  const { isAuthenticated, currentUser } = useNDKCurrentUser();
  const { ndk } = useNDK();
  const { 
    entries, 
    newEntries, 
    loading, 
    resetFeed, 
    clearNewEntries,
    hasFollows,
    followCount,
    followedUsers,
    isLoadingContacts
  } = useFollowingFeed();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewButton, setShowNewButton] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Use ref for FlatList to scroll to top
  const listRef = useRef<FlatList>(null);
  
  // Show new entries button when we have new content
  React.useEffect(() => {
    if (newEntries.length > 0) {
      setShowNewButton(true);
    }
  }, [newEntries.length]); // Depend on length, not array reference
  
  // If not authenticated, show login prompt
  if (!isAuthenticated) {
    return <NostrLoginPrompt message="Log in to see posts from people you follow" />;
  }

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

  // Check relay connections
  const checkRelayConnections = useCallback(() => {
    if (!ndk) return;
    
    console.log("=== RELAY CONNECTION STATUS ===");
    if (ndk.pool && ndk.pool.relays) {
      console.log(`Connected to ${ndk.pool.relays.size} relays:`);
      ndk.pool.relays.forEach((relay) => {
        console.log(`- ${relay.url}: ${relay.status}`);
      });
    } else {
      console.log("No relay pool or connections available");
    }
    console.log("===============================");
  }, [ndk]);
  
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
  
  // Debug controls component - memoized
  const DebugControls = useCallback(() => (
    <View className="bg-gray-100 p-4 rounded-lg mx-4 mb-4">
      <Text className="font-bold mb-2">Debug Info:</Text>
      <Text>User: {currentUser?.pubkey?.substring(0, 8)}...</Text>
      <Text>Following Count: {followCount || 0}</Text>
      <Text>Feed Items: {entries.length}</Text>
      <Text>Loading: {loading ? "Yes" : "No"}</Text>
      <Text>Loading Contacts: {isLoadingContacts ? "Yes" : "No"}</Text>
      
      {followedUsers && followedUsers.length > 0 && (
        <View className="mt-2">
          <Text className="font-bold">Followed Users:</Text>
          {followedUsers.slice(0, 3).map((pubkey, idx) => (
            <Text key={idx} className="text-xs">{idx+1}. {pubkey.substring(0, 12)}...</Text>
          ))}
          {followedUsers.length > 3 && (
            <Text className="text-xs">...and {followedUsers.length - 3} more</Text>
          )}
        </View>
      )}
      
      <View className="flex-row mt-4 justify-between">
        <TouchableOpacity 
          className="bg-blue-500 p-2 rounded flex-1 mr-2"
          onPress={checkRelayConnections}
        >
          <Text className="text-white text-center">Check Relays</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-green-500 p-2 rounded flex-1"
          onPress={handleRefresh}
        >
          <Text className="text-white text-center">Force Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [currentUser?.pubkey, followCount, entries.length, loading, isLoadingContacts, followedUsers, checkRelayConnections, handleRefresh]);
  
  // If user doesn't follow anyone
  if (isAuthenticated && !hasFollows) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-center mb-4">
          You're not following anyone yet. Find and follow other users to see their content here.
        </Text>
        
        {/* Debug toggle */}
        <TouchableOpacity 
          className="mt-4 bg-gray-200 py-2 px-4 rounded"
          onPress={() => setShowDebug(!showDebug)}
        >
          <Text>{showDebug ? "Hide" : "Show"} Debug Info</Text>
        </TouchableOpacity>
        
        {showDebug && (
          <View className="mt-4 p-4 bg-gray-100 rounded w-full">
            <Text className="text-xs">User pubkey: {currentUser?.pubkey?.substring(0, 12)}...</Text>
            <Text className="text-xs">Authenticated: {isAuthenticated ? "Yes" : "No"}</Text>
            <Text className="text-xs">Follow count: {followCount || 0}</Text>
            <Text className="text-xs">Has NDK follows: {currentUser?.follows ? "Yes" : "No"}</Text>
            <Text className="text-xs">NDK follows count: {
              typeof currentUser?.follows === 'function' ? 'Function' : 
              (currentUser?.follows && Array.isArray(currentUser?.follows)) ? (currentUser?.follows as any[]).length : 
              (currentUser?.follows && typeof currentUser?.follows === 'object' && 'size' in currentUser?.follows) ? 
              (currentUser?.follows as any).size : 
              'unknown'
            }</Text>
            <Text className="text-xs">Loading contacts: {isLoadingContacts ? "Yes" : "No"}</Text>
            
            {/* Toggle relays button */}
            <TouchableOpacity 
              className="mt-2 bg-blue-200 py-1 px-2 rounded"
              onPress={checkRelayConnections}
            >
              <Text className="text-xs">Check Relay Connections</Text>
            </TouchableOpacity>
            
            {/* Manual refresh */}
            <TouchableOpacity 
              className="mt-2 bg-green-200 py-1 px-2 rounded"
              onPress={handleRefresh}
            >
              <Text className="text-xs">Force Refresh Feed</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
  
  return (
    <View className="flex-1">
      {/* Debug toggle button */}
      <TouchableOpacity 
        className="absolute top-2 right-2 z-10 bg-gray-200 p-2 rounded-full"
        onPress={() => setShowDebug(!showDebug)}
      >
        <Bug size={16} color="#666" />
      </TouchableOpacity>
      
      {/* Debug panel */}
      {showDebug && <DebugControls />}
      
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
        ListEmptyComponent={
          loading || isLoadingContacts ? (
            <View className="flex-1 items-center justify-center p-8">
              <Text>Loading followed content...</Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center p-8">
              <Text>No posts from followed users found</Text>
              <Text className="text-sm text-gray-500 mt-2">
                You're following {followCount || 0} users, but no content was found.
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                This could be because they haven't posted recently,
                or their content is not available on connected relays.
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingVertical: 0 }} // Changed from paddingVertical: 8
      />
    </View>
  );
}