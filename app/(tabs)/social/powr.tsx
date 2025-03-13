// app/(tabs)/social/powr.tsx
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import SocialPost from '@/components/social/SocialPost';
import { Zap } from 'lucide-react-native';
import POWRPackSection from '@/components/social/POWRPackSection'; // Add this import

// Sample mock data for posts from POWR team/recommendations
const POWR_POSTS = [
  {
    id: '1',
    author: {
      name: 'POWR Team',
      handle: 'powrteam',
      avatar: 'https://i.pravatar.cc/150?img=12',
      pubkey: 'npub1q8s7vw...',
      verified: true
    },
    content: 'Welcome to the new social feed in POWR! Share your workouts, follow friends and get inspired by the global fitness community. #powrapp',
    createdAt: new Date(Date.now() - 3600000 * 48), // 2 days ago
    metrics: {
      likes: 158,
      comments: 42,
      reposts: 27
    },
    featured: true
  },
  {
    id: '2',
    author: {
      name: 'Sarah Trainer',
      handle: 'sarahfitness',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      pubkey: 'npub1z92r3...'
    },
    content: 'Just released my new 30-day strength program! Check it out in my profile and let me know what you think. #strengthtraining #30daychallenge',
    createdAt: new Date(Date.now() - 3600000 * 24), // 1 day ago
    metrics: {
      likes: 84,
      comments: 15,
      reposts: 12
    },
    workout: {
      title: '30-Day Strength Builder',
      exercises: ['Full Program'],
      isProgramPreview: true
    }
  },
  {
    id: '3',
    author: {
      name: 'POWR Team',
      handle: 'powrteam',
      avatar: 'https://i.pravatar.cc/150?img=12',
      pubkey: 'npub1q8s7vw...',
      verified: true
    },
    content: 'New features alert! You can now track your rest periods automatically and share your PRs directly to your feed. Update to the latest version to try it out!',
    createdAt: new Date(Date.now() - 3600000 * 72), // 3 days ago
    metrics: {
      likes: 207,
      comments: 31,
      reposts: 45
    },
    featured: true
  }
];

export default function PowerScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [posts, setPosts] = React.useState(POWR_POSTS);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate fetch
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <ScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* POWR Welcome Section */}
      <View className="p-4 border-b border-border bg-primary/5">
        <View className="flex-row items-center mb-2">
          <Zap size={20} className="mr-2 text-primary" fill="currentColor" />
          <Text className="text-lg font-bold">POWR Community</Text>
        </View>
        <Text className="text-muted-foreground">
          Official updates, featured content, and community highlights from the POWR team.
        </Text>
      </View>

      {/* POWR Packs Section - Add this */}
      <POWRPackSection />

      {/* Posts */}
      {posts.map(post => (
        <SocialPost key={post.id} post={post} />
      ))}
    </ScrollView>
  );
}