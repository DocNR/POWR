// components/workout/FavoriteTemplate.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Clock, Dumbbell } from 'lucide-react-native';
import type { GestureResponderEvent } from 'react-native';

interface FavoriteTemplateProps {
  title: string;
  exercises: Array<{
    title: string;
    sets: number;
    reps: number;
  }>;
  duration?: number;
  exerciseCount: number;
  isFavorited?: boolean;
  onPress?: () => void;
  onFavoritePress?: () => void;
}

export default function FavoriteTemplate({
  title,
  exercises,
  duration,
  exerciseCount,
  isFavorited = false,
  onPress,
  onFavoritePress
}: FavoriteTemplateProps) {
  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      onPress={onPress}
    >
      <Card>
        <CardContent className="p-4">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-card-foreground mb-1">
                {title}
              </Text>
              
              <Text className="text-sm text-muted-foreground mb-2">
                {exercises.slice(0, 3).map(ex => 
                  `${ex.title} (${ex.sets}×${ex.reps})`
                ).join(', ')}
                {exercises.length > 3 && '...'}
              </Text>
              
              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center gap-1">
                  <Dumbbell size={16} className="text-muted-foreground" />
                  <Text className="text-sm text-muted-foreground">
                    {exerciseCount} exercises
                  </Text>
                </View>
                
                {duration && (
                  <View className="flex-row items-center gap-1">
                    <Clock size={16} className="text-muted-foreground" />
                    <Text className="text-sm text-muted-foreground">
                      {duration} min
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Button 
              variant="ghost" 
              size="icon"
              onPress={(e: GestureResponderEvent) => {
                e.stopPropagation();
                onFavoritePress?.();
              }}
            >
              <Star 
                size={20}
                className={isFavorited ? "text-primary" : "text-muted-foreground"}
                fill={isFavorited ? "currentColor" : "none"}
              />
            </Button>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}