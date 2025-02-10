// components/ui/Sheet.native.tsx
import React from 'react';
import { 
  Modal, 
  View, 
  TouchableOpacity, 
  Platform, 
  Dimensions,
  ScrollView,
  StyleSheet,
  Animated,
  BackHandler 
} from 'react-native';
import { Text } from '../text';
import { CloseButton } from './CloseButton';
import type { SheetProps, SheetContentProps, SheetHeaderProps, SheetTitleProps } from './Sheet.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

export function Sheet({ isOpen, onClose, children }: SheetProps) {
  const translateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isVisible, setIsVisible] = React.useState(false);

  // Handle back button on Android
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isOpen) {
        onClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      Animated.spring(translateY, {
        toValue: SCREEN_HEIGHT - SHEET_HEIGHT,
        useNativeDriver: true,
        damping: 25,
        mass: 0.7,
        stiffness: 300,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={StyleSheet.absoluteFill}>
        <TouchableOpacity 
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose} 
          activeOpacity={1}
        />
        <Animated.View 
          className="absolute left-0 right-0 bg-secondary rounded-t-3xl border-t border-border"
          style={[
            styles.sheetContainer,
            { transform: [{ translateY }] }
          ]}
        >
          {/* Handle indicator */}
          <View className="items-center pt-4 pb-2">
            <View className="w-16 h-1 rounded-full bg-muted-foreground/25 dark:bg-muted-foreground/40" />
          </View>
          
          <CloseButton onPress={onClose} />
          
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function SheetHeader({ children }: SheetHeaderProps) {
  return (
    <View className="flex-row justify-between items-center px-6 py-4 border-b border-border">
      {children}
    </View>
  );
}

export function SheetTitle({ children }: SheetTitleProps) {
  return <Text className="text-xl font-semibold">{children}</Text>;
}

export function SheetContent({ children }: SheetContentProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <ScrollView 
      className="flex-1 px-6"
      contentContainerStyle={{
        paddingTop: 16,
        paddingBottom: insets.bottom + 80
      }}
      showsVerticalScrollIndicator={false}
      bounces={Platform.OS === 'ios'}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheetContainer: {
    height: SHEET_HEIGHT,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});