/**
 * Onboarding Screen 4/6: Identity Profile
 *
 * Captures:
 *  - Identity tags (self-descriptors, up to 5)
 *  - Aspirations (free text)
 *  - Streak commitment (days/week)
 *
 * These feed directly into the ECHO AI prompt system
 * via OnboardingData.identityTags / .aspirations / .streakCommitment
 */
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Keyboard,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { OnboardingParamList } from '../../navigation/OnboardingNavigator'
import { AnimatedBackground } from '../../components/onboarding/AnimatedBackground'
import { OnboardingButton } from '../../components/onboarding/OnboardingButton'
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress'
import { useOnboardingStore } from '../../store/onboarding'
import { Colors, Spacing, Typography } from '../../theme/tokens'

type Props = NativeStackScreenProps<OnboardingParamList, 'Identity'>

const IDENTITY_TAGS = [
  'Ambitious', 'Analytical', 'Creative', 'Curious', 'Disciplined',
  'Empathetic', 'Focused', 'Honest', 'Intuitive', 'Open-minded',
  'Optimistic', 'Passionate', 'Reflective', 'Resilient', 'Strategic',
  'Thoughtful', 'Visionary', 'Warm',
]

const STREAK_OPTIONS = [
  { days: 3, label: '3×/week', desc: 'Steady' },
  { days: 5, label: '5×/week', desc: 'Consistent' },
  { days: 7, label: 'Daily', desc: 'Committed' },
]

const MAX_TAGS = 5

export function IdentityScreen({ navigation }: Props) {
  const {
    identityTags,
    aspirations,
    streakCommitment,
    setIdentityTags,
    setAspirations,
    setStreakCommitment,
    name,
  } = useOnboardingStore()

  const [localAspirations, setLocalAspirations] = useState(aspirations)
  const contentOpacity = useSharedValue(0)
  const contentY = useSharedValue(24)

  useEffect(() => {
    contentOpacity.value = withDelay(100, withTiming(1, { duration: 600 }))
    contentY.value = withDelay(100, withTiming(0, { duration: 500 }))
  }, [])

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }))

  function toggleTag(tag: string) {
    const lower = tag.toLowerCase()
    if (identityTags.includes(lower)) {
      setIdentityTags(identityTags.filter(t => t !== lower))
    } else if (identityTags.length < MAX_TAGS) {
      setIdentityTags([...identityTags, lower])
    }
  }

  function handleContinue() {
    setAspirations(localAspirations.trim())
    Keyboard.dismiss()
    navigation.navigate('Notifications')
  }

  const canContinue = identityTags.length >= 2 && localAspirations.trim().length >= 10

  return (
    <View style={styles.root}>
      <AnimatedBackground />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={contentStyle}>
            <OnboardingProgress currentStep={3} totalSteps={5} />

            <Text style={styles.heading}>
              {name ? `${name}, who are you?` : 'Tell ECHO who you are'}
            </Text>
            <Text style={styles.subtext}>
              Pick words that feel true. ECHO uses these to know you.
            </Text>

            {/* ── Identity tag grid ── */}
            <Text style={styles.sectionLabel}>
              YOUR TRAITS ({identityTags.length}/{MAX_TAGS})
            </Text>
            <View style={styles.tagGrid}>
              {IDENTITY_TAGS.map(tag => {
                const lower = tag.toLowerCase()
                const selected = identityTags.includes(lower)
                const disabled = !selected && identityTags.length >= MAX_TAGS
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    disabled={disabled}
                    style={[
                      styles.tag,
                      selected && styles.tagSelected,
                      disabled && styles.tagDisabled,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled }}
                    accessibilityLabel={`${tag} identity trait`}
                  >
                    <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                      {tag}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            {/* ── Aspirations ── */}
            <Text style={styles.sectionLabel}>YOUR ASPIRATION</Text>
            <Text style={styles.fieldHint}>
              In one sentence — what does your best life look like?
            </Text>
            <TextInput
              style={styles.textInput}
              value={localAspirations}
              onChangeText={setLocalAspirations}
              placeholder="e.g. Build something that matters and stay present for the people I love."
              placeholderTextColor={Colors.textTertiary}
              multiline
              maxLength={300}
              selectionColor={Colors.indigo}
              accessibilityLabel="Life aspiration text field"
            />
            <Text style={styles.charCount}>{localAspirations.length}/300</Text>

            {/* ── Streak commitment ── */}
            <Text style={styles.sectionLabel}>YOUR COMMITMENT</Text>
            <Text style={styles.fieldHint}>How often will you reflect?</Text>
            <View style={styles.streakRow}>
              {STREAK_OPTIONS.map(opt => {
                const selected = streakCommitment === opt.days
                return (
                  <Pressable
                    key={opt.days}
                    onPress={() => setStreakCommitment(opt.days)}
                    style={[styles.streakChip, selected && styles.streakChipSelected]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={[styles.streakLabel, selected && styles.streakLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.streakDesc, selected && styles.streakDescSelected]}>
                      {opt.desc}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <OnboardingButton
              label="Continue"
              onPress={handleContinue}
              disabled={!canContinue}
              style={styles.continueBtn}
            />

            {!canContinue && (
              <Text style={styles.hint}>
                Pick at least 2 traits and write your aspiration to continue
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 40, gap: Spacing.md },

  heading: {
    ...Typography.displayMd,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  subtext: {
    ...Typography.bodyMd,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  sectionLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
  },
  fieldHint: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: 6,
  },

  // Tags
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 6,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border0,
  },
  tagSelected: {
    backgroundColor: Colors.indigo + '20',
    borderColor: Colors.indigo,
  },
  tagDisabled: { opacity: 0.35 },
  tagText: { ...Typography.bodySm, color: Colors.textSecondary },
  tagTextSelected: { color: Colors.indigo, fontWeight: '600' },

  // Text input
  textInput: {
    backgroundColor: Colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border1,
    padding: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.bodyMd,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },

  // Streak
  streakRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  streakChip: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border0,
    alignItems: 'center',
    gap: 4,
  },
  streakChipSelected: {
    backgroundColor: Colors.indigo + '20',
    borderColor: Colors.indigo,
  },
  streakLabel: { ...Typography.bodySm, color: Colors.textSecondary, fontWeight: '600' },
  streakLabelSelected: { color: Colors.indigo },
  streakDesc: { ...Typography.caption, color: Colors.textTertiary },
  streakDescSelected: { color: Colors.indigo + 'AA' },

  continueBtn: { marginTop: Spacing.lg },
  hint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
})
