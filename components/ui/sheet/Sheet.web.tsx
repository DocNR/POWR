// components/ui/Sheet.web.tsx
import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet,
  Modal as RNModal
} from 'react-native';
import { CloseButton } from './CloseButton';
import type { SheetProps } from './Sheet.types';

// Re-export components
export { SheetContent, SheetHeader, SheetTitle } from './Sheet.native';

export function Sheet({ isOpen, onClose, children }: SheetProps) {
  if (!isOpen) return null;

  return (
    <RNModal
      visible={isOpen}
      transparent
      onRequestClose={onClose}
      animationType="none"
    >
      <View 
        style={StyleSheet.absoluteFill} 
        className="web:fixed web:inset-0 web:z-50"
      >
        <TouchableOpacity 
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose} 
          activeOpacity={1}
        />
        <View 
          className="web:fixed web:inset-x-0 web:bottom-0 web:z-50 bg-background rounded-t-3xl"
          style={styles.sheetContainer}
        >
          {/* Handle indicator */}
          <View className="items-center pt-4 pb-2">
            <View className="w-16 h-1 rounded-full bg-muted-foreground/25" />
          </View>
          
          <CloseButton onPress={onClose} />
          
          {children}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheetContainer: {
    height: '70%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
});