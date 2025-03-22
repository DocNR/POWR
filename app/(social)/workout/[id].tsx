// app/(social)/workout/[id].tsx
import React, { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  User, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  Dumbbell,
  Heart,
  MessageCircle,
  CheckCircle
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useNDK } from '@/lib/hooks/useNDK';
import { useProfile } from '@/lib/hooks/useProfile';
import { parseWorkoutRecord, POWR_EVENT_KINDS } from '@/types/nostr-workout';
import { SocialFeedService } from '@/lib/social/socialFeedService';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ndk } = useNDK();
  const [event, setEvent] = useState<any>(null);
  const [workout, setWorkout] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  
  // Profile for the workout author
  const { profile } = useProfile(workout?.author);
  
  // Fetch the workout event
  useEffect(() => {
    if (!ndk || !id) return;
    
    const fetchEvent = async () => {
      try {
        setLoading(true);
        
        // Fetch the workout event
        const filter = {
          ids: [id],
          kinds: [POWR_EVENT_KINDS.WORKOUT_RECORD]
        };
        
        const events = await ndk.fetchEvents(filter);
        
        if (events.size > 0) {
          const workoutEvent = Array.from(events)[0];
          setEvent(workoutEvent);
          
          // Parse the workout data
          const parsedWorkout = parseWorkoutRecord(workoutEvent);
          setWorkout(parsedWorkout);
          
          // Fetch comments
          const socialService = new SocialFeedService(ndk);
          const fetchedComments = await socialService.getComments(id);
          setComments(fetchedComments);
          setCommentCount(fetchedComments.length);
          
          // Fetch likes
          const likesFilter = {
            kinds: [POWR_EVENT_KINDS.REACTION],
            '#e': [id]
          };
          
          const likes = await ndk.fetchEvents(likesFilter);
          setLikeCount(likes.size);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching workout:', error);
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [ndk, id]);
  
  // Handle like button press
  const handleLike = async () => {
    if (!ndk || !event) return;
    
    try {
      const socialService = new SocialFeedService(ndk);
      await socialService.reactToEvent(event);
      
      setLiked(true);
      setLikeCount(prev => prev + 1);
    } catch (error) {
      console.error('Error liking workout:', error);
    }
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!ndk || !event || !commentText.trim() || isPostingComment) return;
    
    setIsPostingComment(true);
    
    try {
      const socialService = new SocialFeedService(ndk);
      const comment = await socialService.postComment(event, commentText.trim());
      
      // Add the new comment to the list
      setComments(prev => [...prev, comment]);
      setCommentCount(prev => prev + 1);
      
      // Clear the input
      setCommentText('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsPostingComment(false);
    }
  };

  // Format date string
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown date';
    
    try {
      return format(new Date(timestamp), 'PPP');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Format time string
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    
    try {
      return format(new Date(timestamp), 'p');
    } catch (error) {
      return '';
    }
  };
  
  // Format duration
  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime || !endTime) return 'Unknown duration';
    
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
  };
  
  // Format comment time
  const formatCommentTime = (timestamp: number) => {
    try {
      const date = new Date(timestamp * 1000);
      return format(date, 'MMM d, yyyy • h:mm a');
    } catch (error) {
      return 'Unknown time';
    }
  };
  
  // Handle back button press
  const handleBack = () => {
    router.back();
  };
  
  // Set up header with proper back button for iOS
  return (
    <>
      <Stack.Screen 
        options={{
          headerTitle: workout?.title || 'Workout Details',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack}>
              <ChevronLeft size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="mt-4">Loading workout...</Text>
        </View>
      ) : !workout ? (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-lg text-center mb-4">Workout not found</Text>
          <Button onPress={handleBack}>
            <Text>Go back</Text>
          </Button>
        </View>
      ) : (
        <ScrollView className="flex-1 bg-background">
          <View className="p-4">
            {/* Workout header */}
            <View className="mb-6">
              <Text className="text-2xl font-bold mb-2">{workout.title}</Text>
              
              {/* Author info */}
              <View className="flex-row items-center mb-4">
                <Avatar className="h-8 w-8 mr-2" alt={profile?.name || 'User avatar'}>
                  {profile?.image ? (
                    <AvatarImage source={{ uri: profile.image }} />
                  ) : (
                    <AvatarFallback>
                      <User size={16} />
                    </AvatarFallback>
                  )}
                </Avatar>
                <View className="flex-row items-center">
                  <Text className="text-muted-foreground">
                    {profile?.name || 'Nostr User'}
                  </Text>
                  {profile?.nip05 && (
                    <CheckCircle size={14} className="text-primary ml-1" />
                  )}
                </View>
              </View>
              
              {/* Time and date */}
              <View className="flex-row flex-wrap gap-2 mb-2">
                <View className="flex-row items-center bg-muted/30 px-3 py-1 rounded-full">
                  <Calendar size={16} className="mr-1" />
                  <Text className="text-sm">{formatDate(workout.startTime)}</Text>
                </View>
                
                <View className="flex-row items-center bg-muted/30 px-3 py-1 rounded-full">
                  <Clock size={16} className="mr-1" />
                  <Text className="text-sm">{formatTime(workout.startTime)}</Text>
                </View>
                
                {workout.endTime && (
                  <View className="flex-row items-center bg-muted/30 px-3 py-1 rounded-full">
                    <Dumbbell size={16} className="mr-1" />
                    <Text className="text-sm">
                      {formatDuration(workout.startTime, workout.endTime)}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Workout type */}
              <Badge className="mr-2">
                <Text>{workout.type}</Text>
              </Badge>
            </View>
            
            {/* Workout notes */}
            {workout.notes && (
              <Card className="mb-6">
                <CardHeader>
                  <Text className="font-semibold">Notes</Text>
                </CardHeader>
                <CardContent>
                  <Text>{workout.notes}</Text>
                </CardContent>
              </Card>
            )}
            
            {/* Exercise list */}
            <Card className="mb-6">
              <CardHeader>
                <Text className="font-semibold">Exercises</Text>
              </CardHeader>
              <CardContent>
                {workout.exercises.length === 0 ? (
                  <Text className="text-muted-foreground">No exercises recorded</Text>
                ) : (
                  workout.exercises.map((exercise: any, index: number) => (
                    <View key={index} className="mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
                      <Text className="font-medium text-lg mb-1">{exercise.name}</Text>
                      
                      <View className="flex-row flex-wrap gap-2 mt-2">
                        {exercise.weight && (
                          <Badge variant="outline">
                            <Text>{exercise.weight}kg</Text>
                          </Badge>
                        )}
                        
                        {exercise.reps && (
                          <Badge variant="outline">
                            <Text>{exercise.reps} reps</Text>
                          </Badge>
                        )}
                        
                        {exercise.rpe && (
                          <Badge variant="outline">
                            <Text>RPE {exercise.rpe}</Text>
                          </Badge>
                        )}
                        
                        {exercise.setType && (
                          <Badge variant="outline">
                            <Text>{exercise.setType}</Text>
                          </Badge>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>
            
            {/* Interactions */}
            <Card className="mb-6">
              <CardHeader>
                <Text className="font-semibold">Interactions</Text>
              </CardHeader>
              <CardContent>
                <View className="flex-row gap-4">
                  <Button
                    variant="outline"
                    className="flex-row items-center gap-2"
                    onPress={handleLike}
                    disabled={liked}
                  >
                    <Heart size={18} className={liked ? "text-red-500" : "text-muted-foreground"} fill={liked ? "#ef4444" : "none"} />
                    <Text>{likeCount} Likes</Text>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="flex-row items-center gap-2"
                  >
                    <MessageCircle size={18} className="text-muted-foreground" />
                    <Text>{commentCount} Comments</Text>
                  </Button>
                </View>
              </CardContent>
            </Card>
            
            {/* Comments section */}
            <Card className="mb-6">
              <CardHeader>
                <Text className="font-semibold">Comments</Text>
              </CardHeader>
              <CardContent>
                {/* Comment input */}
                <View className="mb-4 flex-row">
                  <Input
                    className="flex-1 mr-2"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <Button 
                    onPress={handleSubmitComment}
                    disabled={!commentText.trim() || isPostingComment}
                  >
                    <Text>{isPostingComment ? 'Posting...' : 'Post'}</Text>
                  </Button>
                </View>
                
                {/* Comments list */}
                {comments.length === 0 ? (
                  <Text className="text-muted-foreground">No comments yet. Be the first to comment!</Text>
                ) : (
                  comments.map((comment, index) => (
                    <View key={index} className="mb-4 pb-4 border-b border-border last:border-0 last:mb-0 last:pb-0">
                      {/* Comment author */}
                      <View className="flex-row items-center mb-2">
                        <Avatar className="h-6 w-6 mr-2" alt="Comment author">
                          <AvatarFallback>
                            <User size={12} />
                          </AvatarFallback>
                        </Avatar>
                        <Text className="text-sm text-muted-foreground">
                          {comment.pubkey.slice(0, 8)}...
                        </Text>
                        <Text className="text-xs text-muted-foreground ml-2">
                          {formatCommentTime(comment.created_at)}
                        </Text>
                      </View>
                      
                      {/* Comment content */}
                      <Text>{comment.content}</Text>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>
            
            {/* Back button at bottom for additional usability */}
            <Button 
              onPress={handleBack}
              className="mb-8"
            >
              <Text>Back to Feed</Text>
            </Button>
          </View>
        </ScrollView>
      )}
    </>
  );
}