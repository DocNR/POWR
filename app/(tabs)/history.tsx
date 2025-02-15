// app/(tabs)/history.tsx
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { TabScreen } from '@/components/layout/TabScreen';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react-native';

export default function HistoryScreen() {
  return (
    <TabScreen>
      <Header 
        title="History"
        rightElement={
          <Button 
            variant="ghost" 
            size="icon"
            onPress={() => console.log('Open filters')}
          >
            <Filter className="text-foreground" />
          </Button>
        }
      />
      <View className="flex-1 items-center justify-center">
        <Text>History Screen</Text>
      </View>
    </TabScreen>
  );
}