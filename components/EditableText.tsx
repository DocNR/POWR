// components/EditableText.tsx
import React, { useState, useRef } from 'react';
import { 
  Text, TextInput, TouchableOpacity, StyleSheet, View, 
  Platform, StyleProp, ViewStyle, TextStyle 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';

interface EditableTextProps {
  value: string;
  onChangeText: (text: string) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  inputStyle?: StyleProp<TextStyle>;
  placeholder?: string;
}

export default function EditableText({ 
  value, 
  onChangeText,
  style,
  textStyle,
  inputStyle,
  placeholder
}: EditableTextProps) {
  const { colors } = useColorScheme();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<TextInput>(null);

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
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            value={tempValue}
            onChangeText={setTempValue}
            onBlur={handleSubmit}
            onSubmitEditing={handleSubmit}
            autoFocus
            selectTextOnFocus
            style={[styles.input, textStyle, inputStyle]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity 
            onPress={handleSubmit}
            style={styles.checkButton}
          >
            <Feather name="check" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          onPress={() => setIsEditing(true)}
          style={styles.textContainer}
          activeOpacity={0.7}
        >
          <Text style={[styles.text, textStyle]} numberOfLines={1}>
            {value}
          </Text>
          <View style={styles.editContainer}>
            <View style={[styles.editButton, { backgroundColor: colors.cardBg }]}>
              <Feather name="edit-2" size={14} color={colors.textSecondary} />
              <Text style={[styles.editText, { color: colors.textSecondary }]}>Edit</Text>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textContainer: {
    flexDirection: 'column',
    padding: 8,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    padding: 0,
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  editContainer: {
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 4,
    borderRadius: 4,
  },
  editText: {
    fontSize: 12,
    marginLeft: 4,
  },
  checkButton: {
    padding: 8,
    marginLeft: 8,
  },
});