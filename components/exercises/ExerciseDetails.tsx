// components/exercises/ExerciseDetails.tsx
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
  AlertCircle,
  LineChart,
  Settings
} from 'lucide-react-native';
import { ExerciseDisplay } from '@/types/exercise';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';

const Tab = createMaterialTopTabNavigator();

interface ExerciseDetailsProps {
  exercise: ExerciseDisplay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

// Info Tab Component
function InfoTab({ exercise, onEdit }: { exercise: ExerciseDisplay; onEdit?: () => void }) {
  const { 
    title,
    type,
    category,
    equipment,
    description,
    instructions = [],
    tags = [],
    source = 'local',
    usageCount,
    lastUsed
  } = exercise;

  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Basic Info Section */}
        <View className="flex-row items-center gap-2">
          <Badge 
            variant={source === 'local' ? 'outline' : 'secondary'}
            className="capitalize"
          >
            <Text>{source}</Text>
          </Badge>
          <Badge 
            variant="outline" 
            className="capitalize bg-muted"
          >
            <Text>{type}</Text>
          </Badge>
        </View>

        <Separator className="bg-border" />

        {/* Category & Equipment Section */}
        <View className="space-y-4">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 items-center justify-center rounded-md bg-muted">
              <Target size={18} className="text-muted-foreground" />
            </View>
            <View>
              <Text className="text-sm text-muted-foreground">Category</Text>
              <Text className="text-base font-medium text-foreground">{category}</Text>
            </View>
          </View>

          {equipment && (
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 items-center justify-center rounded-md bg-muted">
                <Dumbbell size={18} className="text-muted-foreground" />
              </View>
              <View>
                <Text className="text-sm text-muted-foreground">Equipment</Text>
                <Text className="text-base font-medium text-foreground capitalize">{equipment}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description Section */}
        {description && (
          <View>
            <Text className="text-base font-semibold text-foreground mb-2">Description</Text>
            <Text className="text-base text-muted-foreground leading-relaxed">{description}</Text>
          </View>
        )}

        {/* Tags Section */}
        {tags.length > 0 && (
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Hash size={16} className="text-muted-foreground" />
              <Text className="text-base font-semibold text-foreground">Tags</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  <Text>{tag}</Text>
                </Badge>
              ))}
            </View>
          </View>
        )}

        {/* Usage Stats Section */}
        {(usageCount || lastUsed) && (
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Calendar size={16} className="text-muted-foreground" />
              <Text className="text-base font-semibold text-foreground">Usage</Text>
            </View>
            <View className="gap-2">
              {usageCount && (
                <Text className="text-base text-muted-foreground">
                  Used {usageCount} times
                </Text>
              )}
              {lastUsed && (
                <Text className="text-base text-muted-foreground">
                  Last used: {lastUsed.toLocaleDateString()}
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
              Edit Exercise
            </Text>
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

// Progress Tab Component
function ProgressTab({ exercise }: { exercise: ExerciseDisplay }) {
  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Placeholder for Charts */}
        <View className="h-48 bg-muted rounded-lg items-center justify-center">
          <LineChart size={24} className="text-muted-foreground mb-2" />
          <Text className="text-muted-foreground">Progress charts coming soon</Text>
        </View>

        {/* Personal Records Section */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Personal Records</Text>
          <View className="gap-4">
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground">Max Weight</Text>
              <Text className="text-lg font-semibold text-foreground">-- kg</Text>
            </View>
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground">Max Reps</Text>
              <Text className="text-lg font-semibold text-foreground">--</Text>
            </View>
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground">Best Volume</Text>
              <Text className="text-lg font-semibold text-foreground">-- kg</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Form Tab Component
function FormTab({ exercise }: { exercise: ExerciseDisplay }) {
  const { instructions = [] } = exercise;
  
  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Instructions Section */}
        {instructions.length > 0 ? (
          <View>
            <Text className="text-base font-semibold text-foreground mb-4">Instructions</Text>
            <View className="gap-4">
              {instructions.map((instruction: string, index: number) => (
                <View key={index} className="flex-row gap-3">
                  <Text className="text-sm font-medium text-muted-foreground min-w-[24px]">
                    {index + 1}.
                  </Text>
                  <Text className="text-base text-foreground flex-1">{instruction}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="items-center justify-center py-8">
            <AlertCircle size={24} className="text-muted-foreground mb-2" />
            <Text className="text-muted-foreground">No form instructions available</Text>
          </View>
        )}

        {/* Placeholder for Media */}
        <View className="h-48 bg-muted rounded-lg items-center justify-center">
          <Text className="text-muted-foreground">Video demos coming soon</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Settings Tab Component
function SettingsTab({ exercise }: { exercise: ExerciseDisplay }) {
  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Format Settings */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Exercise Settings</Text>
          <View className="gap-4">
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground mb-1">Format</Text>
              <View className="flex-row flex-wrap gap-2">
                {exercise.format && Object.entries(exercise.format).map(([key, enabled]) => (
                  enabled && (
                    <Badge key={key} variant="secondary">
                      <Text>{key}</Text>
                    </Badge>
                  )
                ))}
              </View>
            </View>
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground mb-1">Units</Text>
              <View className="flex-row flex-wrap gap-2">
                {exercise.format_units && Object.entries(exercise.format_units).map(([key, unit]) => (
                  <Badge key={key} variant="secondary">
                    <Text>{key}: {String(unit)}</Text>
                  </Badge>
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

export function ExerciseDetails({ 
  exercise, 
  open,
  onOpenChange,
  onEdit 
}: ExerciseDetailsProps) {
  const theme = useTheme() as CustomTheme;

  return (
    <Sheet isOpen={open} onClose={() => onOpenChange(false)}>
      <SheetHeader>
        <SheetTitle>
          <Text className="text-xl font-bold text-foreground">{exercise.title}</Text>
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
              name="info"
              options={{ title: 'Info' }}
            >
              {() => <InfoTab exercise={exercise} onEdit={onEdit} />}
            </Tab.Screen>
            <Tab.Screen
              name="progress"
              options={{ title: 'Progress' }}
            >
              {() => <ProgressTab exercise={exercise} />}
            </Tab.Screen>
            <Tab.Screen
              name="form"
              options={{ title: 'Form' }}
            >
              {() => <FormTab exercise={exercise} />}
            </Tab.Screen>
            <Tab.Screen
              name="settings"
              options={{ title: 'Settings' }}
            >
              {() => <SettingsTab exercise={exercise} />}
            </Tab.Screen>
          </Tab.Navigator>
        </View>
      </SheetContent>
    </Sheet>
  );
}