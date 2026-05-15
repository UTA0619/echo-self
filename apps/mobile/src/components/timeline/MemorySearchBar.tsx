import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../../theme/tokens';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  isSearching: boolean;
}

export function MemorySearchBar({ value, onChange, onSearch, onClear, isSearching }: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const borderOpacity = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(79,70,229,${borderOpacity.value})`,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderOpacity.value = withTiming(1, { duration: 200 });
  };
  const handleBlur = () => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0, { duration: 200 });
  };

  return (
    <Animated.View style={[styles.container, borderStyle]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="Search memories… try 'when I felt hopeful'"
        placeholderTextColor="rgba(255,255,255,0.25)"
        returnKeyType="search"
        onSubmitEditing={() => onSearch(value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        selectionColor={Colors.indigo}
      />
      {isSearching && <ActivityIndicator size="small" color={Colors.indigo} />}
      {value.length > 0 && !isSearching && (
        <Pressable onPress={onClear} style={styles.clearBtn}>
          <Text style={styles.clearText}>✕</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  icon: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  clearBtn: {
    padding: 4,
  },
  clearText: { fontSize: 13, color: Colors.silver, opacity: 0.6 },
});
