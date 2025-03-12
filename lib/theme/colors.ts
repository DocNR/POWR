// lib/theme/colors.ts
export const COLORS = {
    // Primary brand colors
    purple: {
      DEFAULT: 'hsl(261, 90%, 66%)',
      pressed: 'hsl(262, 84%, 58%)',
      light: 'hsl(261, 90%, 85%)',
      dark: 'hsl(261, 90%, 45%)',
    },
    
    // Semantic colors
    success: 'hsl(142, 71%, 45%)',
    warning: 'hsl(38, 92%, 50%)',
    destructive: 'hsl(0, 84.2%, 60.2%)',
    
    // Light mode
    light: {
      background: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(240, 10%, 3.9%)',
      card: 'hsl(0, 0%, 100%)',
      cardForeground: 'hsl(240, 10%, 3.9%)',
      border: 'hsl(240, 5.9%, 90%)',
      input: 'hsl(240, 5.9%, 90%)',
      muted: 'hsl(240, 4.8%, 95.9%)',
      mutedForeground: 'hsl(240, 3.8%, 46.1%)',
    },
    
    // Dark mode
    dark: {
      background: 'hsl(240, 10%, 3.9%)',
      foreground: 'hsl(0, 0%, 98%)',
      card: 'hsl(240, 10%, 5.9%)',
      cardForeground: 'hsl(0, 0%, 98%)',
      border: 'hsl(240, 3.7%, 25%)',
      input: 'hsl(240, 3.7%, 25%)',
      muted: 'hsl(240, 3.7%, 18%)',
      mutedForeground: 'hsl(240, 5%, 64.9%)',
    },
  };
  
  // Fixed color values to use when className doesn't work (especially for icons on Android)
  export const FIXED_COLORS = {
    // Primary colors
    primary: COLORS.purple.DEFAULT,
    primaryDark: COLORS.purple.dark, 
    
    // Text colors
    text: {
      light: COLORS.light.foreground,
      dark: COLORS.dark.foreground,
    },
    
    // Semantic colors
    destructive: 'hsl(0, 84.2%, 60.2%)',
    success: 'hsl(142, 71%, 45%)',
    warning: 'hsl(38, 92%, 50%)',
    
    // Muted colors
    muted: {
      light: COLORS.light.mutedForeground,
      dark: COLORS.dark.mutedForeground,
    }
  };