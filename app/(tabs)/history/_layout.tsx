// app/(tabs)/history/_layout.tsx
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import HistoryScreen from '@/app/(tabs)/history/workoutHistory';
import CalendarScreen from '@/app/(tabs)/history/calendar';
import Header from '@/components/Header';
import { useTheme } from '@react-navigation/native';
import type { CustomTheme } from '@/lib/theme';
import { TabScreen } from '@/components/layout/TabScreen';

const Tab = createMaterialTopTabNavigator();

export default function HistoryLayout() {
  const theme = useTheme() as CustomTheme;

  return (
    <TabScreen>
      <Header useLogo={true} showNotifications={true} />

      <Tab.Navigator
        initialRouteName="history"
        screenOptions={{
          tabBarActiveTintColor: theme.colors.tabIndicator,
          tabBarInactiveTintColor: theme.colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'none', // Match the social tab (was 'capitalize')
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
          name="history"
          component={HistoryScreen}
          options={{ title: 'History' }}
        />
        <Tab.Screen
          name="calendar"
          component={CalendarScreen}
          options={{ title: 'Calendar' }}
        />
      </Tab.Navigator>
    </TabScreen>
  );
}