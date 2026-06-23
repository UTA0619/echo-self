import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/weekly_reflection/presentation/pages/weekly_reflection_page.dart';
import 'package:eidolon/features/weekly_reflection/presentation/providers/weekly_reflection_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Home-screen entry point for an unseen weekly reflection. Renders nothing when
/// there is none — it appears once a week when the Twin has something to share.
class WeeklyReflectionCard extends ConsumerWidget {
  const WeeklyReflectionCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(weeklyReflectionNotifierProvider);
    final reflection = state.reflection;
    if (reflection == null || reflection.seen) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => WeeklyReflectionPage(reflection: reflection),
            ),
          ),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  EidolonColors.soulCore.withValues(alpha: 0.25),
                  EidolonColors.surface,
                ],
              ),
              border: Border.all(
                color: EidolonColors.soulCore.withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              children: [
                const Text('🪞', style: TextStyle(fontSize: 28)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.l10n.weeklyReflectionTitle.toUpperCase(),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: EidolonColors.soulCore,
                              letterSpacing: 1.2,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        context.l10n.weeklyReflectionCardTeaser,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: EidolonColors.textPrimary,
                            ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: EidolonColors.textSecondary,
                ),
              ],
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0);
  }
}
