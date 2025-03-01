// app/(tabs)/social/following.tsx
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import SocialPost from '@/components/social/SocialPost';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import NostrLoginPrompt from '@/components/social/NostrLoginPrompt';
import EmptyFeed from '@/components/social/EmptyFeed';

// Sample mock data for posts
const MOCK_POSTS = [
  {
    id: '1',
    author: {
      name: 'Jane Fitness',
      handle: 'janefitness',
      avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
      pubkey: 'npub1q8s7vw...'
    },
    content: 'Just crushed this leg workout! New PR on squat 💪 #fitness #legday',
    createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    metrics: {
      likes: 24,
      comments: 5,
      reposts: 3
    },
    workout: {
      title: 'Leg Day Destroyer',
      exercises: ['Squats', 'Lunges', 'Leg Press'],
      duration: 45
    }
  },
  {
    id: '2',
    author: {
      name: 'Mark Strong',
      handle: 'markstrong',
      avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
      pubkey: 'npub1z92r3...'
    },
    content: 'Morning cardio session complete! 5K run in 22 minutes. Starting the day right! #running #cardio',
    createdAt: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    metrics: {
      likes: 18,
      comments: 2,
      reposts: 1
    },
    workout: {
      title: 'Morning Cardio',
      exercises: ['Running'],
      duration: 22
    }
  }
];

export default function FollowingScreen() {
  const { isAuthenticated } = useNDKCurrentUser();
  const [refreshing, setRefreshing] = React.useState(false);
  const [posts, setPosts] = React.useState(MOCK_POSTS);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate fetch - in a real app, this would be a call to load posts
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  if (!isAuthenticated) {
    return <NostrLoginPrompt message="Log in to see posts from people you follow" />;
  }

  if (posts.length === 0) {
    return <EmptyFeed message="You're not following anyone yet. Discover people to follow in the POWR or Global feeds." />;
  }

  return (
    <ScrollView
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {posts.map(post => (
        <SocialPost key={post.id} post={post} />
      ))}
    </ScrollView>
  );
}