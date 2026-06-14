import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/morning_report/presentation/pages/morning_report_page.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Home-screen entry point for an unseen overnight run. Renders nothing when
/// there is no new report — it only appears the morning after the Eidolon
/// adventured on its own.
class MorningReportCard extends ConsumerWidget {
  const MorningReportCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(morningReportNotifierProvider);
    final report = state.report;
    if (report == null || report.seen) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => MorningReportPage(
                report: report,
                eidolonName: ref.read(eidolonNotifierProvider).eidolon?.name,
              ),
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
                  EidolonColors.accent.withValues(alpha: 0.25),
                  EidolonColors.surface,
                ],
              ),
              border: Border.all(
                color: EidolonColors.accentGlow.withValues(alpha: 0.4),
              ),
            ),
            child: Row(
              children: [
                const Text('🌙', style: TextStyle(fontSize: 28)),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.l10n.morningReportTitle.toUpperCase(),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: EidolonColors.accentGlow,
                              letterSpacing: 1.5,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        report.highlight,
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
