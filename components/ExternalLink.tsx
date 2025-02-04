// components/ExternalLink.tsx
import { Link, Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { type ComponentProps } from 'react';
import { Platform } from 'react-native';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: Href<string | object>;
};

export function ExternalLink({ href, ...rest }: Props) {
  const handlePress = async (event: any) => {
    if (Platform.OS !== 'web') {
      event.preventDefault();
      
      // Convert href to string based on its type
      let url: string;
      if (typeof href === 'string') {
        url = href;
      } else if (typeof href === 'object' && href !== null) {
        // Handle route objects from expo-router
        if ('pathname' in href) {
          url = href.pathname;
        } else {
          url = String(href);
        }
      } else {
        url = String(href);
      }

      try {
        await WebBrowser.openBrowserAsync(url);
      } catch (error) {
        console.error('Error opening external link:', error);
      }
    }
  };

  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={handlePress}
    />
  );
}