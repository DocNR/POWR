// app/(tabs)/index.tsx (Workout tab)
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { TabScreen } from '@/components/layout/TabScreen';
import Header from '@/components/Header';
import { Plus } from 'lucide-react-native';
import { Button } from '@/components/ui/button';

export default function WorkoutScreen() {
  return (
    <TabScreen>
      <Header 
        title="Workout"
        rightElement={
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => console.log('New workout')}
          >
            <Plus className="text-foreground" />
          </Button>
        }
      />
      <View className="flex-1 items-center justify-center">
        <Text>Workout Screen</Text>
      </View>
    </TabScreen>
  );
}