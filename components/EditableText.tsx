// components/EditableText.tsx
import React, { useState, useRef } from 'react';
import { 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  View,
  StyleProp,
  ViewStyle,
  TextStyle 
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Check, Edit2 } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { useColorScheme } from '@/lib/useColorScheme';

interface EditableTextProps {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  placeholder?: string;
  placeholderTextColor?: string;
}

export default function EditableText({ 
  value, 
  onChangeText,
  style,
  textStyle,
  inputStyle,
  placeholder,
  placeholderTextColor
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<TextInput>(null);
  const { isDarkColorScheme } = useColorScheme();

  const handleSubmit = () => {
    if (tempValue.trim()) {
      onChangeText(tempValue);
    } else {
      setTempValue(value);
    }
    setIsEditing(false);
  };

  return (
    <View style={[styles.container, style]}>
      {isEditing ? (
        <View className="flex-row items-center bg-secondary rounded-lg px-3 py-2">
          <TextInput
            ref={inputRef}
            value={tempValue}
            onChangeText={setTempValue}
            onBlur={handleSubmit}
            onSubmitEditing={handleSubmit}
            autoFocus
            selectTextOnFocus
            style={[
              styles.input, 
              { color: isDarkColorScheme ? '#FFFFFF' : '#000000' },
              textStyle, 
              inputStyle
            ]}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor || isDarkColorScheme ? '#9CA3AF' : '#6B7280'}
          />
          <TouchableOpacity 
            onPress={handleSubmit}
            className="p-2 ml-2"
          >
            <Check className="text-primary" size={20} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          onPress={() => setIsEditing(true)}
          className="flex-col p-2 rounded-lg"
          activeOpacity={0.7}
        >
          <Text 
            className={cn(
              "text-lg font-semibold text-foreground",
              !value && "text-muted-foreground"
            )}
            style={textStyle} 
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <View className="mt-1">
            <View className="flex-row items-center self-start px-1.5 py-1 rounded bg-muted/20">
              <Edit2 size={14} className="text-muted-foreground" />
              <Text className="text-xs text-muted-foreground ml-1">Edit</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    padding: 0,
  },
});