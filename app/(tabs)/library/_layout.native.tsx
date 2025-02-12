// app/(tabs)/library/_layout.native.tsx
import { View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchPopover } from '@/components/library/SearchPopover';
import { FilterPopover } from '@/components/library/FilterPopover';
import { FilterSheet, type FilterOptions, type SourceType } from '@/components/library/FilterSheet';
import ExercisesScreen from './exercises';
import TemplatesScreen from './templates';
import ProgramsScreen from './programs';
import Header from '@/components/Header';
import { useState } from 'react';
import { useTheme } from '@react-navigation/native';
import { convertHSLValues } from '@/lib/theme';

const Tab = createMaterialTopTabNavigator();

// Default available filters
const availableFilters = {
  equipment: ['Barbell', 'Dumbbell', 'Bodyweight', 'Machine', 'Cables', 'Other'],
  tags: ['Strength', 'Cardio', 'Mobility', 'Recovery'],
  source: ['local', 'powr', 'nostr'] as SourceType[] // Fixed: Create mutable array of SourceType
};

// Initial filter state
const initialFilters: FilterOptions = {
  equipment: [],
  tags: [],
  source: []
};

export default function LibraryLayout() {
  const { colors, dark } = useTheme();
  const { purple, mutedForeground } = convertHSLValues(dark ? 'dark' : 'light');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(0);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>(initialFilters);

  const handleApplyFilters = (filters: FilterOptions) => {
    setCurrentFilters(filters);
    // Count total active filters
    const totalFilters = Object.values(filters).reduce(
      (acc, curr) => acc + curr.length, 
      0
    );
    setActiveFilters(totalFilters);
  };

  return (
    <View className="flex-1">
      <Header 
        title="Library"
        rightElement={
          <View className="flex-row items-center gap-2">
            <SearchPopover 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <FilterPopover 
              activeFilters={activeFilters}
              onOpenFilters={() => setFilterSheetOpen(true)}
            />
            <ThemeToggle />
          </View>
        }
      >
        <Text className="text-muted-foreground text-sm mt-1">
          12 exercises • 5 templates
        </Text>
      </Header>

      <FilterSheet 
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        options={currentFilters}
        onApplyFilters={handleApplyFilters}
        availableFilters={availableFilters}
      />

      <Tab.Navigator
        initialRouteName="templates"
        screenOptions={{
          tabBarActiveTintColor: purple,
          tabBarInactiveTintColor: mutedForeground,
          tabBarLabelStyle: {
            fontSize: 14,
            textTransform: 'capitalize',
            fontWeight: 'bold',
          },
          tabBarIndicatorStyle: {
            backgroundColor: purple,
            height: 2,
          },
          tabBarStyle: { 
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          tabBarPressColor: colors.primary,
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