import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// Card showing the user's Eidolon — name, level, mood, XP bar.
class HomeEidolonCard extends StatelessWidget {
  const HomeEidolonCard({super.key, required this.eidolon});
  final EidolonProfile? eidolon;

  static const _moodLabels = {
    EidolonMood.calm: 'Calm',
    EidolonMood.excited: 'Excited',
    EidolonMood.anxious: 'Anxious',
    EidolonMood.tired: 'Tired',
    EidolonMood.focused: 'Focused',
    EidolonMood.melancholic: 'Melancholic',
  };

  static const _moodIcons = {
    EidolonMood.calm: '🌊',
    EidolonMood.excited: '⚡',
    EidolonMood.anxious: '🌀',
    EidolonMood.tired: '😴',
    EidolonMood.focused: '🎯',
    EidolonMood.melancholic: '🌧️',
  };

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: HomeCardShell(
        child: eidolon == null
            ? Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  'Eidolon not yet awakened',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: EidolonColors.textSecondary,
                      ),
                ),
              )
            : HomeEidolonCardContent(
                eidolon: eidolon!,
                moodLabels: _moodLabels,
                moodIcons: _moodIcons,
              ),
      ),
    );
  }
}

/// Inner content for [HomeEidolonCard] when an Eidolon exists.
class HomeEidolonCardContent extends StatelessWidget {
  const HomeEidolonCardContent({
    super.key,
    required this.eidolon,
    required this.moodLabels,
    required this.moodIcons,
  });

  final EidolonProfile eidolon;
  final Map<EidolonMood, String> moodLabels;
  final Map<EidolonMood, String> moodIcons;

  @override
  Widget build(BuildContext context) {
    final mood = eidolon.currentMood;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                eidolon.name,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: EidolonColors.textPrimary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: EidolonColors.background,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: EidolonColors.accent.withValues(alpha: 0.4),
                ),
              ),
              child: Text(
                'Lv. ${eidolon.level}',
                style: const TextStyle(
                  color: EidolonColors.accent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Text(
              moodIcons[mood] ?? '✨',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(width: 6),
            Text(
              moodLabels[mood] ?? 'Unknown',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'XP',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            ),
            Text(
              '${eidolon.xp} / ${eidolon.xpToNext}',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: eidolon.levelProgress.clamp(0.0, 1.0),
            backgroundColor: EidolonColors.background,
            valueColor: const AlwaysStoppedAnimation<Color>(
              EidolonColors.accent,
            ),
            minHeight: 6,
          ),
        ),
      ],
    );
  }
}

/// Shared rounded surface card used by home widgets.
class HomeCardShell extends StatelessWidget {
  const HomeCardShell({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: EidolonColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: EidolonColors.accent.withValues(alpha: 0.15),
        ),
      ),
      child: child,
    );
  }
}
