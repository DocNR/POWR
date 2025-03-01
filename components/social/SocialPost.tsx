// components/social/SocialPost.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageSquare, Repeat, Share2, Zap, Clock, Dumbbell, CheckCircle } from 'lucide-react-native';
import { cn } from '@/lib/utils';

// Type definition for a social post
interface PostAuthor {
  name: string;
  handle: string;
  avatar: string;
  pubkey: string;
  verified?: boolean;
}

interface WorkoutInfo {
  title: string;
  exercises: string[];
  duration?: number;
  isProgramPreview?: boolean;
}

interface PostMetrics {
  likes: number;
  comments: number;
  reposts: number;
  zaps?: number;
}

interface SocialPostProps {
  post: {
    id: string;
    author: PostAuthor;
    content: string;
    createdAt: Date;
    metrics: PostMetrics;
    workout?: WorkoutInfo;
    featured?: boolean;
  };
}

export default function SocialPost({ post }: SocialPostProps) {
  const [liked, setLiked] = React.useState(false);
  const [reposted, setReposted] = React.useState(false);
  
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
  
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };

  return (
    <View className={cn(
      "p-4 border-b border-border",
      post.featured && "bg-primary/5"
    )}>
      {/* Author info */}
      <View className="flex-row mb-3">
        <Avatar className="h-10 w-10 mr-3" alt={`${post.author.name}'s profile picture`}>
          <AvatarImage source={{ uri: post.author.avatar }} />
          <AvatarFallback>
            <Text>{post.author.name.substring(0, 2)}</Text>
          </AvatarFallback>
        </Avatar>
        
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-semibold">{post.author.name}</Text>
            {post.author.verified && (
              <CheckCircle size={14} className="text-primary ml-1" fill="currentColor" />
            )}
            <Text className="text-muted-foreground ml-1 text-sm">
              @{post.author.handle} · {formatDate(post.createdAt)}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            {post.author.pubkey.substring(0, 10)}...
          </Text>
        </View>
      </View>
      
      {/* Post content */}
      <Text className="mb-3">{post.content}</Text>
      
      {/* Workout card - slimmer version */}
      {post.workout && (
        <TouchableOpacity 
          activeOpacity={0.7}
          className="border border-border rounded-lg mb-3 bg-muted/20 overflow-hidden"
        >
          <View className="p-3">
            <View className="flex-row items-center mb-1">
              <Dumbbell size={14} className="text-primary mr-2" />
              <Text className="font-medium">{post.workout.title}</Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <View className="flex-row flex-wrap flex-1">
                {post.workout.isProgramPreview ? (
                  <Badge variant="outline" className="mr-2 mb-1">
                    <Text className="text-xs">Program</Text>
                  </Badge>
                ) : (
                  post.workout.exercises.map((ex, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="mr-2 mb-1"
                    >
                      <Text className="text-xs">{ex}</Text>
                    </Badge>
                  ))
                )}
              </View>
              
              {post.workout.duration && (
                <View className="flex-row items-center">
                  <Clock size={14} className="text-muted-foreground mr-1" />
                  <Text className="text-sm text-muted-foreground">
                    {formatDuration(post.workout.duration)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
      
      {/* Action buttons */}
      <View className="flex-row justify-between items-center mt-2">
        {/* Comment button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          className="flex-row items-center"
        >
          <MessageSquare size={18} className="text-muted-foreground" />
          {post.metrics.comments > 0 && (
            <Text className="text-xs text-muted-foreground ml-1">
              {post.metrics.comments}
            </Text>
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
            className={reposted ? "text-green-500" : "text-muted-foreground"} 
          />
          {(reposted || post.metrics.reposts > 0) && (
            <Text 
              className={cn(
                "text-xs ml-1",
                reposted ? "text-green-500" : "text-muted-foreground"
              )}
            >
              {reposted ? post.metrics.reposts + 1 : post.metrics.reposts}
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
              liked ? "text-red-500" : "text-muted-foreground"
            )}
            fill={liked ? "#ef4444" : "none"}
          />
          {(liked || post.metrics.likes > 0) && (
            <Text 
              className={cn(
                "text-xs ml-1",
                liked ? "text-red-500" : "text-muted-foreground"
              )}
            >
              {liked ? post.metrics.likes + 1 : post.metrics.likes}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Zap button */}
        <TouchableOpacity 
          activeOpacity={0.7}
          className="flex-row items-center"
        >
          <Zap 
            size={18} 
            className="text-amber-500" 
          />
          {post.metrics.zaps && post.metrics.zaps > 0 && (
            <Text className="text-xs text-muted-foreground ml-1">
              {post.metrics.zaps}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Share button */}
        <TouchableOpacity 
          activeOpacity={0.7}
        >
          <Share2 size={18} className="text-muted-foreground" />
        </TouchableOpacity>
      </View>
    </View>
  );
}