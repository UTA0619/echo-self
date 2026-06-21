import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/away_report/presentation/away_report_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// "While you were away" idle report on the home screen: Nova adventured and
/// brought back crystals. Renders nothing unless the player was away a while.
class AwayReportCard extends ConsumerWidget {
  const AwayReportCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(awayReportNotifierProvider).valueOrNull;
    if (state == null || !state.claimable) return const SizedBox.shrink();
    final notifier = ref.read(awayReportNotifierProvider.notifier);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: EidolonColors.surface,
          borderRadius: BorderRadius.circular(16),
          border:
              Border.all(color: EidolonColors.accent.withValues(alpha: 0.4)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.nightlight_round,
                  color: EidolonColors.accentGlow,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    context.l10n.awayReportTitle,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: EidolonColors.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              context.l10n.awayReportBody(state.hours, state.enemies),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: EidolonColors.textSecondary,
                    height: 1.5,
                  ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: state.isClaiming ? null : notifier.claim,
                style: ElevatedButton.styleFrom(
                  backgroundColor: EidolonColors.accent,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: state.isClaiming
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        '${context.l10n.awayReportClaim}  +${state.crystals} 💎',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.2, end: 0),
    );
  }
}
