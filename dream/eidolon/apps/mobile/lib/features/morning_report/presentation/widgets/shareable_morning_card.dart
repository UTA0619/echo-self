import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/morning_report_mood.dart';
import 'package:flutter/material.dart';

/// A self-contained, branded card built to be captured as an image and SHARED.
///
/// This is the growth loop (STRATEGY.md §10 / review finding "virality 3/10"): the
/// overnight story is the most emotionally charged artifact the product makes, so we
/// turn it into something a player wants to post. Unlike [MorningReportCard] (a
/// tappable home-screen entry tied to providers), this widget is pure — it takes a
/// [MorningReport] + the Eidolon's name and renders a fixed-size, on-brand card with
/// no provider/l10n coupling, so it captures crisply and is trivially testable.
class ShareableMorningCard extends StatelessWidget {
  const ShareableMorningCard({
    super.key,
    required this.report,
    required this.eidolonName,
    this.width = 360,
  });

  final MorningReport report;
  final String eidolonName;
  final double width;

  static const _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  String get _date =>
      '${_months[report.runDate.month - 1]} ${report.runDate.day}';

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: EidolonColors.background,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: EidolonColors.accentDim, width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                const Text(
                  'EIDOLON',
                  style: TextStyle(
                    color: EidolonColors.accentGlow,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 3,
                  ),
                ),
                const Spacer(),
                Text(
                  'while you slept',
                  style: TextStyle(
                    color: EidolonColors.textMuted,
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            Text(
              eidolonName,
              style: const TextStyle(
                color: EidolonColors.textPrimary,
                fontSize: 26,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '$_date  ·  ${report.theme}',
              style: const TextStyle(
                color: EidolonColors.textSecondary,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 22),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(width: 3, color: EidolonColors.accent),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      report.highlight,
                      style: const TextStyle(
                        color: EidolonColors.textPrimary,
                        fontSize: 21,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 22),
            Row(
              children: [
                Text(
                  morningReportMoodEmoji(report.mood),
                  style: const TextStyle(fontSize: 20),
                ),
                if (report.xpGained > 0) ...[
                  const SizedBox(width: 14),
                  Text(
                    '+${report.xpGained} XP',
                    style: const TextStyle(
                      color: EidolonColors.gold,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 22),
            const Divider(color: EidolonColors.textDim, height: 1),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Your AI soul-twin adventures while you sleep.',
                    style: TextStyle(
                      color: EidolonColors.textMuted,
                      fontSize: 11.5,
                      height: 1.3,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  '@eidolon',
                  style: TextStyle(
                    color: EidolonColors.accentGlow,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
