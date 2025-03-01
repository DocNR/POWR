// app/(tabs)/social/global.tsx
import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/text';
import SocialPost from '@/components/social/SocialPost';

// Sample mock data for global feed - more diverse content
const GLOBAL_POSTS = [
  {
    id: '1',
    author: {
      name: 'Strength Coach',
      handle: 'strengthcoach',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      pubkey: 'npub1q8s7vw...'
    },
    content: 'Form tip: When squatting, make sure your knees track in line with your toes. This helps protect your knees and ensures proper muscle engagement. #squatform #technique',
    createdAt: new Date(Date.now() - 3600000 * 3), // 3 hours ago
    metrics: {
      likes: 132,
      comments: 28,
      reposts: 45
    }
  },
  {
    id: '2',
    author: {
      name: 'Marathon Runner',
      handle: 'marathoner',
      avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
      pubkey: 'npub1z92r3...'
    },
    content: 'Just finished my 10th marathon this year! Boston Marathon was an amazing experience. Thanks for all the support! #marathon #running #endurance',
    createdAt: new Date(Date.now() - 3600000 * 14), // 14 hours ago
    metrics: {
      likes: 214,
      comments: 38,
      reposts: 22
    },
    workout: {
      title: 'Boston Marathon',
      exercises: ['Running'],
      duration: 218 // 3:38 marathon
    }
  },
  {
    id: '3',
    author: {
      name: 'PowerLifter',
      handle: 'liftsheavy',
      avatar: 'https://randomuser.me/api/portraits/men/85.jpg',
      pubkey: 'npub1xne8q...'
    },
    content: 'NEW PR ALERT! 💪 Just hit 500lbs on deadlift after 3 years of consistent training. Proof that patience and consistency always win. #powerlifting #deadlift #pr',
    createdAt: new Date(Date.now() - 3600000 * 36), // 36 hours ago
    metrics: {
      likes: 347,
      comments: 72,
      reposts: 41
    },
    workout: {
      title: 'Deadlift Day',
      exercises: ['Deadlifts', 'Back Accessories'],
      duration: 65
    }
  },
  {
    id: '4',
    author: {
      name: 'Yoga Master',
      handle: 'yogalife',
      avatar: 'https://randomuser.me/api/portraits/women/50.jpg',
      pubkey: 'npub1r72df...'
    },
    content: 'Morning yoga flow to start the day centered and grounded. Remember that flexibility isn\'t just physical - it\'s mental too. #yoga #morningroutine #wellness',
    createdAt: new Date(Date.now() - 3600000 * 48), // 2 days ago
    metrics: {
      likes: 183,
      comments: 12,
      reposts: 25
    },
    workout: {
      title: 'Morning Yoga Flow',
      exercises: ['Yoga'],
      duration: 30
    }
  }
];

export default function GlobalScreen() {
  const [refreshing, setRefreshing] = React.useState(false);
  const [posts, setPosts] = React.useState(GLOBAL_POSTS);

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
      {posts.map(post => (
        <SocialPost key={post.id} post={post} />
      ))}
    </ScrollView>
  );
}