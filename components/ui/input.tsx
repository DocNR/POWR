import * as React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, TextInputProps>(
  ({ className, placeholderClassName, ...props }, ref) => {
    return (
      <TextInput
        ref={ref}
        className={cn(
          // Base styles
          'web:flex h-10 native:h-12 web:w-full rounded-md',
          // Border and background
          'border border-input',
          // Use different backgrounds for light/dark modes
          'bg-background dark:bg-muted',
          // Padding and typography
          'px-3 web:py-2 text-base lg:text-sm native:text-lg native:leading-[1.25]',
          // Text color
          'text-foreground',
          // Web-specific focus styles
          'web:ring-offset-background',
          'web:file:border-0 web:file:bg-transparent web:file:font-medium',
          'web:focus-visible:outline-none web:focus-visible:ring-2',
          'web:focus-visible:ring-ring web:focus-visible:ring-offset-2',
          // Disabled state
          props.editable === false && 'opacity-50 web:cursor-not-allowed',
          className
        )}
        // Handle placeholder styling separately
        placeholderTextColor={placeholderClassName}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };