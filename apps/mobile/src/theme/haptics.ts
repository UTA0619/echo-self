import * as Haptics from 'expo-haptics';

export const HapticPatterns = {
  // Single taps
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),

  // Notifications
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),

  // Navigation
  selection: () => Haptics.selectionAsync(),

  // App-specific patterns
  entrySubmit: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  onboardingStep: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  emotionSelect: () => Haptics.selectionAsync(),
  streakAchieved: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
  purchaseSuccess: async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await new Promise(resolve => setTimeout(resolve, 80));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(resolve => setTimeout(resolve, 80));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  revealFutureSelf: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise(resolve => setTimeout(resolve, 120));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 80));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
};
