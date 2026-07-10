import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/weekly_reflection/domain/entities/weekly_reflection.dart';
import 'package:eidolon/features/weekly_reflection/presentation/providers/weekly_reflection_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Full-screen weekly reflection — the Twin's "what I noticed about you."
/// Marks the reflection read on open.
class WeeklyReflectionPage extends ConsumerStatefulWidget {
  const WeeklyReflectionPage({super.key, required this.reflection});
  final WeeklyReflection reflection;

  @override
  ConsumerState<WeeklyReflectionPage> createState() =>
      _WeeklyReflectionPageState();
}

class _WeeklyReflectionPageState extends ConsumerState<WeeklyReflectionPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(weeklyReflectionNotifierProvider.notifier).markSeen(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.reflection;
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: EidolonColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          l10n.weeklyReflectionTitle,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          children: [
            // The reflection itself — the warm, grounded read on the week.
            Text(
              r.reflection,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: EidolonColors.textPrimary,
                    height: 1.8,
                  ),
            ).animate().fadeIn(duration: 500.ms),
            const SizedBox(height: 28),

            // One specific grounded observation.
            _Section(
              heading: l10n.weeklyReflectionObservationHeading,
              body: r.observation,
              accent: EidolonColors.soulCore,
            ).animate(delay: 200.ms).fadeIn(),

            // Optional gentle nudge (only when present).
            if (r.hasNudge) ...[
              const SizedBox(height: 16),
              _Section(
                heading: l10n.weeklyReflectionNudgeHeading,
                body: r.nudge,
                accent: EidolonColors.accentGlow,
              ).animate(delay: 350.ms).fadeIn(),
            ],

            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(l10n.buttonReturnHome),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.heading,
    required this.body,
    required this.accent,
  });
  final String heading;
  final String body;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: EidolonColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: accent.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            heading.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: accent,
                  letterSpacing: 1.2,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: EidolonColors.textPrimary,
                  height: 1.6,
                ),
          ),
        ],
      ),
    );
  }
}
