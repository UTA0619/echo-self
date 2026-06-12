import 'package:eidolon/core/i18n/l10n.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_types/shared_types.dart';

/// Localized label for an [EidolonMood], reusing the shared mood ARB keys.
String morningReportMoodLabel(BuildContext context, EidolonMood mood) {
  final l10n = context.l10n;
  return switch (mood) {
    EidolonMood.calm => l10n.moodCalm,
    EidolonMood.excited => l10n.moodExcited,
    EidolonMood.anxious => l10n.moodAnxious,
    EidolonMood.tired => l10n.moodTired,
    EidolonMood.focused => l10n.moodFocused,
    EidolonMood.melancholic => l10n.moodMelancholic,
  };
}

/// Emoji glyph for a mood — purely decorative, locale-independent.
String morningReportMoodEmoji(EidolonMood mood) => switch (mood) {
      EidolonMood.calm => '🌊',
      EidolonMood.excited => '⚡',
      EidolonMood.anxious => '🌀',
      EidolonMood.tired => '😴',
      EidolonMood.focused => '🎯',
      EidolonMood.melancholic => '🌧️',
    };
