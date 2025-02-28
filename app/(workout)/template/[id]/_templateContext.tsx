// app/(workout)/template/[id]/templateContext.tsx
import React from 'react';
import { WorkoutTemplate } from '@/types/templates';

// Create a context to share the template with the tab screens
interface TemplateContextType {
  template: WorkoutTemplate | null;
}

export const TemplateContext = React.createContext<TemplateContextType>({
  template: null
});

// Custom hook to access the template
export function useTemplate() {
  const context = React.useContext(TemplateContext);
  if (!context.template) {
    throw new Error('useTemplate must be used within a TemplateContext.Provider');
  }
  return context.template;
}
// Add a default export to satisfy Expo Router
// The _ prefix in the filename would also work to exclude it from routing
export default function TemplateContextProvider() {
  // This component won't actually be used
  return null;
}