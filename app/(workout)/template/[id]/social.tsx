// app/(workout)/template/[id]/social.tsx
import React, { useState } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Zap,
  Heart,
  Repeat,
  Bookmark
} from 'lucide-react-native';
import { useTemplate } from './_layout';
import { cn } from '@/lib/utils';

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
    comments: 3,
    zaps: 5,
    reposts: 2,
    bookmarked: false
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
    comments: 1,
    zaps: 3,
    reposts: 0,
    bookmarked: false
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
    comments: 7,
    zaps: 15,
    reposts: 6,
    bookmarked: true
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
    comments: 2,
    zaps: 8,
    reposts: 1,
    bookmarked: false
  }
];

// Social Feed Item Component
function SocialFeedItem({ item }: { item: typeof mockSocialFeed[0] }) {
  const [liked, setLiked] = useState(false);
  const [zapCount, setZapCount] = useState(item.zaps);
  const [bookmarked, setBookmarked] = useState(item.bookmarked);
  const [reposted, setReposted] = useState(false);
  const [commentCount, setCommentCount] = useState(item.comments);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
  };

  return (
    <View className="p-4 border-b border-border">
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
              {formatDate(item.timestamp)}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            @{item.pubkey.substring(0, 10)}...
          </Text>
        </View>
      </View>
      
      {/* Post content */}
      <Text className="mb-3">{item.content}</Text>
      
      {/* Workout metrics */}
      <View className="flex-row justify-between mb-3 p-3 bg-muted/50 rounded-lg">
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
      
      {/* Twitter-like action buttons */}
      <View className="flex-row justify-between items-center mt-2">
        {/* Comment button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          className="flex-row items-center"
          onPress={() => setCommentCount(prev => prev + 1)}
        >
          <MessageSquare size={18} className="text-muted-foreground" />
          {commentCount > 0 && (
            <Text className="text-xs text-muted-foreground ml-1">{commentCount}</Text>
          )}
        </TouchableOpacity>
        
        {/* Repost button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          className="flex-row items-center"
          onPress={() => setReposted(!reposted)}
        >
          <Repeat 
            size={18} 
            className={cn(
              reposted ? "text-green-500" : "text-muted-foreground"
            )} 
          />
          {(reposted || item.reposts > 0) && (
            <Text 
              className={cn(
                "text-xs ml-1",
                reposted ? "text-green-500" : "text-muted-foreground"
              )}
            >
              {reposted ? item.reposts + 1 : item.reposts}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Like button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          className="flex-row items-center"
          onPress={() => setLiked(!liked)}
        >
          <Heart 
            size={18} 
            className={cn(
              liked ? "text-red-500 fill-red-500" : "text-muted-foreground"
            )} 
          />
          {(liked || item.likes > 0) && (
            <Text 
              className={cn(
                "text-xs ml-1",
                liked ? "text-red-500" : "text-muted-foreground"
              )}
            >
              {liked ? item.likes + 1 : item.likes}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Zap button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          className="flex-row items-center"
          onPress={() => setZapCount(prev => prev + 1)}
        >
          <Zap 
            size={18} 
            className="text-amber-500" 
          />
          {zapCount > 0 && (
            <Text className="text-xs text-muted-foreground ml-1">{zapCount}</Text>
          )}
        </TouchableOpacity>
        
        {/* Bookmark button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => setBookmarked(!bookmarked)}
        >
          <Bookmark 
            size={18} 
            className={cn(
              bookmarked ? "text-blue-500 fill-blue-500" : "text-muted-foreground"
            )} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SocialTab() {
  const template = useTemplate();
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <ScrollView 
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="px-4 py-2 flex-row justify-between items-center border-b border-border">
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
        <View>
          {mockSocialFeed.map((item) => (
            <SocialFeedItem key={item.id} item={item} />
          ))}
        </View>
      ) : (
        <View className="items-center justify-center py-8 mx-4 mt-4 bg-muted rounded-lg">
          <MessageSquare size={24} className="text-muted-foreground mb-2" />
          <Text className="text-muted-foreground text-center">No social activity found</Text>
          <Text className="text-xs text-muted-foreground text-center mt-1">
            This workout hasn't been shared on Nostr yet
          </Text>
        </View>
      )}
    </ScrollView>
  );
}