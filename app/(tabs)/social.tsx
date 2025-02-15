// app/(tabs)/social.tsx
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react-native';
import Header from '@/components/Header';
import { TabScreen } from '@/components/layout/TabScreen';

export default function SocialScreen() {
  return (
    <TabScreen>
      <Header 
        title="Social" 
        rightElement={
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => console.log('Open notifications')}
          >
            <View className="relative">
              <Bell className="text-foreground" />
              <View className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </View>
          </Button>
        }
      />
      <View className="flex-1 items-center justify-center">
        <Text>Social Screen</Text>
      </View>
    </TabScreen>
  );
}