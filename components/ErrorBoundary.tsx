import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { Button } from './ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught an error:', error);
  }

  private resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  private restartApp = () => {
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      // For native platforms, just reset the error state
      // The app will re-mount components
      this.resetError();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-background p-4">
          <ScrollView>
            <View className="items-center mb-4">
              <Text className="text-foreground text-lg font-bold mb-2">
                Something went wrong
              </Text>
              <Text className="text-destructive text-base text-center mb-4">
                {this.state.error?.message}
              </Text>
              {__DEV__ && (
                <Text className="text-muted-foreground text-sm mb-4">
                  {this.state.error?.stack}
                </Text>
              )}
            </View>
            <Button
              onPress={this.restartApp}
              className="mb-4"
            >
              <Text className="text-primary-foreground">Restart App</Text>
            </Button>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}