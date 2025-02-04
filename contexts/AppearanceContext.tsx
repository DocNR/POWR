// contexts/AppearanceContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import type { ColorScheme, ThemeName, ThemeColors } from '@/types/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppearanceContextType {
  colorScheme: ColorScheme;
  theme: ThemeName;
  useSystemTheme: boolean;
  systemColorScheme: ColorScheme;
  colors: ThemeColors;
  setColorScheme: (scheme: ColorScheme) => void;
  setTheme: (theme: ThemeName) => void;
  setUseSystemTheme: (use: boolean) => void;
}

const APPEARANCE_STORAGE_KEY = '@appearance';

interface StoredAppearance {
  theme: ThemeName;
  colorScheme: ColorScheme;
  useSystemTheme: boolean;
}

const defaultAppearance: StoredAppearance = {
  theme: 'default',
  colorScheme: 'light',
  useSystemTheme: true,
};

const AppearanceContext = createContext<AppearanceContextType | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme() as ColorScheme || 'light';
  const [appearance, setAppearance] = useState<StoredAppearance>(defaultAppearance);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved appearance settings
  useEffect(() => {
    async function loadAppearance() {
      try {
        const stored = await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (stored) {
          setAppearance(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading appearance settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAppearance();
  }, []);

  // Save appearance settings when they change
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    }
  }, [appearance, isLoading]);

  // Update color scheme when system theme changes
  useEffect(() => {
    if (appearance.useSystemTheme && systemColorScheme) {
      setAppearance(prev => ({
        ...prev,
        colorScheme: systemColorScheme,
      }));
    }
  }, [appearance.useSystemTheme, systemColorScheme]);

  const setColorScheme = (scheme: ColorScheme) => {
    setAppearance(prev => ({
      ...prev,
      colorScheme: scheme,
      useSystemTheme: false,
    }));
  };

  const setTheme = (theme: ThemeName) => {
    setAppearance(prev => ({
      ...prev,
      theme,
    }));
  };

  const setUseSystemTheme = (use: boolean) => {
    setAppearance(prev => ({
      ...prev,
      useSystemTheme: use,
      colorScheme: use ? systemColorScheme : prev.colorScheme,
    }));
  };

  const value = {
    colorScheme: appearance.colorScheme,
    theme: appearance.theme,
    useSystemTheme: appearance.useSystemTheme,
    systemColorScheme,
    colors: Colors[appearance.colorScheme],
    setColorScheme,
    setTheme,
    setUseSystemTheme,
  };

  if (isLoading) {
    // You might want to show a loading indicator here
    return null;
  }

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }
  return context;
}

// Utility hook for components that only need colors
export function useColors() {
  const { colors } = useAppearance();
  return colors;
}