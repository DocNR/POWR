// lib/contexts/SettingsDrawerContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsDrawerContextType {
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const SettingsDrawerContext = createContext<SettingsDrawerContextType | undefined>(undefined);

export function SettingsDrawerProvider({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(prev => !prev);

  return (
    <SettingsDrawerContext.Provider value={{ isDrawerOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
    </SettingsDrawerContext.Provider>
  );
}

export function useSettingsDrawer(): SettingsDrawerContextType {
  const context = useContext(SettingsDrawerContext);
  if (context === undefined) {
    throw new Error('useSettingsDrawer must be used within a SettingsDrawerProvider');
  }
  return context;
}