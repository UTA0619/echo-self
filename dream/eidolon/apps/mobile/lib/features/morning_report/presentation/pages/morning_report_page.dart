import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/morning_report_mood.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/morning_share_button.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Full-screen Morning Report — the story of the Eidolon's overnight venture,
/// plus the XP and loot it earned. Marks the report read on open.
class MorningReportPage extends ConsumerStatefulWidget {
  const MorningReportPage({super.key, required this.report, this.eidolonName});
  final MorningReport report;

  /// The Eidolon's name, for the shareable card headline. Optional so the page
  /// stays decoupled from the eidolon provider; callers pass it when available.
  final String? eidolonName;

  @override
  ConsumerState<MorningReportPage> createState() => _MorningReportPageState();
}

class _MorningReportPageState extends ConsumerState<MorningReportPage> {
  @override
  void initState() {
    super.initState();
    // Opening the report counts as reading it.
    Future.microtask(
      () => ref.read(morningReportNotifierProvider.notifier).markSeen(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.report;
    final l10n = context.l10n;

    return Scaffold(
      backgroundColor: EidolonColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          l10n.morningReportTitle,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          children: [
            Text(
              l10n.morningReportWhileYouSlept,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: EidolonColors.textSecondary,
                    letterSpacing: 1,
                  ),
            ).animate().fadeIn(),
            const SizedBox(height: 16),

            // Narrative
            Text(
              r.narrative,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: EidolonColors.textPrimary,
                    height: 1.8,
                  ),
            ).animate(delay: 150.ms).fadeIn(duration: 500.ms),
            const SizedBox(height: 24),

            // Mood + XP row
            Row(
              children: [
                _StatPill(
                  label: l10n.morningReportMoodHeading,
                  value:
                      '${morningReportMoodEmoji(r.mood)} ${morningReportMoodLabel(context, r.mood)}',
                ),
                const SizedBox(width: 12),
                _StatPill(
                  label: 'XP',
                  value: l10n.morningReportXp(r.xpGained),
                  accent: true,
                ),
              ],
            ).animate(delay: 300.ms).fadeIn(),
            const SizedBox(height: 28),

            // Loot
            Text(
              l10n.morningReportLootTitle,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: EidolonColors.textSecondary,
                    letterSpacing: 1,
                  ),
            ),
            const SizedBox(height: 12),
            if (r.loot.isEmpty)
              Text(
                l10n.morningReportNoLoot,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: EidolonColors.textSecondary,
                      fontStyle: FontStyle.italic,
                    ),
              )
            else
              ...r.loot.map((item) => _LootTile(loot: item)),

            const SizedBox(height: 32),
            // Shareable card — the growth loop (STRATEGY Act/§10).
            Center(
              child: MorningShareCard(
                report: r,
                eidolonName: widget.eidolonName ?? 'Eidolon',
                label: l10n.morningReportShare,
              ),
            ).animate(delay: 400.ms).fadeIn(),
            const SizedBox(height: 28),
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

class _StatPill extends StatelessWidget {
  const _StatPill({
    required this.label,
    required this.value,
    this.accent = false,
  });
  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final color = accent ? EidolonColors.accentGlow : EidolonColors.textPrimary;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
        decoration: BoxDecoration(
          color: EidolonColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textSecondary,
                    letterSpacing: 1,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LootTile extends StatelessWidget {
  const _LootTile({required this.loot});
  final OvernightLoot loot;

  @override
  Widget build(BuildContext context) {
    final color = _rarityColor(loot.rarity);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: EidolonColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Icon(Icons.diamond_outlined, size: 18, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              loot.name,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: EidolonColors.textPrimary,
                  ),
            ),
          ),
          Text(
            loot.rarity.name.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: color,
                  letterSpacing: 1,
                ),
          ),
        ],
      ),
    );
  }

  static Color _rarityColor(LootRarity rarity) => switch (rarity) {
        LootRarity.common => EidolonColors.textSecondary,
        LootRarity.rare => EidolonColors.accent,
        LootRarity.epic => EidolonColors.soulCore,
        LootRarity.legendary => EidolonColors.gold,
      };
}
