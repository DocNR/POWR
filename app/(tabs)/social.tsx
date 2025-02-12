// app/(tabs)/index.tsx (and similar for other tab screens)
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react-native';
import Header from '@/components/Header';

export default function SocialScreen() {
  return (
    <View className="flex-1">
      <Header 
        title="Social" 
        rightElement={
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => {
              // TODO: Open notifications
              console.log('Open notifications');
            }}
          >
            {/* Add a notification badge if needed */}
            <View className="relative">
              <Bell className="text-foreground" />
              <View className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </View>
          </Button>
        }
      />
    </View>
  );
}
