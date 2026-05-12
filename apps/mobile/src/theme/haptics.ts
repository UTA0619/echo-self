import * as Haptics from 'expo-haptics'

export const HapticPatterns = {
  // Taps and selections
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Outcomes
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  // Special patterns
  selection: () => Haptics.selectionAsync(),

  // Composed patterns
  entrySubmit: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await new Promise(r => setTimeout(r, 100))
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  },

  predictionReveal: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    await new Promise(r => setTimeout(r, 150))
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await new Promise(r => setTimeout(r, 100))
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  },

  streakMilestone: async () => {
    for (let i = 0; i < 3; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      await new Promise(r => setTimeout(r, 100))
    }
  },
}
