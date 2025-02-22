// components/templates/TemplateDetails.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  Edit2, 
  Dumbbell, 
  Target, 
  Calendar, 
  Hash,
  ClipboardList, 
  Settings,
  LineChart
} from 'lucide-react-native';
import { WorkoutTemplate, getSourceDisplay } from '@/types/templates';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';

const Tab = createMaterialTopTabNavigator();

interface TemplateDetailsProps {
  template: WorkoutTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

// Overview Tab Component
function OverviewTab({ template, onEdit }: { template: WorkoutTemplate; onEdit?: () => void }) {
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

  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Basic Info Section */}
        <View className="flex-row items-center gap-2">
          <Badge 
            variant={sourceType === 'local' ? 'outline' : 'secondary'}
            className="capitalize"
          >
            <Text>{getSourceDisplay(template)}</Text>
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
              {metadata.averageDuration && (
                <Text className="text-base text-muted-foreground">
                  Average duration: {Math.round(metadata.averageDuration / 60)} minutes
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Edit Button */}
        {onEdit && (
          <Button 
            onPress={onEdit}
            className="w-full mt-2"
          >
            <Edit2 size={18} className="mr-2 text-primary-foreground" />
            <Text className="text-primary-foreground font-semibold">
              Edit Template
            </Text>
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

// History Tab Component
function HistoryTab({ template }: { template: WorkoutTemplate }) {
  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Performance Stats */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Performance Summary</Text>
          <View className="gap-4">
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground mb-1">Usage Stats</Text>
              <View className="flex-row justify-between mt-2">
                <View>
                  <Text className="text-sm text-muted-foreground">Total Workouts</Text>
                  <Text className="text-lg font-semibold text-foreground">
                    {template.metadata?.useCount || 0}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm text-muted-foreground">Avg. Duration</Text>
                  <Text className="text-lg font-semibold text-foreground">
                    {template.metadata?.averageDuration 
                      ? `${Math.round(template.metadata.averageDuration / 60)}m` 
                      : '--'}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm text-muted-foreground">Completion Rate</Text>
                  <Text className="text-lg font-semibold text-foreground">--</Text>
                </View>
              </View>
            </View>

            {/* Progress Chart Placeholder */}
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground mb-4">Progress Over Time</Text>
              <View className="h-40 items-center justify-center">
                <LineChart size={24} className="text-muted-foreground mb-2" />
                <Text className="text-sm text-muted-foreground">
                  Progress tracking coming soon
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* History List */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Recent Workouts</Text>
          <View className="gap-3">
            {/* Placeholder for when no history exists */}
            <View className="bg-muted p-8 rounded-lg items-center justify-center">
              <ClipboardList size={24} className="text-muted-foreground mb-2" />
              <Text className="text-muted-foreground text-center">
                No workout history available yet
              </Text>
              <Text className="text-sm text-muted-foreground text-center mt-1">
                Complete a workout using this template to see your history
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Settings Tab Component
function SettingsTab({ template }: { template: WorkoutTemplate }) {
  const {
    type,
    rounds,
    duration,
    interval,
    restBetweenRounds,
  } = template;

  // Helper function to format seconds into MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Workout Configuration */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Workout Settings</Text>
          <View className="gap-4">
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground mb-1">Workout Type</Text>
              <Text className="text-base font-medium text-foreground capitalize">{type}</Text>
            </View>

            {rounds && (
              <View className="bg-card p-4 rounded-lg">
                <Text className="text-sm text-muted-foreground mb-1">Number of Rounds</Text>
                <Text className="text-base font-medium text-foreground">{rounds}</Text>
              </View>
            )}

            {duration && (
              <View className="bg-card p-4 rounded-lg">
                <Text className="text-sm text-muted-foreground mb-1">Total Duration</Text>
                <Text className="text-base font-medium text-foreground">
                  {formatTime(duration)}
                </Text>
              </View>
            )}

            {interval && (
              <View className="bg-card p-4 rounded-lg">
                <Text className="text-sm text-muted-foreground mb-1">Interval Time</Text>
                <Text className="text-base font-medium text-foreground">
                  {formatTime(interval)}
                </Text>
              </View>
            )}

            {restBetweenRounds && (
              <View className="bg-card p-4 rounded-lg">
                <Text className="text-sm text-muted-foreground mb-1">Rest Between Rounds</Text>
                <Text className="text-base font-medium text-foreground">
                  {formatTime(restBetweenRounds)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sync Settings */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Sync Settings</Text>
          <View className="bg-card p-4 rounded-lg">
            <Text className="text-sm text-muted-foreground mb-1">Template Source</Text>
            <Text className="text-base font-medium text-foreground">
              {getSourceDisplay(template)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export function TemplateDetails({ 
  template, 
  open,
  onOpenChange,
  onEdit 
}: TemplateDetailsProps) {
  const theme = useTheme() as CustomTheme;

  return (
    <Sheet isOpen={open} onClose={() => onOpenChange(false)}>
      <SheetHeader>
        <SheetTitle>
          <Text className="text-xl font-bold text-foreground">{template.title}</Text>
        </SheetTitle>
      </SheetHeader>
      <SheetContent>
        <View style={{ flex: 1, minHeight: 400 }} className="rounded-t-[10px]">
          <Tab.Navigator
            style={{ flex: 1 }}
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
            <Tab.Screen
              name="overview"
              options={{ title: 'Overview' }}
            >
              {() => <OverviewTab template={template} onEdit={onEdit} />}
            </Tab.Screen>
            <Tab.Screen
              name="history"
              options={{ title: 'History' }}
            >
              {() => <HistoryTab template={template} />}
            </Tab.Screen>
            <Tab.Screen
              name="settings"
              options={{ title: 'Settings' }}
            >
              {() => <SettingsTab template={template} />}
            </Tab.Screen>
          </Tab.Navigator>
        </View>
      </SheetContent>
    </Sheet>
  );
}