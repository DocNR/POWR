// app/(workout)/template/[id]/social.tsx
import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  ThumbsUp 
} from 'lucide-react-native';
import { useTemplate } from './_layout';

// Mock social feed data
const mockSocialFeed = [
  {
    id: 'social1',
    userName: 'FitnessFanatic',
    userAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    pubkey: 'npub1q8s7vw...',
    timestamp: new Date(Date.now() - 3600000 * 2), // 2 hours ago
    content: 'Just crushed this Full Body workout! New PR on bench press 🎉',
    metrics: {
      duration: 58, // in minutes
      volume: 4500, // total weight
      exercises: 5
    },
    likes: 12,
    comments: 3
  },
  {
    id: 'social2',
    userName: 'StrengthJourney',
    userAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    pubkey: 'npub1z92r3...',
    timestamp: new Date(Date.now() - 3600000 * 24), // 1 day ago
    content: 'Modified this workout with extra leg exercises. Feeling the burn!',
    metrics: {
      duration: 65,
      volume: 5200,
      exercises: "5+2"
    },
    likes: 8,
    comments: 1
  },
  {
    id: 'social3',
    userName: 'GymCoach',
    userAvatar: 'https://randomuser.me/api/portraits/men/62.jpg',
    pubkey: 'npub1xne8q...',
    timestamp: new Date(Date.now() - 3600000 * 48), // 2 days ago
    content: 'Great template for beginners! I recommend starting with lighter weights.',
    metrics: {
      duration: 45,
      volume: 3600,
      exercises: 5
    },
    likes: 24,
    comments: 7
  },
  {
    id: 'social4',
    userName: 'WeightLifter',
    userAvatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    pubkey: 'npub1r72df...',
    timestamp: new Date(Date.now() - 3600000 * 72), // 3 days ago
    content: 'Second time doing this workout. Improved my squat form significantly!',
    metrics: {
      duration: 52,
      volume: 4100,
      exercises: 5
    },
    likes: 15,
    comments: 2
  }
];

// Social Feed Item Component
function SocialFeedItem({ item }: { item: typeof mockSocialFeed[0] }) {
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        {/* User info and timestamp */}
        <View className="flex-row mb-3">
          <Avatar className="h-10 w-10 mr-3" alt={`${item.userName}'s profile picture`}>
            <AvatarImage source={{ uri: item.userAvatar }} />
            <AvatarFallback>
              <Text className="text-sm">{item.userName.substring(0, 2)}</Text>
            </AvatarFallback>
          </Avatar>
          
          <View className="flex-1">
            <View className="flex-row justify-between">
              <Text className="font-semibold">{item.userName}</Text>
              <Text className="text-xs text-muted-foreground">
                {item.timestamp.toLocaleDateString()}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              {item.pubkey.substring(0, 10)}...
            </Text>
          </View>
        </View>
        
        {/* Post content */}
        <Text className="mb-3">{item.content}</Text>
        
        {/* Workout metrics */}
        <View className="flex-row justify-between mb-3 p-3 bg-muted rounded-lg">
          <View className="items-center">
            <Text className="text-xs text-muted-foreground">Duration</Text>
            <Text className="font-semibold">{item.metrics.duration} min</Text>
          </View>
          
          <View className="items-center">
            <Text className="text-xs text-muted-foreground">Volume</Text>
            <Text className="font-semibold">{item.metrics.volume} lbs</Text>
          </View>
          
          <View className="items-center">
            <Text className="text-xs text-muted-foreground">Exercises</Text>
            <Text className="font-semibold">{item.metrics.exercises}</Text>
          </View>
        </View>
        
        {/* Actions */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Button variant="ghost" size="sm" className="p-1">
              <ThumbsUp size={16} className="text-muted-foreground mr-1" />
              <Text className="text-muted-foreground">{item.likes}</Text>
            </Button>
            <Button variant="ghost" size="sm" className="p-1">
              <MessageCircle size={16} className="text-muted-foreground mr-1" />
              <Text className="text-muted-foreground">{item.comments}</Text>
            </Button>
          </View>
          
          <Button variant="outline" size="sm">
            <Text>View Workout</Text>
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

export default function SocialTab() {
  const template = useTemplate();
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-base font-semibold text-foreground">
            Recent Activity
          </Text>
          <Badge variant="outline">
            <Text>Nostr</Text>
          </Badge>
        </View>
        
        {isLoading ? (
          <View className="items-center justify-center py-8">
            <ActivityIndicator size="small" className="mb-2" />
            <Text className="text-muted-foreground">Loading activity...</Text>
          </View>
        ) : mockSocialFeed.length > 0 ? (
          mockSocialFeed.map((item) => (
            <SocialFeedItem key={item.id} item={item} />
          ))
        ) : (
          <View className="items-center justify-center py-8 bg-muted rounded-lg">
            <MessageCircle size={24} className="text-muted-foreground mb-2" />
            <Text className="text-muted-foreground text-center">No social activity found</Text>
            <Text className="text-xs text-muted-foreground text-center mt-1">
              This workout hasn't been shared on Nostr yet
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}