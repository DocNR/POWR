# POWR App Styling Guide

**Last Updated:** 2025-04-01  
**Status:** Active  
**Related To:** Design System, Component Architecture, UI/UX, Cross-Platform Development

## Purpose

This document outlines the styling principles, component usage patterns, and theming implementation for the POWR fitness app. Following these guidelines ensures a consistent look and feel across the application, facilitates cross-platform compatibility, and enhances the overall user experience.

## Cross-Platform Approach

The POWR app is designed to run on both iOS and Android platforms, which present unique challenges for UI implementation. Our approach prioritizes:

1. **Platform Consistency**: Maintaining a consistent look and feel across platforms
2. **Platform Adaptation**: Respecting platform-specific UX patterns where appropriate
3. **Graceful Fallbacks**: Implementing fallbacks for features not available on all platforms
4. **Testing on Both Platforms**: All UI changes must be verified on both iOS and Android

## Theme System Architecture

The POWR app uses a flexible theme system built with React Native, Tailwind CSS, and shadcn/ui components. The theming infrastructure supports both light and dark modes, with dynamic color adjustments for different UI states.

### Theme File Organization

```
lib/theme/
  ├── index.ts       - Main theme export
  ├── colors.ts      - Color definitions
  ├── constants.ts   - Theme constants 
  ├── iconUtils.ts   - Icon styling utilities
  └── useColorScheme.tsx - Theme mode selection hook
```

### Theme Implementation Strategy

The application uses:
- Tailwind classes for general styling with `nativewind`
- Specialized hooks for cross-platform compatibility (`useIconColor`, etc.)
- `shadcn/ui` component library for consistent UI elements

## Color System

All colors should be accessed through the theme system rather than using hardcoded values. Never use direct color codes in components.

### Color Imports

```typescript
// Import theme utilities
import { useTheme } from '@/lib/theme';
import { useIconColor } from '@/lib/theme/iconUtils';
import { FIXED_COLORS } from '@/lib/theme/colors';
```

### Color Variants

The theme includes semantic color variants for different UI elements:

- `primary` - Brand color, used for main interactive elements (purple)
- `secondary` - Supporting UI elements 
- `muted` - Subdued elements, backgrounds, disabled states
- `accent` - Highlights and accents
- `destructive` - Error states, deletion actions (red)
- `success` - Confirmation, completion states (green)
- `warning` - Caution states (yellow/orange)

### Accessing Colors

Always access colors through Tailwind classes:

```jsx
// Good - uses theme system
<View className="bg-primary rounded-md p-4">
  <Text className="text-primary-foreground font-medium">
    Hello World
  </Text>
</View>

// Bad - hardcoded values that won't respond to theme changes
<View style={{ backgroundColor: '#8B5CF6', borderRadius: 8, padding: 16 }}>
  <Text style={{ color: '#FFFFFF', fontWeight: 500 }}>
    Hello World
  </Text>
</View>
```

## Icon Styling

Icons must use the icon utility functions to ensure visibility across platforms. Different platforms may require different stroke widths, colors, and other properties.

### Icon Usage

```typescript
import { useIconColor } from '@/lib/theme/iconUtils';
import { Play, Star, Trash2 } from 'lucide-react-native';

// Inside your functional component
function MyComponent() {
  const { getIconProps, getIconColor } = useIconColor();
  
  return (
    <View>
      {/* Primary action icon */}
      <Play {...getIconProps('primary')} size={20} />

      {/* Destructive action icon */}
      <Trash2 {...getIconProps('destructive')} size={20} />

      {/* Icon with conditional fill */}
      <Star 
        {...getIconProps(isFavorite ? 'primary' : 'muted')}
        fill={isFavorite ? getIconColor('primary') : "none"}
        size={20} 
      />
    </View>
  );
}
```

### Icon Variants

- `primary` - For main actions and interactive elements
- `muted` - For secondary or less important actions
- `destructive` - For delete/remove actions
- `success` - For confirmation/complete actions
- `warning` - For caution indicators

### Platform-Specific Icon Considerations

- **Android**: 
  - Icons often appear thinner and less visible on Android
  - Always use `strokeWidth={2}` or higher for better visibility on Android
  - Minimum recommended icon size is 24px for Android (vs. 20px for iOS)
  - Use the `getIconProps` function which handles these platform differences automatically

- **iOS**: 
  - Icons generally appear as expected with default stroke width
  - iOS has better support for gradients and complex icon styles

## Button Styling

Use the standard `Button` component with appropriate variants to maintain a consistent look and feel.

### Button Variants

```jsx
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

// Primary button
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

// Ghost button (minimal visual impact)
<Button variant="ghost" className="w-full">
  <Text>Subtle Action</Text>
</Button>

// Link button
<Button variant="link" className="w-full">
  <Text className="text-primary underline">Learn More</Text>
</Button>
```

### Button States

Buttons handle the following states automatically through the theme system:

- Default
- Hover/active (handled differently on mobile and web)
- Disabled
- Loading

```jsx
// Disabled button
<Button variant="default" disabled className="w-full">
  <Text className="text-primary-foreground">Unavailable</Text>
</Button>

// Loading button
<Button variant="default" isLoading className="w-full">
  <Text className="text-primary-foreground">Loading...</Text>
</Button>
```

### Platform-Specific Button Considerations

- **Android**:
  - Android buttons may need additional padding to match iOS visual weight
  - Use `android:elevation` or equivalent shadow values for proper elevation on Android
  - Ripple effects require additional configuration to work properly
  - Consider using `TouchableNativeFeedback` for Android-specific feedback on buttons

- **iOS**:
  - iOS buttons typically have more subtle feedback effects
  - Shadow properties work more predictably on iOS

## Header Component

Use the `Header` component consistently across all screens for navigation and context.

### Header Configuration

```jsx
import { Header } from '@/components/Header';

// Standard header with title
<Header title="Screen Title" showNotifications={true} />

// Header with logo
<Header useLogo={true} showNotifications={true} />

// Header with custom right element
<Header 
  title="Screen Title" 
  rightElement={<YourCustomElement />} 
/>

// Header with back button
<Header 
  title="Details" 
  showBackButton={true} 
  onBack={() => navigation.goBack()} 
/>
```

### Platform-Specific Header Considerations

- **Android**:
  - Android status bar customization requires `StatusBar` component with platform checks
  - Text in headers may render differently, requiring platform-specific adjustments
  - Back button styling differs between platforms - use the Header component's built-in options
  - Shadow effects need to be handled differently on Android (elevation vs shadowProps)

- **iOS**:
  - iOS has native support for large titles and collapsible headers
  - Safe area insets are critical for proper header positioning on iOS
  - Status bar content color changes (dark/light) may need to be explicitly specified

## Text Styling

Use the `Text` component with appropriate Tailwind classes for typography. This ensures the correct font styles across platforms.

### Text Hierarchy

```jsx
import { Text } from '@/components/ui/text';

// Page title
<Text className="text-2xl font-bold text-foreground">
  Page Title
</Text>

// Section heading
<Text className="text-xl font-semibold text-foreground mb-2">
  Section Heading
</Text>

// Subsection heading
<Text className="text-lg font-medium text-foreground mb-1">
  Subsection Heading
</Text>

// Body text
<Text className="text-base text-foreground">
  Regular body text for primary content.
</Text>

// Secondary text
<Text className="text-sm text-muted-foreground">
  Secondary information or supporting text.
</Text>

// Small text / captions
<Text className="text-xs text-muted-foreground">
  Caption text, timestamps, etc.
</Text>
```

### Platform-Specific Text Considerations

- **Android**:
  - Font rendering is different on Android - text may appear smaller or thinner
  - Android requires explicit `fontFamily` specification for custom fonts
  - Line height calculations differ between platforms - may need adjustments
  - Some text styling properties like `letterSpacing` work differently on Android
  - Use `includeFontPadding: false` on Android to fix inconsistent text height

- **iOS**:
  - Dynamic Type (iOS accessibility feature) should be supported
  - Certain text styles like small caps require different implementations
  - Font weights map differently between platforms (400 on iOS may not look the same as 400 on Android)

## Card Components

Use the Card component family for content blocks throughout the app.

### Basic Card

```jsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

<Card className="mx-4 mb-4">
  <CardHeader>
    <CardTitle>
      <Text className="text-lg font-semibold">Card Title</Text>
    </CardTitle>
  </CardHeader>
  <CardContent className="p-4">
    <Text className="text-foreground">
      Card content goes here.
    </Text>
  </CardContent>
  <CardFooter className="flex-row justify-between px-4 py-2">
    <Button variant="ghost" size="sm">
      <Text>Cancel</Text>
    </Button>
    <Button variant="default" size="sm">
      <Text className="text-primary-foreground">Confirm</Text>
    </Button>
  </CardFooter>
</Card>
```

### Interactive Card

For cards that function as buttons:

```jsx
<Pressable onPress={handlePress}>
  <Card className="mx-4 mb-4 border-l-4 border-l-primary">
    <CardContent className="p-4">
      <Text className="text-foreground font-medium">
        Interactive Card
      </Text>
      <Text className="text-sm text-muted-foreground mt-1">
        Tap to interact
      </Text>
    </CardContent>
  </Card>
</Pressable>
```

### Platform-Specific Card Considerations

- **Android**:
  - Use `elevation` for shadows on Android instead of `shadow-*` classes
  - Border radius may render differently on older Android versions
  - Ripple effects for interactive cards need platform-specific configuration
  - Border styles may appear differently on Android

- **iOS**:
  - Shadow properties work more predictably on iOS
  - Cards with dynamic height may need additional configuration for iOS

## Dialog/Alert Styling

Center buttons in dialogs for better usability and maintain consistent styling for these components.

### Alert Dialog Example

```jsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        <Text className="text-lg font-semibold text-foreground">
          Confirm Action
        </Text>
      </AlertDialogTitle>
      <AlertDialogDescription>
        <Text className="text-muted-foreground">
          Are you sure you want to continue? This action cannot be undone.
        </Text>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="flex-row justify-center gap-3 mt-4">
      <AlertDialogCancel>
        <Text>Cancel</Text>
      </AlertDialogCancel>
      <AlertDialogAction className="bg-destructive">
        <Text className="text-destructive-foreground">Confirm</Text>
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Platform-Specific Dialog Considerations

- **Android**:
  - Android dialogs traditionally have buttons aligned to the right
  - Back button behavior needs special handling on Android dialogs
  - Touch outside to dismiss works differently on Android
  - Dialog animations differ between platforms
  - Material Design guidelines suggest different spacing and typography than iOS

- **iOS**:
  - iOS dialogs typically have vertically stacked buttons
  - Safe area insets must be respected on full-screen iOS sheets
  - iOS has specific swipe gestures for sheet dismissal

## Form Elements

Style form elements consistently for a coherent user experience.

### Form Field Examples

```jsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Text input with label
<View className="mb-4">
  <Label htmlFor="name" className="mb-1.5">
    <Text className="text-sm font-medium">Name</Text>
  </Label>
  <Input
    id="name"
    placeholder="Enter your name"
    value={name}
    onChangeText={setName}
    className="bg-background"
  />
  {error && (
    <Text className="text-xs text-destructive mt-1">
      {error}
    </Text>
  )}
</View>

// Select input with label
<View className="mb-4">
  <Label htmlFor="category" className="mb-1.5">
    <Text className="text-sm font-medium">Category</Text>
  </Label>
  <Select
    id="category"
    value={category}
    onValueChange={setCategory}
    className="bg-background"
  >
    {categories.map(cat => (
      <SelectItem key={cat.id} label={cat.name} value={cat.id} />
    ))}
  </Select>
</View>
```

### Platform-Specific Form Element Considerations

- **Android**:
  - Input fields may need additional padding or height adjustments
  - Text field focus appearance differs significantly (Material Design vs. iOS)
  - Android requires explicit configuration for soft keyboard behavior
  - Date/time pickers have completely different UIs between platforms
  - Dropdown selects appear and behave differently on Android

- **iOS**:
  - Form elements typically have a lighter visual style
  - iOS has specific picker components that are different from Android
  - Keyboard accessories are common on iOS but less so on Android
  - Text selection handles and behavior differ between platforms

## Common Cross-Platform Issues and Solutions

### Shadow Implementation

**Issue**: Shadow styling works differently between iOS and Android.

**Solution**:
```jsx
// Cross-platform shadow solution
<View
  className="bg-card rounded-lg p-4"
  style={Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  })}
>
  <Text>Content with consistent shadow across platforms</Text>
</View>
```

### Icon Rendering

**Issue**: Icons appear properly on iOS but are barely visible on Android.

**Solution**:
```jsx
// Always use the icon utility
import { useIconColor } from '@/lib/theme/iconUtils';

function MyComponent() {
  const { getIconProps } = useIconColor();
  
  return (
    <Icon
      {...getIconProps('primary')}
      size={24} // Slightly larger for Android
      strokeWidth={Platform.OS === 'android' ? 2 : 1.5} // Explicit adjustment
    />
  );
}
```

### Text Alignment

**Issue**: Text alignment and truncation behaves differently across platforms.

**Solution**:
```jsx
// Text alignment helper component
function AlignedText({ children, ...props }) {
  return (
    <Text
      {...props}
      style={[
        props.style,
        Platform.OS === 'android' ? { includeFontPadding: false } : null,
        Platform.OS === 'android' ? { lineHeight: 24 } : null,
      ]}
    >
      {children}
    </Text>
  );
}
```

### Touchable Feedback

**Issue**: Touch feedback effects differ between platforms.

**Solution**:
```jsx
// Platform-specific touchable
function AppTouchable({ children, onPress, ...props }) {
  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        background={TouchableNativeFeedback.Ripple('#rgba(0,0,0,0.1)', false)}
        {...props}
      >
        <View>{children}</View>
      </TouchableNativeFeedback>
    );
  }
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} {...props}>
      {children}
    </TouchableOpacity>
  );
}
```

### Keyboard Handling

**Issue**: Keyboard behavior and avoidance differs between platforms.

**Solution**:
```jsx
// Keyboard handling helper
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
  style={{ flex: 1 }}
>
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={{ flex: 1 }}>
      {/* Form content */}
    </View>
  </TouchableWithoutFeedback>
</KeyboardAvoidingView>
```

## Platform-Specific Component Extensions

For cases where significant platform differences exist, create platform-specific component extensions:

### Example: Platform-Specific DatePicker

```jsx
// DatePickerWrapper.jsx
import { DatePicker } from './DatePicker.ios';
import { DatePicker } from './DatePicker.android';

export const DatePickerWrapper = (props) => {
  const Component = Platform.select({
    ios: DatePickerIOS,
    android: DatePickerAndroid,
  });
  
  return <Component {...props} />;
};
```

## Best Practices for Cross-Platform Development

1. **Always test on both platforms** before considering a feature complete
2. **Use platform detection judiciously** - prefer cross-platform solutions where possible
3. **Create abstraction layers** for significantly different platform components
4. **Leverage UI component libraries** that handle cross-platform differences (like UI Kitten, React Native Paper)
5. **Document platform-specific quirks** that you encounter for future reference
6. **Create utility functions** for common platform-specific adjustments
7. **Use feature detection** instead of platform detection when possible
8. **Consider native device capabilities** like haptic feedback that may not exist on all devices

## Best Practices for POWR App Styling

1. **Never use hardcoded colors** - Always use theme variables through Tailwind classes
2. **Always use `getIconProps` for icons** - Ensures visibility on both iOS and Android
3. **Use semantic variants** - Choose button and icon variants based on their purpose
4. **Maintain consistent spacing** - Use Tailwind spacing classes (p-4, m-2, etc.)
5. **Test both platforms** - Verify UI rendering on both iOS and Android
6. **Use platform-specific overrides** when necessary
7. **Document platform-specific behavior** in component comments

## Troubleshooting Common Issues

### Icons Not Visible on Android

Problem: Icons don't appear or are difficult to see on Android devices.

Solution:
- Ensure you're using `getIconProps()` instead of direct styling
- Add `strokeWidth={2}` to increase visibility
- Verify that icon size is appropriate (min 24px recommended for Android)
- Check that the icon color has sufficient contrast with the background

### Inconsistent Colors

Problem: Colors appear inconsistent between components or platforms.

Solution:
- Verify you're using Tailwind classes (text-primary vs #8B5CF6)
- Check that the correct variant is being used for the component
- Ensure components are properly wrapped with theme provider
- Examine component hierarchy for style inheritance issues

### Text Truncation Issues

Problem: Text doesn't truncate properly or layout breaks with long content.

Solution:
- Add `numberOfLines={1}` for single-line truncation
- Use `ellipsizeMode="tail"` for text truncation
- Wrap Text components with a fixed-width container
- Consider using a more robust solution for responsive text
- Apply platform-specific text style adjustments

### Shadow and Elevation

Problem: Shadows appear on iOS but not on Android, or look inconsistent.

Solution:
- Use platform-specific shadow implementation (see example above)
- For Android, use `elevation` property
- For iOS, use `shadowColor`, `shadowOffset`, `shadowOpacity`, and `shadowRadius`
- Test shadow values on different Android versions

### Keyboard Issues

Problem: Keyboard covers input fields or doesn't dismiss properly.

Solution:
- Use KeyboardAvoidingView with platform-specific behavior
- Implement Keyboard.dismiss on background taps
- Add ScrollView for forms to ensure all fields are accessible
- Consider using a keyboard manager library for complex forms

## Related Documentation

- [Coding Style Guide](../../guides/coding_style.md) - General coding patterns and practices
- [Component Architecture](../../architecture/index.md) - How components are organized
- [Accessibility Guidelines](../../guides/accessibility.md) - Making the app accessible to all users
