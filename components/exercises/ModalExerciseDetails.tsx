// components/exercises/ModalExerciseDetails.tsx
import React from 'react';
import { View, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {  
  Dumbbell, 
  Target, 
  Calendar, 
  Hash,
  AlertCircle,
  LineChart,
  Settings,
  X
} from 'lucide-react-native';
import { ExerciseDisplay } from '@/types/exercise';
import { useTheme } from '@react-navigation/native';
import { useColorScheme } from '@/lib/theme/useColorScheme';
import type { CustomTheme } from '@/lib/theme';

const Tab = createMaterialTopTabNavigator();

interface ModalExerciseDetailsProps {
  exercise: ExerciseDisplay | null;
  open: boolean;
  onClose: () => void;
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
            style={{ backgroundColor: 'hsl(261, 90%, 66%)' }}
          >
            <Text className="text-white font-semibold">
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
  // Mock data for the progress chart
  const weightData = [
    { date: 'Jan 10', weight: 135 },
    { date: 'Jan 17', weight: 140 },
    { date: 'Jan 24', weight: 145 },
    { date: 'Jan 31', weight: 150 },
    { date: 'Feb 7', weight: 155 },
    { date: 'Feb 14', weight: 155 },
    { date: 'Feb 21', weight: 160 },
    { date: 'Feb 28', weight: 165 },
  ];

  const volumeData = [
    { date: 'Jan 10', volume: 1350 },
    { date: 'Jan 17', volume: 1400 },
    { date: 'Jan 24', volume: 1450 },
    { date: 'Jan 31', volume: 1500 },
    { date: 'Feb 7', volume: 1550 },
    { date: 'Feb 14', volume: 1550 },
    { date: 'Feb 21', volume: 1600 },
    { date: 'Feb 28', volume: 1650 },
  ];

  return (
    <ScrollView 
      className="flex-1 px-4"
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <View className="gap-6 py-4">
        {/* Progress Chart */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-2">Weight Progress</Text>
          <View className="h-56 bg-card rounded-lg p-4 overflow-hidden">
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-muted-foreground">Max: 165 kg</Text>
              <Text className="text-sm text-muted-foreground">Last 8 weeks</Text>
            </View>
            
            {/* Chart Container */}
            <View className="flex-1 mt-2">
              {/* Y-axis labels */}
              <View className="absolute left-0 h-full justify-between py-2">
                <Text className="text-xs text-muted-foreground">165kg</Text>
                <Text className="text-xs text-muted-foreground">150kg</Text>
                <Text className="text-xs text-muted-foreground">135kg</Text>
              </View>
              
              {/* Chart visualization */}
              <View className="flex-1 ml-8 flex-row items-end justify-between">
                {weightData.map((item, index) => (
                  <View key={index} className="items-center">
                    <View 
                      className="bg-primary w-5 rounded-t-sm" 
                      style={{ 
                        height: ((item.weight - 130) / (170 - 130)) * 120,
                        opacity: 0.7 + ((item.weight - 135) / (165 - 135)) * 0.3
                      }}
                    />
                    <Text className="text-xs text-muted-foreground rotate-45 mt-2 origin-left">
                      {item.date.split(' ')[1]}
                    </Text>
                  </View>
                ))}
              </View>
              
              {/* Grid lines */}
              <View className="absolute left-8 right-0 top-0 bottom-0">
                <View className="border-t border-border absolute top-0 left-0 right-0" />
                <View className="border-t border-border absolute top-1/3 left-0 right-0" />
                <View className="border-t border-border absolute top-2/3 left-0 right-0" />
                <View className="border-t border-border absolute bottom-0 left-0 right-0" />
              </View>
            </View>
          </View>
        </View>

        {/* Volume Chart */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-2">Volume Progress</Text>
          <View className="h-56 bg-card rounded-lg p-4 overflow-hidden">
            {/* Chart Content */}
            <View className="flex-row justify-between mb-2">
              <Text className="text-sm text-muted-foreground">Total: 10,500 kg</Text>
              <Text className="text-sm text-muted-foreground">Last 8 weeks</Text>
            </View>
            
            {/* Line chart for volume */}
            <View className="flex-1 mt-2">
              {/* Y-axis labels */}
              <View className="absolute left-0 h-full justify-between py-2">
                <Text className="text-xs text-muted-foreground">1650</Text>
                <Text className="text-xs text-muted-foreground">1500</Text>
                <Text className="text-xs text-muted-foreground">1350</Text>
              </View>
              
              {/* Line chart */}
              <View className="flex-1 ml-8 relative">
                {/* Draw the line */}
                <View className="absolute left-0 right-0 top-0 bottom-0">
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '70%', 
                      left: '0%', 
                      width: '12%',
                      transform: [{ rotate: '-15deg' }] 
                    }} 
                  />
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '65%', 
                      left: '12%', 
                      width: '12%',
                      transform: [{ rotate: '-10deg' }] 
                    }} 
                  />
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '60%', 
                      left: '24%', 
                      width: '12%',
                      transform: [{ rotate: '-5deg' }] 
                    }} 
                  />
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '58%', 
                      left: '36%', 
                      width: '12%',
                      transform: [{ rotate: '0deg' }] 
                    }} 
                  />
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '55%', 
                      left: '48%', 
                      width: '12%',
                      transform: [{ rotate: '-5deg' }] 
                    }} 
                  />
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '52%', 
                      left: '60%', 
                      width: '12%',
                      transform: [{ rotate: '-5deg' }] 
                    }} 
                  />
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '47%', 
                      left: '72%', 
                      width: '12%',
                      transform: [{ rotate: '-10deg' }] 
                    }} 
                  />
                  <View 
                    className="absolute bg-green-500 h-1 rounded-full" 
                    style={{ 
                      top: '40%', 
                      left: '84%', 
                      width: '12%',
                      transform: [{ rotate: '-15deg' }] 
                    }} 
                  />

                  {/* Data points */}
                  {volumeData.map((item, index) => (
                    <View 
                      key={index}
                      className="absolute h-3 w-3 rounded-full bg-white border-2 border-green-500" 
                      style={{ 
                        left: `${index * 12.5 + 6}%`,
                        top: `${70 - ((item.volume - 1350) / 300) * 30}%` 
                      }} 
                    />
                  ))}
                </View>

                {/* X-axis labels */}
                <View className="absolute bottom-0 left-0 right-0 flex-row justify-between">
                  {volumeData.map((item, index) => (
                    <Text key={index} className="text-xs text-muted-foreground">
                      {item.date.split(' ')[1]}
                    </Text>
                  ))}
                </View>
              </View>
              
              {/* Grid lines */}
              <View className="absolute left-8 right-0 top-0 bottom-0">
                <View className="border-t border-border absolute top-0 left-0 right-0" />
                <View className="border-t border-border absolute top-1/3 left-0 right-0" />
                <View className="border-t border-border absolute top-2/3 left-0 right-0" />
                <View className="border-t border-border absolute bottom-0 left-0 right-0" />
              </View>
            </View>
          </View>
        </View>

        {/* Personal Records Section */}
        <View>
          <Text className="text-base font-semibold text-foreground mb-4">Personal Records</Text>
          <View className="gap-4">
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground">Max Weight</Text>
              <Text className="text-lg font-semibold text-foreground">165 kg</Text>
              <Text className="text-xs text-muted-foreground mt-1">Achieved on Feb 28, 2025</Text>
            </View>
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground">Max Reps</Text>
              <Text className="text-lg font-semibold text-foreground">12 reps at 135 kg</Text>
              <Text className="text-xs text-muted-foreground mt-1">Achieved on Jan 10, 2025</Text>
            </View>
            <View className="bg-card p-4 rounded-lg">
              <Text className="text-sm text-muted-foreground">Best Volume</Text>
              <Text className="text-lg font-semibold text-foreground">1650 kg</Text>
              <Text className="text-xs text-muted-foreground mt-1">Achieved on Feb 28, 2025</Text>
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

export function ModalExerciseDetails({ 
  exercise, 
  open,
  onClose,
  onEdit 
}: ModalExerciseDetailsProps) {
  const theme = useTheme() as CustomTheme;
  const { isDarkColorScheme } = useColorScheme();

  // Return null if not open or if exercise is null
  if (!open || !exercise) return null;

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
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-border">
            <Text className="text-xl font-bold text-foreground">{exercise.title}</Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <X size={24} />
            </TouchableOpacity>
          </View>
          
          {/* Tab Navigator */}
          <View style={{ flex: 1 }}>
            {/* Using NavigationContainer without the independent prop */}
            {/* Let's use a more compatible approach without NavigationContainer */}
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
                <Tab.Screen name="Info">
                  {() => <InfoTab exercise={exercise} onEdit={onEdit} />}
                </Tab.Screen>
                <Tab.Screen name="Progress">
                  {() => <ProgressTab exercise={exercise} />}
                </Tab.Screen>
                <Tab.Screen name="Form">
                  {() => <FormTab exercise={exercise} />}
                </Tab.Screen>
                <Tab.Screen name="Settings">
                  {() => <SettingsTab exercise={exercise} />}
                </Tab.Screen>
              </Tab.Navigator>
          </View>
        </View>
      </View>
    </Modal>
  );
}