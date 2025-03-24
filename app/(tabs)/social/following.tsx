// app/(tabs)/social/following.tsx
import React, { useCallback, useState, useRef } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import EnhancedSocialPost from '@/components/social/EnhancedSocialPost';
import { router } from 'expo-router';
import NostrLoginPrompt from '@/components/social/NostrLoginPrompt';
import { useNDKCurrentUser, useNDK } from '@/lib/hooks/useNDK';
import { useContactList } from '@/lib/hooks/useContactList';
import { ChevronUp, Bug } from 'lucide-react-native';
import { withOfflineState } from '@/components/social/SocialOfflineState';
import { useSocialFeed } from '@/lib/hooks/useSocialFeed';

function FollowingScreen() {
  const { isAuthenticated, currentUser } = useNDKCurrentUser();
  const { ndk } = useNDK();
  
  // Get the user's contact list
  const { contacts, isLoading: isLoadingContacts } = useContactList(currentUser?.pubkey);
  
  // Add debug logging for contact list
  React.useEffect(() => {
    console.log(`[FollowingScreen] Contact list has ${contacts.length} contacts`);
    if (contacts.length > 0) {
      console.log(`[FollowingScreen] First few contacts: ${contacts.slice(0, 3).join(', ')}`);
    }
  }, [contacts.length]);
  
  // Track if feed has loaded successfully with content
  const [hasLoadedWithContent, setHasLoadedWithContent] = useState(false);
  // Track if we've loaded content with the full contact list
  const [hasLoadedWithContacts, setHasLoadedWithContacts] = useState(false);
  // Track the number of contacts we've loaded content with
  const [loadedContactsCount, setLoadedContactsCount] = useState(0);
  
  // Use the enhanced useSocialFeed hook with the contact list
  // Always pass an array, even if empty, to ensure consistent behavior
  const { 
    feedItems, 
    loading, 
    refresh,
    isOffline,
    socialService
  } = useSocialFeed({
    feedType: 'following',
    limit: 30,
    authors: contacts // Always pass the contacts array, even if empty
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
  
  // Update hasLoadedWithContent when we get feed items
  React.useEffect(() => {
    if (feedItems.length > 0 && !loading) {
      setHasLoadedWithContent(true);
      
      // Check if we've loaded with the full contact list
      if (contacts.length > 0 && loadedContactsCount === contacts.length) {
        setHasLoadedWithContacts(true);
      }
    }
  }, [feedItems.length, loading, contacts.length, loadedContactsCount]);
  
  // Update loadedContactsCount when contacts change
  React.useEffect(() => {
    if (contacts.length > 0 && contacts.length !== loadedContactsCount) {
      console.log(`[FollowingScreen] Contact list changed from ${loadedContactsCount} to ${contacts.length} contacts`);
      setLoadedContactsCount(contacts.length);
      // Reset hasLoadedWithContacts flag when contacts change
      setHasLoadedWithContacts(false);
    }
  }, [contacts.length, loadedContactsCount]);
  
  // Auto-refresh when contacts are loaded with improved retry logic
  React.useEffect(() => {
    // Trigger refresh when contacts change from empty to non-empty
    // OR when we have content but haven't loaded with the full contact list yet
    if (contacts.length > 0 && !isLoadingContacts && 
        (!hasLoadedWithContent || !hasLoadedWithContacts)) {
      console.log('[FollowingScreen] Contacts loaded, triggering auto-refresh');
      
      // Track retry attempts
      let retryCount = 0;
      const maxRetries = 3;
      
      // Function to attempt refresh with exponential backoff
      const attemptRefresh = () => {
        // Increase delay with each retry (1s, 2s, 4s)
        const delay = 1000 * Math.pow(2, retryCount);
        
        console.log(`[FollowingScreen] Scheduling refresh attempt ${retryCount + 1}/${maxRetries + 1} in ${delay}ms`);
        
        return setTimeout(async () => {
          // Skip if we've loaded content with the full contact list in the meantime
          if (hasLoadedWithContent && hasLoadedWithContacts) {
            console.log('[FollowingScreen] Content already loaded with full contact list, skipping refresh');
            return;
          }
          
          try {
            console.log(`[FollowingScreen] Executing refresh attempt ${retryCount + 1}/${maxRetries + 1}`);
            // Use force refresh to bypass cooldown
            await refresh(true);
            
            // Check if we got any items after a short delay
            setTimeout(() => {
              if (feedItems.length === 0 && retryCount < maxRetries && 
                  (!hasLoadedWithContent || !hasLoadedWithContacts)) {
                console.log(`[FollowingScreen] No items after refresh attempt ${retryCount + 1}, retrying...`);
                retryCount++;
                const nextTimer = attemptRefresh();
                
                // Store the timer ID in the ref so we can clear it if needed
                retryTimerRef.current = nextTimer;
              } else if (feedItems.length > 0) {
                console.log(`[FollowingScreen] Refresh successful, got ${feedItems.length} items`);
                setHasLoadedWithContent(true);
                // Mark as loaded with contacts if we have the full contact list
                if (contacts.length > 0) {
                  console.log(`[FollowingScreen] Marking as loaded with ${contacts.length} contacts`);
                  setLoadedContactsCount(contacts.length);
                  setHasLoadedWithContacts(true);
                }
              } else {
                console.log(`[FollowingScreen] All refresh attempts completed, got ${feedItems.length} items`);
              }
            }, 500);
          } catch (error) {
            console.error(`[FollowingScreen] Error during refresh attempt ${retryCount + 1}:`, error);
            
            // Retry on error if we haven't exceeded max retries
            if (retryCount < maxRetries && (!hasLoadedWithContent || !hasLoadedWithContacts)) {
              retryCount++;
              const nextTimer = attemptRefresh();
              retryTimerRef.current = nextTimer;
            }
          }
        }, delay);
      };
      
      // Start the first attempt with initial delay
      const timerId = attemptRefresh();
      retryTimerRef.current = timerId;
      
      // Clean up any pending timers on unmount
      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      };
    }
  }, [contacts.length, isLoadingContacts, refresh, feedItems.length, hasLoadedWithContent, hasLoadedWithContacts]);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewButton, setShowNewButton] = useState(false);
  const [newEntries, setNewEntries] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // Use refs
  const listRef = useRef<FlatList>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
    setNewEntries([]);
    setShowNewButton(false);
    // Scroll to top
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);
  
  // Handle refresh - updated to use forceRefresh parameter
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('[FollowingScreen] Starting manual refresh (force=true)');
      
      // Check if we have contacts before refreshing
      if (contacts.length === 0) {
        console.log('[FollowingScreen] No contacts available for refresh, using fallback');
        // Still try to refresh with force=true to bypass cooldown
      }
      
      // Use force=true to bypass cooldown
      await refresh(true);
      // Add a slight delay to ensure the UI updates
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log('[FollowingScreen] Manual refresh completed successfully');
      
      // If we get content, mark as loaded with content
      if (feedItems.length > 0) {
        setHasLoadedWithContent(true);
        
        // Mark as loaded with contacts if we have the full contact list
        if (contacts.length > 0) {
          console.log(`[FollowingScreen] Marking as loaded with ${contacts.length} contacts after manual refresh`);
          setLoadedContactsCount(contacts.length);
          setHasLoadedWithContacts(true);
        }
      }
    } catch (error) {
      console.error('[FollowingScreen] Error refreshing feed:', error);
      // Log more detailed error information
      if (error instanceof Error) {
        console.error(`[FollowingScreen] Error details: ${error.message}`);
        if (error.stack) {
          console.error(`[FollowingScreen] Stack trace: ${error.stack}`);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, contacts.length, feedItems.length]);

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
  const handlePostPress = useCallback((entry: any) => {
    // Just show an alert with the entry info for testing
    alert(`Selected ${entry.type} with ID: ${entry.id || entry.eventId}`);
    
    // Alternatively, log to console for debugging
    console.log(`Selected ${entry.type}:`, entry);
  }, []);
  
  // Memoize render item function
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
  
  // Debug controls component - memoized
  const DebugControls = useCallback(() => (
    <View className="bg-gray-100 p-4 rounded-lg mx-4 mb-4">
      <Text className="font-bold mb-2">Debug Info:</Text>
      <Text>User: {currentUser?.pubkey?.substring(0, 8)}...</Text>
      <Text>Feed Items: {entries.length}</Text>
      <Text>Loading: {loading ? "Yes" : "No"}</Text>
      <Text>Offline: {isOffline ? "Yes" : "No"}</Text>
      <Text>Contacts: {contacts.length}</Text>
      <Text>Loading Contacts: {isLoadingContacts ? "Yes" : "No"}</Text>
      
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
  ), [currentUser?.pubkey, entries.length, loading, isOffline, contacts.length, isLoadingContacts, checkRelayConnections, handleRefresh]);
  
  // If user doesn't follow anyone or no content is available
  if (isAuthenticated && entries.length === 0 && !loading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-center mb-4">
          {isOffline 
            ? "You're offline. No cached content from followed users is available."
            : "No content from followed users found. Try following more users or check your relay connections."}
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
            <Text className="text-xs">Offline: {isOffline ? "Yes" : "No"}</Text>
            <Text className="text-xs">Has NDK follows: {currentUser?.follows ? "Yes" : "No"}</Text>
            
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
        data={entries as any[]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View className="flex-1 items-center justify-center p-8">
              <Text>Loading followed content...</Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center p-8">
              <Text>No posts from followed users found</Text>
              {isOffline && (
                <Text className="text-sm text-gray-500 mt-2">
                  You're currently offline. Connect to the internet to see the latest content.
                </Text>
              )}
            </View>
          )
        }
        contentContainerStyle={{ paddingVertical: 0 }} // Changed from paddingVertical: 8
      />
    </View>
  );
}

// Export the component wrapped with the offline state HOC
export default withOfflineState(FollowingScreen);
