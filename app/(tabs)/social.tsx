// app/(tabs)/index.tsx (and similar for other tab screens)
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Home Screen</Text>
    </View>
  );
}