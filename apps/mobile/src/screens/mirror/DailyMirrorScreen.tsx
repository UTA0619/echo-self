import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { useEntriesStore } from '../../store/entries';
import { useAuthStore } from '../../store/auth';
import { useOnboardingStore } from '../../store/onboarding';
import { EchoResponseCard } from '../../components/mirror/EchoResponseCard';
import { EntryCard } from '../../components/mirror/EntryCard';
import { StreakBadge } from '../../components/mirror/StreakBadge';
import { Colors, Spacing } from '../../theme/tokens';
import { HapticPatterns } from '../../theme/haptics';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

const MIN_WORDS = 10;
const MAX_CHARS = 2000;

export function DailyMirrorScreen() {
  const { user } = useAuthStore();
  const { name } = useOnboardingStore();
  const {
    entries,
    todayEntry,
    streamState,
    streamedEcho,
    detectedEmotion,
    submitEntry,
    loadEntries,
    resetStream,
  } = useEntriesStore();

  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const keyboardHeight = useKeyboardHeight();

  const submitBtnScale = useSharedValue(1);
  const inputBorderOpacity = useSharedValue(0);

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    inputBorderOpacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  // Scroll to echo response when it arrives
  useEffect(() => {
    if (streamState === 'streaming' || streamState === 'complete') {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    }
  }, [streamState]);

  const wordCount = inputText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = inputText.length;
  const isReady = wordCount >= MIN_WORDS && charCount <= MAX_CHARS;
  const hasSubmittedToday = !!todayEntry;
  const isStreaming = streamState === 'submitting' || streamState === 'streaming';

  const handleSubmit = async () => {
    if (!isReady || !user || isStreaming) return;
    Keyboard.dismiss();
    await HapticPatterns.entrySubmit();
    await submitEntry(inputText.trim(), user.id);
    setInputText('');
  };

  const handlePressSubmit = () => {
    submitBtnScale.value = withSpring(0.94, { damping: 10 }, () => {
      submitBtnScale.value = withSpring(1);
    });
    handleSubmit();
  };

  const submitBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitBtnScale.value }],
    opacity: withTiming(isReady && !isStreaming ? 1 : 0.35, { duration: 200 }),
  }));

  const inputBorderStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(79,70,229,${inputBorderOpacity.value})`,
  }));

  const displayName = name || user?.displayName || 'you';

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${displayName}`;
    if (hour < 17) return `Good afternoon, ${displayName}`;
    return `Good evening, ${displayName}`;
  };

  const pastEntries = entries.filter((e) => !todayEntry || e.id !== todayEntry.id).slice(0, 5);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.greeting}>{greeting()}</Text>
                  <Text style={styles.dateText}>
                    {new Date().toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                {user?.currentStreak != null && (
                  <StreakBadge streak={user.currentStreak} />
                )}
              </View>
            </Animated.View>

            {/* Today's prompt */}
            {!hasSubmittedToday && (
              <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.promptCard}>
                <Text style={styles.promptLabel}>Today's reflection</Text>
                <Text style={styles.promptText}>
                  What's on your mind right now? Write freely — your echo is listening.
                </Text>
              </Animated.View>
            )}

            {/* Input area */}
            {!hasSubmittedToday && (
              <Animated.View
                entering={FadeInDown.delay(250).duration(500)}
                style={[styles.inputCard, inputBorderStyle]}
              >
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Start writing here… let it flow."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  multiline
                  textAlignVertical="top"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  selectionColor={Colors.indigo}
                  maxLength={MAX_CHARS}
                  editable={!isStreaming}
                />

                {/* Footer row */}
                <View style={styles.inputFooter}>
                  <Text style={[styles.wordCount, isReady && styles.wordCountReady]}>
                    {wordCount < MIN_WORDS
                      ? `${MIN_WORDS - wordCount} more words to echo`
                      : `${wordCount} words · ready`}
                  </Text>
                  <Text style={[styles.charCount, charCount > MAX_CHARS * 0.9 && styles.charCountWarn]}>
                    {charCount}/{MAX_CHARS}
                  </Text>
                  <Animated.View style={submitBtnStyle}>
                    <Pressable
                      onPress={handlePressSubmit}
                      disabled={!isReady || isStreaming}
                      style={styles.submitBtn}
                    >
                      <Text style={styles.submitBtnText}>
                        {isStreaming ? '✦ echoing…' : 'Echo ✦'}
                      </Text>
                    </Pressable>
                  </Animated.View>
                </View>
              </Animated.View>
            )}

            {/* Today's entry (already submitted) */}
            {hasSubmittedToday && todayEntry && streamState === 'idle' && (
              <Animated.View entering={FadeIn.duration(500)} style={styles.todayCard}>
                <Text style={styles.todayLabel}>✦ Today's entry</Text>
                <Text style={styles.todayContent}>{todayEntry.content}</Text>
              </Animated.View>
            )}

            {/* Echo response */}
            <EchoResponseCard
              streamState={streamState}
              echoText={streamedEcho}
              emotion={detectedEmotion}
              userName={displayName}
            />

            {/* Past entries */}
            {pastEntries.length > 0 && (
              <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.pastSection}>
                <Text style={styles.sectionTitle}>Recent reflections</Text>
                {pastEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </Animated.View>
            )}

            {/* Bottom spacer */}
            <View style={{ height: keyboardHeight > 0 ? keyboardHeight : Spacing.xxxl }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {},
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 13,
    color: Colors.silver,
    marginTop: 3,
    opacity: 0.7,
  },
  promptCard: {
    backgroundColor: 'rgba(123,94,167,0.1)',
    borderRadius: 16,
    padding: Spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(123,94,167,0.2)',
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.violet,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  promptText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 160,
  },
  input: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 26,
    fontWeight: '300',
    minHeight: 120,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  wordCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    flex: 1,
  },
  wordCountReady: { color: Colors.indigo },
  charCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },
  charCountWarn: { color: '#EF4444' },
  submitBtn: {
    backgroundColor: Colors.indigo,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    shadowColor: Colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  todayCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.indigo,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  todayContent: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  pastSection: { gap: Spacing.md },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.silver,
    letterSpacing: 0.5,
    opacity: 0.7,
  },
});
