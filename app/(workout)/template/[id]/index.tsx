// app/(workout)/template/[id]/index.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useTemplate } from './_layout';
import { formatTime } from '@/utils/formatTime';
import { 
  Edit2,
  Copy,
  Share2,
  Dumbbell, 
  Target,
  Calendar, 
  Hash,
  Clock,
  Award
} from 'lucide-react-native';

export default function OverviewTab() {
  const template = useTemplate();
  
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
              <Edit2 size={18} className="mr-2" />
              <Text>Edit Template</Text>
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onPress={() => console.log('Fork template')}>
              <Copy size={18} className="mr-2" />
              <Text>Save as My Template</Text>
            </Button>
          )}
          
          <Button variant="outline" className="w-full" onPress={() => console.log('Share template')}>
            <Share2 size={18} className="mr-2" />
            <Text>Share Template</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}