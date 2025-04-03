> **ARCHIVED DOCUMENT**: This document is outdated and kept for historical reference only. Please refer to [POWR App Styling Guide](../technical/styling/styling_guide.md) for up-to-date information.

# POWR App Styling Guide

This document outlines how to consistently style components in the POWR fitness app.

## Color System

All colors are defined in the theme system and should be accessed through it rather than hardcoded values.

### Import Path

```typescript
import { useIconColor } from '@/lib/theme/iconUtils';
import { FIXED_COLORS } from '@/lib/theme/colors';
Icon Styling
Icons must use the icon utility to ensure visibility on both iOS and Android:
typescriptCopy// Import icon utility
import { useIconColor } from '@/lib/theme/iconUtils';

// Inside your component
const { getIconProps, getIconColor } = useIconColor();

// Apply to icons
<Icon 
  size={24} 
  {...getIconProps('primary')}  // Use appropriate variant
/>
Icon Variants

primary - For main actions and interactive elements (purple)
muted - For secondary or less important actions (gray)
destructive - For delete/remove actions (red)
success - For confirmation/complete actions (green)
warning - For caution indicators (yellow/orange)

Examples
tsxCopy// Primary action icon
<Play {...getIconProps('primary')} size={20} />

// Destructive action icon
<Trash2 {...getIconProps('destructive')} size={20} />

// Icon with custom fill
<Star 
  {...getIconProps(isFavorite ? 'primary' : 'muted')}
  fill={isFavorite ? getIconColor('primary') : "none"}
  size={20} 
/>
Button Styling
Use the standard button component with appropriate variants:
tsxCopy// Primary button
<Button variant="default" className="w-full">
  <Text className="text-primary-foreground">Primary Action</Text>
</Button>

// Destructive button
<Button variant="destructive" className="w-full">
  <Text className="text-destructive-foreground">Delete</Text>
</Button>

// Outline button
<Button variant="outline" className="w-full">
  <Text>Secondary Action</Text>
</Button>
Header Component
Use the Header component consistently:
tsxCopy// Standard header with title
<Header title="Screen Title" showNotifications={true} />

// Header with logo
<Header useLogo={true} showNotifications={true} />

// Header with custom right element
<Header 
  title="Screen Title" 
  rightElement={<YourCustomElement />} 
/>
Text Styling
Use the Text component with appropriate Tailwind classes:
tsxCopy// Headings
<Text className="text-xl font-semibold text-foreground">Heading</Text>

// Body text
<Text className="text-base text-foreground">Regular text</Text>

// Secondary text
<Text className="text-sm text-muted-foreground">Secondary text</Text>
Card Components
Use the Card component for content blocks:
tsxCopy<Card className="mx-4">
  <CardContent className="p-4">
    {/* Card content */}
  </CardContent>
</Card>
Dialog/Alert Styling
Center buttons in dialogs:
tsxCopy<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        <Text>Alert Title</Text>
      </AlertDialogTitle>
      <AlertDialogDescription>
        <Text>Alert description text.</Text>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <View className="flex-row justify-center gap-3">
      <AlertDialogCancel>
        <Text>Cancel</Text>
      </AlertDialogCancel>
      <AlertDialogAction className="bg-destructive">
        <Text className="text-destructive-foreground">Confirm</Text>
      </AlertDialogAction>
    </View>
  </AlertDialogContent>
</AlertDialog>
Best Practices

Never use hardcoded colors - Always use theme variables through Tailwind classes
Always use getIconProps for icons - Ensures visibility on both iOS and Android
Use semantic variants - Choose button and icon variants based on their purpose
Maintain consistent spacing - Use Tailwind spacing classes (p-4, m-2, etc.)
Check both platforms - Test UI changes on both iOS and Android

Troubleshooting
If icons aren't appearing on Android:

Ensure you're using getIconProps() instead of className for the icon
Add strokeWidth={2} for better visibility on Android
Check that the icon has a size specified

If colors seem inconsistent:

Verify you're using Tailwind classes (text-primary vs #8B5CF6)
Check that the correct variant is being used for your component
