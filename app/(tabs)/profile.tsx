// app/(tabs)/profile.tsx
import { View, ScrollView, ImageBackground } from 'react-native';
import { useState, useEffect } from 'react';
import { Settings, LogIn } from 'lucide-react-native';
import { H1 } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import Header from '@/components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabScreen } from '@/components/layout/TabScreen';
import UserAvatar from '@/components/UserAvatar';
import { useNDKCurrentUser } from '@/lib/hooks/useNDK';
import NostrLoginSheet from '@/components/sheets/NostrLoginSheet';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, isAuthenticated } = useNDKCurrentUser();
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | undefined>(undefined);
  const [aboutText, setAboutText] = useState<string | undefined>(undefined);
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);
  
  const displayName = isAuthenticated 
    ? (currentUser?.profile?.displayName || currentUser?.profile?.name || 'Nostr User') 
    : 'Guest User';
    
  const username = isAuthenticated 
    ? (currentUser?.profile?.nip05 || '@user') 
    : '@guest';
  
  // Reset profile data when authentication state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setProfileImageUrl(undefined);
      setBannerImageUrl(undefined);
      setAboutText(undefined);
    }
  }, [isAuthenticated]);
  
  // Extract profile data from Nostr profile
  useEffect(() => {
    if (currentUser?.profile) {
      console.log('Profile data:', currentUser.profile);
      
      // Extract image URL
      const imageUrl = currentUser.profile.image || 
                       currentUser.profile.picture || 
                       (currentUser.profile as any).avatar ||
                       undefined;
      setProfileImageUrl(imageUrl);
      
      // Extract banner URL
      const bannerUrl = currentUser.profile.banner ||
                        (currentUser.profile as any).background ||
                        undefined;
      setBannerImageUrl(bannerUrl);
      
      // Extract about text
      const about = currentUser.profile.about || 
                    (currentUser.profile as any).description ||
                    undefined;
      setAboutText(about);
    }
  }, [currentUser?.profile]);
  
  // Show different UI when not authenticated
  if (!isAuthenticated) {
    return (
      <TabScreen>
        <Header title="Profile" />
        <View className="flex-1 items-center justify-center p-6">
          <View className="items-center mb-8">
            <UserAvatar
              size="xl"
              fallback="G"
              className="mb-4"
              isInteractive={false}
            />
            <H1 className="text-xl font-semibold mb-1">Guest User</H1>
            <Text className="text-muted-foreground mb-6">Not logged in</Text>
            <Text className="text-center text-muted-foreground mb-8">
              Login with your Nostr private key to view and manage your profile.
            </Text>
            <Button 
              onPress={() => setIsLoginSheetOpen(true)}
              className="px-6"
            >
              <Text>Login with Nostr</Text>
            </Button>
          </View>
        </View>
        
        {/* NostrLoginSheet */}
        <NostrLoginSheet 
          open={isLoginSheetOpen} 
          onClose={() => setIsLoginSheetOpen(false)} 
        />
      </TabScreen>
    );
  }
  
  return (
    <TabScreen>
      <Header 
        title="Profile" 
        rightElement={
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => console.log('Open settings')}
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
        {/* Banner Image */}
        <View className="w-full h-40 relative">
          {bannerImageUrl ? (
            <ImageBackground 
              source={{ uri: bannerImageUrl }} 
              className="w-full h-full"
              resizeMode="cover"
            >
              <View className="absolute inset-0 bg-black/20" />
            </ImageBackground>
          ) : (
            <View className="w-full h-full bg-accent" />
          )}
        </View>
        
        {/* Profile Avatar and Name - positioned to overlap the banner */}
        <View className="items-center -mt-16 pb-6">
          <UserAvatar
            size="xl"
            uri={profileImageUrl}
            fallback={displayName.charAt(0)}
            className="mb-4 border-4 border-background"
            isInteractive={false}
          />
          <H1 className="text-xl font-semibold mb-1">{displayName}</H1>
          <Text className="text-muted-foreground mb-4">{username}</Text>
          
          {/* About section */}
          {aboutText && (
            <View className="px-6 py-2 w-full">
              <Text className="text-center text-foreground">{aboutText}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View className="flex-row justify-around px-4 py-6 bg-card mx-4 rounded-lg">
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

        <View className="p-4 gap-2">
          <Button variant="outline" className="mb-2">
            <Text>Edit Profile</Text>
          </Button>
          <Button variant="outline" className="mb-2">
            <Text>Account Settings</Text>
          </Button>
          <Button variant="outline" className="mb-2">
            <Text>Preferences</Text>
          </Button>
        </View>
      </ScrollView>
    </TabScreen>
  );
}