// components/templates/ModalTemplateDetails.tsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, ScrollView, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import { WorkoutTemplate } from '@/types/templates';
import { useWorkoutStore } from '@/stores/workoutStore';
import { formatTime } from '@/utils/formatTime';
import { Calendar } from 'lucide-react-native';
import {
  X,
  ChevronLeft,  
  Star,
  Copy,
  Heart,
  Dumbbell, 
  Target,
  Hash,
  Clock,
  MessageSquare,
  Zap,
  Repeat,
  Bookmark
} from 'lucide-react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CustomTheme } from '@/lib/theme';

// Create the tab navigator
const Tab = createMaterialTopTabNavigator();

// Create a context to share the template with the tabs
interface TemplateContextType {
  template: WorkoutTemplate | null;
  onStartWorkout?: () => void;
}

const TemplateContext = createContext<TemplateContextType>({
  template: null
});

// Custom hook to access the template
function useTemplate() {
  const context = useContext(TemplateContext);
  if (!context.template) {
    throw new Error('useTemplate must be used within a TemplateContextProvider');
  }
  return { template: context.template, onStartWorkout: context.onStartWorkout };
}

interface ModalTemplateDetailsProps {
  templateId: string;
  open: boolean;
  onClose: () => void;
  onFavoriteChange?: (templateId: string, isFavorite: boolean) => void;
}

// Overview Tab Component
function OverviewTab() {
  const { template } = useTemplate();
  
  const { 
    title,
    type,
    category,
    description,
    exercises = [],
    tags = [],
    metadata,
    availability
  } = template;

  // Calculate source type from availability
  const sourceType = availability.source.includes('nostr') 
    ? 'nostr' 
    : availability.source.includes('powr')
      ? 'powr'
      : 'local';
      
  const isEditable = sourceType === 'local';

  return (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 p-4">
        {/* Basic Info Section */}
        <View className="flex-row items-center gap-2">
          <Badge 
            variant={sourceType === 'local' ? 'outline' : 'secondary'}
            className="capitalize"
          >
            <Text>{sourceType === 'local' ? 'My Template' : sourceType === 'powr' ? 'POWR Template' : 'Nostr Template'}</Text>
          </Badge>
          <Badge 
            variant="outline" 
            className="capitalize bg-muted"
          >
            <Text>{type}</Text>
          </Badge>
        </View>

        <Separator className="bg-border" />

        {/* Category Section */}
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 items-center justify-center rounded-md bg-muted">
            <Target size={18} className="text-muted-foreground" />
          </View>
          <View>
            <Text className="text-sm text-muted-foreground">Category</Text>
            <Text className="text-base font-medium text-foreground">{category}</Text>
          </View>
        </View>

        {/* Description Section */}
        {description && (
          <View>
            <Text className="text-base font-semibold text-foreground mb-2">Description</Text>
            <Text className="text-base text-muted-foreground leading-relaxed">{description}</Text>
          </View>
        )}

        {/* Exercises Section */}
        <View>
          <View className="flex-row items-center gap-2 mb-2">
            <Dumbbell size={16} className="text-muted-foreground" />
            <Text className="text-base font-semibold text-foreground">Exercises</Text>
          </View>
          <View className="gap-2">
            {exercises.map((exerciseConfig, index) => (
              <View key={index} className="bg-card p-3 rounded-lg">
                <Text className="text-base font-medium text-foreground">
                  {exerciseConfig.exercise.title}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {exerciseConfig.targetSets} sets × {exerciseConfig.targetReps} reps
                </Text>
                {exerciseConfig.notes && (
                  <Text className="text-sm text-muted-foreground mt-1">
                    {exerciseConfig.notes}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Tags Section */}
        {tags.length > 0 && (
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Hash size={16} className="text-muted-foreground" />
              <Text className="text-base font-semibold text-foreground">Tags</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  <Text>{tag}</Text>
                </Badge>
              ))}
            </View>
          </View>
        )}

        {/* Workout Parameters Section */}
        <View>
          <View className="flex-row items-center gap-2 mb-2">
            <Clock size={16} className="text-muted-foreground" />
            <Text className="text-base font-semibold text-foreground">Workout Parameters</Text>
          </View>
          <View className="gap-2">
            {template.rounds && (
              <View className="flex-row">
                <Text className="text-sm text-muted-foreground w-40">Rounds:</Text>
                <Text className="text-sm text-foreground">{template.rounds}</Text>
              </View>
            )}
            {template.duration && (
              <View className="flex-row">
                <Text className="text-sm text-muted-foreground w-40">Duration:</Text>
                <Text className="text-sm text-foreground">{formatTime(template.duration * 1000)}</Text>
              </View>
            )}
            {template.interval && (
              <View className="flex-row">
                <Text className="text-sm text-muted-foreground w-40">Interval:</Text>
                <Text className="text-sm text-foreground">{formatTime(template.interval * 1000)}</Text>
              </View>
            )}
            {template.restBetweenRounds && (
              <View className="flex-row">
                <Text className="text-sm text-muted-foreground w-40">Rest Between Rounds:</Text>
                <Text className="text-sm text-foreground">
                  {formatTime(template.restBetweenRounds * 1000)}
                </Text>
              </View>
            )}
            {metadata?.averageDuration && (
              <View className="flex-row">
                <Text className="text-sm text-muted-foreground w-40">Average Completion Time:</Text>
                <Text className="text-sm text-foreground">
                  {Math.round(metadata.averageDuration / 60)} minutes
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Usage Stats Section */}
        {metadata && (
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Calendar size={16} className="text-muted-foreground" />
              <Text className="text-base font-semibold text-foreground">Usage</Text>
            </View>
            <View className="gap-2">
              {metadata.useCount && (
                <Text className="text-base text-muted-foreground">
                  Used {metadata.useCount} times
                </Text>
              )}
              {metadata.lastUsed && (
                <Text className="text-base text-muted-foreground">
                  Last used: {new Date(metadata.lastUsed).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="gap-3 mt-2">
          {isEditable ? (
            <Button variant="outline" className="w-full" onPress={() => console.log('Edit template')}>
              <Text>Edit Template</Text>
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onPress={() => console.log('Fork template')}>
              <Copy size={18} className="mr-2" />
              <Text>Save as My Template</Text>
            </Button>
          )}
          
          <Button variant="outline" className="w-full" onPress={() => console.log('Share template')}>
            <Text>Share Template</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

// History Tab Component
function HistoryTab() {
  const { template } = useTemplate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Format date helper
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Mock workout history - this would come from your database in a real app
  const mockWorkoutHistory = [
    {
      id: 'hist1',
      date: new Date(2024, 1, 25),
      duration: 62, // minutes
      completed: true,
      notes: "Increased weight on squats by 10lbs",
      exercises: [
        { name: "Barbell Squat", sets: 3, reps: 8, weight: 215 },
        { name: "Bench Press", sets: 3, reps: 8, weight: 175 },
        { name: "Bent Over Row", sets: 3, reps: 8, weight: 155 }
      ]
    },
    {
      id: 'hist2',
      date: new Date(2024, 1, 18),
      duration: 58, // minutes
      completed: true,
      exercises: [
        { name: "Barbell Squat", sets: 3, reps: 8, weight: 205 },
        { name: "Bench Press", sets: 3, reps: 8, weight: 175 },
        { name: "Bent Over Row", sets: 3, reps: 8, weight: 155 }
      ]
    },
    {
      id: 'hist3',
      date: new Date(2024, 1, 11),
      duration: 65, // minutes
      completed: false,
      notes: "Stopped early due to time constraints",
      exercises: [
        { name: "Barbell Squat", sets: 3, reps: 8, weight: 205 },
        { name: "Bench Press", sets: 3, reps: 8, weight: 170 },
        { name: "Bent Over Row", sets: 2, reps: 8, weight: 150 }
      ]
    }
  ];
  
  // Simulate loading history data
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoading(false);
    };
    
    loadHistory();
  }, [template.id]);
  
  return (
    <ScrollView 
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 p-4">
        {/* Performance Summary */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Performance Summary</Text>
          <Card className="bg-card">
            <CardContent className="p-4">
              <View className="flex-row justify-between">
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Total Workouts</Text>
                  <Text className="text-xl font-semibold">{mockWorkoutHistory.length}</Text>
                </View>
                
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Avg Duration</Text>
                  <Text className="text-xl font-semibold">
                    {Math.round(mockWorkoutHistory.reduce((acc, w) => acc + w.duration, 0) / mockWorkoutHistory.length)} min
                  </Text>
                </View>
                
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Completion</Text>
                  <Text className="text-xl font-semibold">
                    {Math.round(mockWorkoutHistory.filter(w => w.completed).length / mockWorkoutHistory.length * 100)}%
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      
        {/* History List */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Workout History</Text>
          
          {isLoading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="small" className="mb-2" />
              <Text className="text-muted-foreground">Loading history...</Text>
            </View>
          ) : mockWorkoutHistory.length > 0 ? (
            <View className="gap-4">
              {mockWorkoutHistory.map((workout) => (
                <Card key={workout.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <View className="flex-row justify-between mb-2">
                      <Text className="font-semibold">{formatDate(workout.date)}</Text>
                      <Badge variant={workout.completed ? "default" : "outline"}>
                        <Text>{workout.completed ? "Completed" : "Incomplete"}</Text>
                      </Badge>
                    </View>
                    
                    <View className="flex-row justify-between mb-3">
                      <View>
                        <Text className="text-xs text-muted-foreground">Duration</Text>
                        <Text className="text-sm">{workout.duration} min</Text>
                      </View>
                      
                      <View>
                        <Text className="text-xs text-muted-foreground">Sets</Text>
                        <Text className="text-sm">
                          {workout.exercises.reduce((acc, ex) => acc + ex.sets, 0)}
                        </Text>
                      </View>
                      
                      <View>
                        <Text className="text-xs text-muted-foreground">Volume</Text>
                        <Text className="text-sm">
                          {workout.exercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0)} lbs
                        </Text>
                      </View>
                    </View>
                    
                    {workout.notes && (
                      <Text className="text-sm text-muted-foreground mb-3">
                        {workout.notes}
                      </Text>
                    )}
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <Text>View Details</Text>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </View>
          ) : (
            <View className="bg-muted p-8 rounded-lg items-center justify-center">
              <Calendar size={24} className="text-muted-foreground mb-2" />
              <Text className="text-muted-foreground text-center">
                No workout history available yet
              </Text>
              <Text className="text-sm text-muted-foreground text-center mt-1">
                Complete a workout using this template to see your history
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// Social Tab Component
function SocialTab() {
  const { template } = useTemplate();
  const [isLoading, setIsLoading] = useState(false);

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

export function ModalTemplateDetails({ 
  templateId,
  open,
  onClose,
  onFavoriteChange
}: ModalTemplateDetailsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [workoutTemplate, setWorkoutTemplate] = useState<WorkoutTemplate | null>(null);
	const [isFavorite, setIsFavorite] = useState(false);
	const [toggleCounter, setToggleCounter] = useState(0);
  
  const theme = useTheme() as CustomTheme;
  const { isDarkColorScheme } = useColorScheme();
  
  // Use the workoutStore
  const { 
    startWorkoutFromTemplate, 
    checkFavoriteStatus, 
    addFavorite, 
    removeFavorite 
  } = useWorkoutStore();
  
  // Load template data when the modal opens or templateId changes
	useEffect(() => {
		async function loadTemplate() {
			// Don't load data if the modal is closed
			if (!open) return;
			
			try {
				setIsLoading(true);
				
				if (!templateId) {
					setIsLoading(false);
					return;
				}
				
				// Always fetch the current favorite status from the store
				const currentIsFavorite = checkFavoriteStatus(templateId);
				setIsFavorite(currentIsFavorite);
				console.log(`Initial load: Template ${templateId} isFavorite: ${currentIsFavorite}`);
        
        // TODO: Implement fetching from database if needed
        // For now, create a mock template if we couldn't find it
        const mockTemplate: WorkoutTemplate = {
          id: templateId,
          title: "Sample Workout",
          type: "strength",
          category: "Full Body",
          exercises: [{
            exercise: {
              id: "ex1",
              title: "Barbell Squat",
              type: "strength",
              category: "Legs",
              tags: ["compound", "legs"],
              availability: { source: ["local"] },
              created_at: Date.now()
            },
            targetSets: 3,
            targetReps: 8
          }],
          isPublic: false,
          tags: ["strength", "beginner"],
          version: 1,
          created_at: Date.now(),
          availability: { source: ["local"] }
        };
        
        setWorkoutTemplate(mockTemplate);
				setIsLoading(false);
			} catch (error) {
				console.error("Error loading template:", error);
				setIsLoading(false);
			}
		}
		
		loadTemplate();
	}, [templateId, open, checkFavoriteStatus]);
  
  const handleStartWorkout = async () => {
    if (!workoutTemplate) return;
    
    try {
      // Use the workoutStore action to start a workout from template
      await startWorkoutFromTemplate(workoutTemplate.id);
      
      // Close the modal
      onClose();
      
      // Navigate to the active workout screen
      // We'll leave navigation to the parent component
    } catch (error) {
      console.error("Error starting workout:", error);
    }
  };
  
	// Inside your handleToggleFavorite function, update it to:
	const handleToggleFavorite = async () => {
		if (!workoutTemplate) return;
		
		try {
			// Get the current state directly from the store
			const currentIsFavorite = checkFavoriteStatus(workoutTemplate.id);
			console.log(`Current store state: Template ${workoutTemplate.id} isFavorite: ${currentIsFavorite}`);
			
			// The new state will be the opposite
			const newFavoriteStatus = !currentIsFavorite;
			
			// Update the store first
			if (currentIsFavorite) {
				await removeFavorite(workoutTemplate.id);
				console.log(`Removed template with ID "${workoutTemplate.id}" from favorites (store action)`);
			} else {
				await addFavorite(workoutTemplate);
				console.log(`Added template "${workoutTemplate.title}" to favorites (store action)`);
			}
			
			// Verify the change took effect in the store
			const updatedIsFavorite = checkFavoriteStatus(workoutTemplate.id);
			console.log(`After store update: Template ${workoutTemplate.id} isFavorite: ${updatedIsFavorite}`);
			
			// Now update our local state
			setIsFavorite(updatedIsFavorite);
			
			// Force re-render if needed
			setToggleCounter(prev => prev + 1);
			
			// Notify parent component
			if (onFavoriteChange) {
				onFavoriteChange(workoutTemplate.id, updatedIsFavorite);
			}
			
			console.log(`Toggled favorite UI: ${workoutTemplate.id} is now ${updatedIsFavorite ? 'favorited' : 'unfavorited'}`);
		} catch (error) {
			console.error("Error toggling favorite:", error);
		}
	};

	console.log(`Template ${workoutTemplate?.id} isFavorite: ${isFavorite}`);
  
  // Don't render anything if the modal is closed
  if (!open) return null;
  
  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View 
          className={`bg-background ${isDarkColorScheme ? 'bg-card border border-border' : ''} rounded-lg w-[95%] h-[85%] max-w-xl shadow-xl overflow-hidden`}
          style={{ maxHeight: 700 }}
        >
          {/* Loading State */}
          {isLoading || !workoutTemplate ? (
            <View className="flex-1 items-center justify-center p-6">
              <ActivityIndicator size="large" className="mb-4" />
              <Text className="text-muted-foreground">Loading template...</Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View className="flex-row justify-between items-center p-4 border-b border-border">
                <View className="flex-row items-center flex-1">
                  <Text className="text-xl font-bold text-foreground" numberOfLines={1}>
                    {workoutTemplate.title}
                  </Text>
                </View>
                
                <View className="flex-row items-center">
									<Button 
										variant="ghost" 
										size="icon"
										onPress={handleToggleFavorite}
										className="mr-2"
									>
										{/* Force re-render by using key with the current favorite state */}
										<Star 
											key={`star-${workoutTemplate.id}-${isFavorite}-${toggleCounter}`}
											className={isFavorite ? "text-primary" : "text-muted-foreground"} 
											fill={isFavorite ? "currentColor" : "none"}
											size={22} 
										/>
									</Button>
                  
                  <TouchableOpacity onPress={onClose} className="ml-2 p-1">
                    <X size={24} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Tab Navigator */}
              <View style={{ flex: 1 }}>
                <TemplateContext.Provider value={{ 
                  template: workoutTemplate,
                  onStartWorkout: handleStartWorkout 
                }}>
                  <Tab.Navigator
                    screenOptions={{
                      tabBarActiveTintColor: theme.colors.tabIndicator,
                      tabBarInactiveTintColor: theme.colors.tabInactive,
                      tabBarLabelStyle: {
                        fontSize: 13,
                        textTransform: 'capitalize',
                        fontWeight: 'bold',
                        marginHorizontal: -4,
                      },
                      tabBarIndicatorStyle: {
                        backgroundColor: theme.colors.tabIndicator,
                        height: 2,
                      },
                      tabBarStyle: { 
                        backgroundColor: theme.colors.background,
                        elevation: 0,
                        shadowOpacity: 0,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.border,
                      },
                      tabBarPressColor: theme.colors.primary,
                    }}
                  >
                    <Tab.Screen name="Overview">
                      {() => <OverviewTab />}
                    </Tab.Screen>
                    <Tab.Screen name="Social">
                      {() => <SocialTab />}
                    </Tab.Screen>
                    <Tab.Screen name="History">
                      {() => <HistoryTab />}
                    </Tab.Screen>
                  </Tab.Navigator>
                </TemplateContext.Provider>
              </View>
              
              {/* Footer with Start button */}
              <View className="p-4 border-t border-border">
                <Button
                  style={{ backgroundColor: 'hsl(261, 90%, 66%)' }}
                  className="w-full"
                  onPress={handleStartWorkout}
                >
                  <Text className="text-white font-medium">Start Workout</Text>
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )};