// components/social/EnhancedSocialPost.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { View, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Repeat, Share, Clock, Dumbbell, CheckCircle, FileText, User } from 'lucide-react-native';
import UserAvatar from '@/components/UserAvatar';
import { useProfile } from '@/lib/hooks/useProfile';
import { useNDK } from '@/lib/hooks/useNDK';
import { FeedItem } from '@/lib/hooks/useSocialFeed';
import { SocialFeedService } from '@/lib/social/socialFeedService';
import { 
  ParsedSocialPost, 
  ParsedWorkoutRecord, 
  ParsedExerciseTemplate, 
  ParsedWorkoutTemplate,
  ParsedLongformContent 
} from '@/types/nostr-workout';
import { formatDistance } from 'date-fns';
import Markdown from 'react-native-markdown-display';

// Helper functions for all components to use
// Format timestamp
function formatTimestamp(timestamp: number) {
  try {
    return formatDistance(new Date(timestamp * 1000), new Date(), { addSuffix: true });
  } catch (error) {
    return 'recently';
  }
}

// Helper function to format duration in ms to readable format
function formatDuration(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

// Helper function to format minutes
function formatMinutes(minutes: number): string {
  if (isNaN(minutes)) return '';
  
  if (minutes < 60) {
    return `${Math.floor(minutes)}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

interface SocialPostProps {
  item: FeedItem;
  onPress?: () => void;
}

export default function EnhancedSocialPost({ item, onPress }: SocialPostProps) {
  const { ndk } = useNDK();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const { profile } = useProfile(item.originalEvent.pubkey);
  
  // Get likes count
  useEffect(() => {
    if (!ndk) return;
    
    let mounted = true;
    
    const fetchLikes = async () => {
      try {
        const filter = {
          kinds: [7], // Reactions
          '#e': [item.id]
        };
        
        const events = await ndk.fetchEvents(filter);
        if (mounted) {
          setLikeCount(events.size);
        }
      } catch (error) {
        console.error('Error fetching likes:', error);
      }
    };
    
    fetchLikes();
    
    return () => {
      mounted = false;
    };
  }, [ndk, item.id]);
  
  // Handle like button press
  const handleLike = async () => {
    if (!ndk) return;
    
    try {
      const socialService = new SocialFeedService(ndk);
      await socialService.reactToEvent(item.originalEvent);
      
      setLiked(true);
      setLikeCount(prev => prev + 1);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  // Render based on feed item type
  const renderContent = () => {
    switch (item.type) {
      case 'workout':
        return <WorkoutContent workout={item.parsedContent as ParsedWorkoutRecord} />;
      case 'exercise':
        return <ExerciseContent exercise={item.parsedContent as ParsedExerciseTemplate} />;
      case 'template':
        return <TemplateContent template={item.parsedContent as ParsedWorkoutTemplate} />;
      case 'social':
        return <SocialContent post={item.parsedContent as ParsedSocialPost} />;
      case 'article':
        // Only show ArticleContent for published articles (kind 30023)
        // Never show draft articles (kind 30024)
        if (item.originalEvent.kind === 30023) {
          return <ArticleContent article={item.parsedContent as ParsedLongformContent} />;
        } else {
          // For any other kinds, render as a social post
          // Create a proper ParsedSocialPost object with all required fields
          return <SocialContent post={{
            id: item.id,
            content: (item.parsedContent as ParsedLongformContent).title || 
                    (item.parsedContent as ParsedLongformContent).content || 
                    'Post content',
            author: item.originalEvent.pubkey || '',
            tags: [],
            createdAt: item.createdAt,
            quotedContent: undefined
          }} />;
        }
      default:
        return null;
    }
  };

  // Memoize the author name to prevent unnecessary re-renders
  const authorName = useMemo(() => {
    return profile?.name || 'Nostr User';
  }, [profile?.name]);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View className="py-3 px-4">
        <View className="flex-row">
          <UserAvatar 
            uri={profile?.image} 
            size="md" 
            fallback={profile?.name?.[0] || 'U'} 
            className="mr-3"
          />
          
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="font-semibold">{authorName}</Text>
              {profile?.nip05 && (
                <CheckCircle size={14} className="text-primary ml-1" />
              )}
            </View>
            <Text className="text-xs text-muted-foreground">
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>
        </View>
        
        <View className="mt-3">
          {renderContent()}
        </View>
        
        {/* Reduced space between content and action buttons */}
        <View className="flex-row justify-between items-center mt-2">
          <TouchableOpacity 
            className="flex-row items-center" 
            activeOpacity={0.7}
            onPress={handleLike}
            disabled={liked}
          >
            <Heart 
              size={18} 
              className={liked ? "text-red-500" : "text-muted-foreground"}
              fill={liked ? "#ef4444" : "none"}
            />
            {likeCount > 0 && (
              <Text className="ml-1 text-xs">
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.7}>
            <MessageCircle size={18} className="text-muted-foreground" />
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.7}>
            <Repeat size={18} className="text-muted-foreground" />
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center" activeOpacity={0.7}>
            <Share size={18} className="text-muted-foreground" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Hairline divider */}
      <View className="h-px bg-border w-full" />
    </TouchableOpacity>
  );
}

// Component for workout records
function WorkoutContent({ workout }: { workout: ParsedWorkoutRecord }) {
  return (
    <View>
      <Text className="text-lg font-semibold mb-2">{workout.title}</Text>
      
      {workout.notes && (
        <Text className="mb-2">{workout.notes}</Text>
      )}
      
      <View className="bg-muted/30 p-3 rounded-lg mb-0">
        <View className="flex-row items-center mb-2">
          <Dumbbell size={16} className="text-primary mr-2" />
          <Text className="font-medium">{workout.type} workout</Text>
          
          {workout.startTime && workout.endTime && (
            <View className="flex-row items-center ml-auto">
              <Clock size={14} className="text-muted-foreground mr-1" />
              <Text className="text-sm text-muted-foreground">
                {formatDuration(workout.endTime - workout.startTime)}
              </Text>
            </View>
          )}
        </View>
        
        {workout.exercises.length > 0 && (
          <View>
            <Text className="font-medium mb-1">Exercises:</Text>
            {workout.exercises.slice(0, 3).map((exercise, index) => (
              <Text key={index} className="text-sm">
                • {exercise.name} 
                {exercise.weight ? ` - ${exercise.weight}kg` : ''}
                {exercise.reps ? ` × ${exercise.reps}` : ''}
                {exercise.rpe ? ` @ RPE ${exercise.rpe}` : ''}
              </Text>
            ))}
            {workout.exercises.length > 3 && (
              <Text className="text-xs text-muted-foreground mt-1">
                +{workout.exercises.length - 3} more exercises
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// Component for exercise templates
function ExerciseContent({ exercise }: { exercise: ParsedExerciseTemplate }) {
  return (
    <View>
      <Text className="text-lg font-semibold mb-2">{exercise.title}</Text>
      
      {exercise.description && (
        <Text className="mb-2">{exercise.description}</Text>
      )}
      
      <View className="bg-muted/30 p-3 rounded-lg mb-0">
        <View className="flex-row flex-wrap mb-2">
          {exercise.equipment && (
            <Badge variant="outline" className="mr-2 mb-1">
              <Text>{exercise.equipment}</Text>
            </Badge>
          )}
          
          {exercise.difficulty && (
            <Badge variant="outline" className="mr-2 mb-1">
              <Text>{exercise.difficulty}</Text>
            </Badge>
          )}
        </View>
        
        {exercise.format.length > 0 && (
          <View className="mb-2">
            <Text className="font-medium mb-1">Tracks:</Text>
            <View className="flex-row flex-wrap">
              {exercise.format.map((format, index) => (
                <Badge key={index} className="mr-2 mb-1">
                  <Text>{format}</Text>
                </Badge>
              ))}
            </View>
          </View>
        )}
        
        {exercise.tags.length > 0 && (
          <View className="flex-row flex-wrap">
            {exercise.tags.map((tag, index) => (
              <Text key={index} className="text-xs text-primary mr-2">
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// Component for workout templates
function TemplateContent({ template }: { template: ParsedWorkoutTemplate }) {
  return (
    <View>
      <Text className="text-lg font-semibold mb-2">{template.title}</Text>
      
      {template.description && (
        <Text className="mb-2">{template.description}</Text>
      )}
      
      <View className="bg-muted/30 p-3 rounded-lg mb-0">
        <View className="flex-row items-center mb-2">
          <Dumbbell size={16} className="text-primary mr-2" />
          <Text className="font-medium">{template.type} template</Text>
          
          {template.duration && (
            <View className="flex-row items-center ml-auto">
              <Clock size={14} className="text-muted-foreground mr-1" />
              <Text className="text-sm text-muted-foreground">
                {formatMinutes(template.duration / 60)} {/* Convert seconds to minutes */}
              </Text>
            </View>
          )}
        </View>
        
        {template.rounds && (
          <Text className="text-sm mb-1">
            {template.rounds} {template.rounds === 1 ? 'round' : 'rounds'}
          </Text>
        )}
        
        {template.exercises.length > 0 && (
          <View>
            <Text className="font-medium mb-1">Exercises:</Text>
            {template.exercises.slice(0, 3).map((exercise, index) => (
              <Text key={index} className="text-sm">
                • {exercise.name || 'Exercise ' + (index + 1)}
              </Text>
            ))}
            {template.exercises.length > 3 && (
              <Text className="text-xs text-muted-foreground mt-1">
                +{template.exercises.length - 3} more exercises
              </Text>
            )}
          </View>
        )}
        
        {template.tags.length > 0 && (
          <View className="flex-row flex-wrap mt-2">
            {template.tags.map((tag, index) => (
              <Text key={index} className="text-xs text-primary mr-2">
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// Component for social posts
function SocialContent({ post }: { post: ParsedSocialPost }) {
  // Render the social post content
  const renderMainContent = () => (
    <Text className="mb-2">{post.content}</Text>
  );
  
  // Render quoted content if available
  const renderQuotedContent = () => {
    if (!post.quotedContent || !post.quotedContent.resolved) return null;
    
    const { type, resolved } = post.quotedContent;
    
    return (
      <View className="bg-muted/30 p-3 rounded-lg">
        <Text className="text-sm font-medium mb-1">
          {type === 'workout' ? 'Workout' : 
           type === 'exercise' ? 'Exercise' : 
           type === 'template' ? 'Workout Template' :
           type === 'article' ? 'Article' : 'Post'}:
        </Text>
        
        {type === 'workout' && <WorkoutQuote workout={resolved as ParsedWorkoutRecord} />}
        {type === 'exercise' && <ExerciseQuote exercise={resolved as ParsedExerciseTemplate} />}
        {type === 'template' && <TemplateQuote template={resolved as ParsedWorkoutTemplate} />}
        {type === 'article' && <ArticleQuote article={resolved as ParsedLongformContent} />}
      </View>
    );
  };
  
  return (
    <View>
      {renderMainContent()}
      {renderQuotedContent()}
    </View>
  );
}

// Component for long-form content
function ArticleContent({ article }: { article: ParsedLongformContent }) {
  // Limit content preview to a reasonable length
  const previewLength = 200;
  const hasFullContent = article.content && article.content.length > previewLength;
  
  return (
    <View>
      <View className="flex-row items-center mb-2">
        <FileText size={16} className="text-primary mr-2" />
        <Text className="font-medium">Article</Text>
      </View>

      <Text className="text-lg font-semibold mb-2">{article.title}</Text>
      
      {article.image && (
        <Image 
          source={{ uri: article.image }} 
          className="w-full h-48 rounded-md mb-2"
          resizeMode="cover"
        />
      )}
      
      {article.summary ? (
        <Text className="mb-0">{article.summary}</Text>
      ) : (
        <ScrollView style={{ maxHeight: 200 }}>
          <Markdown>
            {hasFullContent ? article.content.substring(0, previewLength) + '...' : article.content}
          </Markdown>
        </ScrollView>
      )}
      
      {article.publishedAt && (
        <Text className="text-xs text-muted-foreground mt-1">
          Published: {formatTimestamp(article.publishedAt)}
        </Text>
      )}
      
      {article.tags.length > 0 && (
        <View className="flex-row flex-wrap mt-1">
          {article.tags.map((tag, index) => (
            <Text key={index} className="text-xs text-primary mr-2">
              #{tag}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Add ArticleQuote component for quoted articles
function ArticleQuote({ article }: { article: ParsedLongformContent }) {
  return (
    <View>
      <Text className="font-medium">{article.title}</Text>
      {article.summary ? (
        <Text className="text-sm text-muted-foreground">{article.summary}</Text>
      ) : (
        <Text className="text-sm text-muted-foreground">
          {article.content ? article.content.substring(0, 100) + '...' : 'No content'}
        </Text>
      )}
    </View>
  );
}

// Simplified versions of content for quoted posts

function WorkoutQuote({ workout }: { workout: ParsedWorkoutRecord }) {
  return (
    <View>
      <Text className="font-medium">{workout.title}</Text>
      <Text className="text-sm text-muted-foreground">
        {workout.exercises.length} exercises • {
          workout.startTime && workout.endTime ? 
          formatDuration(workout.endTime - workout.startTime) : 
          'Duration N/A'
        }
      </Text>
    </View>
  );
}

function ExerciseQuote({ exercise }: { exercise: ParsedExerciseTemplate }) {
  return (
    <View>
      <Text className="font-medium">{exercise.title}</Text>
      {exercise.equipment && (
        <Text className="text-sm text-muted-foreground">
          {exercise.equipment} • {exercise.difficulty || 'Any level'}
        </Text>
      )}
    </View>
  );
}

function TemplateQuote({ template }: { template: ParsedWorkoutTemplate }) {
  return (
    <View>
      <Text className="font-medium">{template.title}</Text>
      <Text className="text-sm text-muted-foreground">
        {template.type} • {template.exercises.length} exercises
      </Text>
    </View>
  );
}
