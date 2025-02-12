// app/(tabs)/profile.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Settings } from 'lucide-react-native';
import { H1 } from '@/components/ui/typography';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import Header from '@/components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLACEHOLDER_IMAGE = 'https://github.com/shadcn.png';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View className="flex-1">
      <Header 
        title="Profile" 
        rightElement={
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => {
              console.log('Open settings');
            }}
          >
            <Settings className="text-foreground" />
          </Button>
        }
      />
      
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20
        }}
      >
        {/* Profile Header Section */}
        <View className="items-center pt-6 pb-8">
          <Avatar className="w-24 h-24 mb-4" alt="Profile picture">
            <AvatarImage source={{ uri: PLACEHOLDER_IMAGE }} />
            <AvatarFallback>
              <Text className="text-2xl">JD</Text>
            </AvatarFallback>
          </Avatar>
          <H1 className="text-xl font-semibold mb-1">John Doe</H1>
          <Text className="text-muted-foreground">@johndoe</Text>
        </View>

        {/* Stats Section */}
        <View className="flex-row justify-around px-4 py-6 bg-card">
          <View className="items-center">
            <Text className="text-2xl font-bold">24</Text>
            <Text className="text-muted-foreground">Workouts</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold">12</Text>
            <Text className="text-muted-foreground">Templates</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold">3</Text>
            <Text className="text-muted-foreground">Programs</Text>
          </View>
        </View>

        {/* Profile Actions */}
        <View className="p-4 gap-2">
          <Button 
            variant="outline" 
            className="mb-2"
            onPress={() => {
              console.log('Edit profile');
            }}
          >
            <Text>Edit Profile</Text>
          </Button>

          <Button 
            variant="outline"
            className="mb-2"
            onPress={() => {
              console.log('Account settings');
            }}
          >
            <Text>Account Settings</Text>
          </Button>

          <Button 
            variant="outline"
            className="mb-2"
            onPress={() => {
              console.log('Preferences');
            }}
          >
            <Text>Preferences</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}