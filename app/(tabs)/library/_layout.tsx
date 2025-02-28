// app/(tabs)/library/_layout.tsx
import { View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import ExercisesScreen from './exercises';
import TemplatesScreen from './templates';
import ProgramsScreen from './programs';
import Header from '@/components/Header';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';
import { TabScreen } from '@/components/layout/TabScreen';

const Tab = createMaterialTopTabNavigator();

export default function LibraryLayout() {
  const theme = useTheme() as CustomTheme;

  return (
    <TabScreen>
      <Header useLogo={true} />

      <Tab.Navigator
        initialRouteName="templates"
        screenOptions={{
          tabBarActiveTintColor: theme.colors.tabIndicator,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'capitalize',
            fontWeight: 'bold',
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
    </TabScreen>
  );
}