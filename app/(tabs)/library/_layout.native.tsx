// app/(tabs)/library/_layout.native.tsx
import { View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ThemeToggle';
import ExercisesScreen from './exercises';
import TemplatesScreen from './templates';
import ProgramsScreen from './programs';
import { CUSTOM_COLORS } from '@/lib/constants';

const Tab = createMaterialTopTabNavigator();

export default function LibraryLayout() {
  const { colors } = useTheme();

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 pt-14 pb-4 bg-card">
        <Text className="text-2xl font-bold">Library</Text>
        <ThemeToggle />
      </View>

      <Tab.Navigator
        initialRouteName="templates"
        screenOptions={{
          tabBarActiveTintColor: CUSTOM_COLORS.purple,
          tabBarInactiveTintColor: colors.text,
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'capitalize',
            fontWeight: 'bold',
          },
          tabBarIndicatorStyle: {
            backgroundColor: CUSTOM_COLORS.purple,
          },
          tabBarStyle: { backgroundColor: colors.card }
        }}
      >
        <Tab.Screen
          name="exercises"
          component={ExercisesScreen}
          options={{ title: 'Exercises' }}
        />
        <Tab.Screen
          name="templates"
          component={TemplatesScreen}
          options={{ title: 'Templates' }}
        />
        <Tab.Screen
          name="programs"
          component={ProgramsScreen}
          options={{ title: 'Programs' }}
        />
      </Tab.Navigator>
    </View>
  );
}