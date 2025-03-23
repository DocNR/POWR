import type { TextRef, ViewRef } from '@rn-primitives/types';
import * as React from 'react';
import { TextProps, View, ViewProps } from 'react-native';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// Extended ViewProps interface that includes children
interface ViewPropsWithChildren extends ViewProps {
  children?: React.ReactNode;
}

// Helper function to recursively wrap text nodes in Text components
const wrapTextNodes = (children: React.ReactNode): React.ReactNode => {
  // If it's a string or number, wrap it in a Text component
  if (typeof children === 'string' || typeof children === 'number') {
    return <Text>{children}</Text>;
  }
  
  // If it's an array, map over it and recursively wrap each child
  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <React.Fragment key={index}>{wrapTextNodes(child)}</React.Fragment>
    ));
  }
  
  // If it's a React element
  if (React.isValidElement(children)) {
    // If it's already a Text component or a native element, return it as is
    if (children.type === Text || typeof children.type === 'string') {
      return children;
    }
    
    // Otherwise, recursively wrap its children
    if (children.props.children) {
      return React.cloneElement(
        children,
        { ...children.props },
        wrapTextNodes(children.props.children)
      );
    }
  }
  
  // For everything else, return as is
  return children;
};

const Card = React.forwardRef<ViewRef, ViewPropsWithChildren>(({ className, children, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-card shadow-sm shadow-foreground/10',
        className
      )}
      {...props}
    >
      {wrapTextNodes(children)}
    </View>
  );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef<ViewRef, ViewPropsWithChildren>(({ className, children, ...props }, ref) => {
  return (
    <View ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {wrapTextNodes(children)}
    </View>
  );
});
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<TextRef, React.ComponentPropsWithoutRef<typeof Text>>(
  ({ className, ...props }, ref) => (
    <Text
      role='heading'
      aria-level={3}
      ref={ref}
      className={cn(
        'text-2xl text-card-foreground font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<TextRef, TextProps>(({ className, ...props }, ref) => (
  <Text ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<ViewRef, ViewPropsWithChildren>(({ className, children, ...props }, ref) => {
  return (
    <TextClassContext.Provider value='text-card-foreground'>
      <View ref={ref} className={cn('p-6 pt-0', className)} {...props}>
        {wrapTextNodes(children)}
      </View>
    </TextClassContext.Provider>
  );
});
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<ViewRef, ViewPropsWithChildren>(({ className, children, ...props }, ref) => {
  return (
    <View ref={ref} className={cn('flex flex-row items-center p-6 pt-0', className)} {...props}>
      {wrapTextNodes(children)}
    </View>
  );
});
CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
