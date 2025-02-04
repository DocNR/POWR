// components/TabLayout.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppearance } from '@/contexts/AppearanceContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './ThemedText';

interface TabLayoutProps {
  children: React.ReactNode;
  title?: string;
  rightElement?: React.ReactNode;
}

export default function TabLayout({ children, title, rightElement }: TabLayoutProps) {
  const { colors } = useAppearance();
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.background,
          paddingTop: insets.top 
        }
      ]}
    >
      {title && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.titleContainer}>
            <ThemedText type="title">{title}</ThemedText>
          </View>
          {rightElement && (
            <View style={styles.rightElement}>
              {rightElement}
            </View>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flex: 1,
  },
  rightElement: {
    marginLeft: 16,
  },
});