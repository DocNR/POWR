// app/(tabs)/library/_layout.web.tsx
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { ThemeToggle } from '@/components/ThemeToggle';
import Pager from '@/components/pager';
import { CUSTOM_COLORS } from '@/lib/constants';
import type { PagerRef } from '@/components/pager/types';
import ExercisesScreen from './exercises';
import TemplatesScreen from './templates';
import ProgramsScreen from './programs';

const tabs = [
  { key: 'exercises', title: 'Exercises', component: ExercisesScreen },
  { key: 'templates', title: 'Templates', component: TemplatesScreen },
  { key: 'programs', title: 'Programs', component: ProgramsScreen },
];

export default function LibraryLayout() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const pagerRef = React.useRef<PagerRef>(null);

  const handleTabPress = (index: number) => {
    setActiveIndex(index);
    pagerRef.current?.setPage(index);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 pt-14 pb-4 bg-card">
        <Text className="text-2xl font-bold">Library</Text>
        <ThemeToggle />
      </View>

      {/* Tab Headers */}
      <View className="flex-row bg-card border-b border-border">
        {tabs.map((tab, index) => (
          <View key={tab.key} className="flex-1">
            <Pressable
              onPress={() => handleTabPress(index)}
              className="px-4 py-3 items-center"
            >
              <Text
                className={activeIndex === index 
                  ? 'font-semibold text-primary'
                  : 'font-semibold text-muted-foreground'}
                style={activeIndex === index ? { color: CUSTOM_COLORS.purple } : undefined}
              >
                {tab.title}
              </Text>
            </Pressable>
            {activeIndex === index && (
              <View 
                className="h-0.5" 
                style={{ backgroundColor: CUSTOM_COLORS.purple }} 
              />
            )}
          </View>
        ))}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Pager
          ref={pagerRef}
          initialPage={0}
          onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
          style={{ flex: 1 }}
        >
          {tabs.map((tab) => (
            <View key={tab.key} style={{ flex: 1 }}>
              <tab.component />
            </View>
          ))}
        </Pager>
      </View>
    </View>
  );
}