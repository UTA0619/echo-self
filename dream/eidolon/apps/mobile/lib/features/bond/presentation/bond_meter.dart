import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/bond/presentation/bond_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Compact bond meter for the home Eidolon card: how close you and your
/// companion have grown (level + relationship tier + progress). Chatting and
/// adventuring deepen it — the relationship made visible.
class BondMeter extends ConsumerWidget {
  const BondMeter({super.key});

  static const _pink = Color(0xFFF06CA8);

  String _tier(BuildContext context, int level) {
    final l10n = context.l10n;
    return switch (bondTierIndex(level)) {
      4 => l10n.bondTierSoulmate,
      3 => l10n.bondTierCloseFriend,
      2 => l10n.bondTierTrusted,
      1 => l10n.bondTierAcquaintance,
      _ => l10n.bondTierStranger,
    };
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final points = ref.watch(bondNotifierProvider).valueOrNull ?? 0;
    final level = bondLevel(points);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.favorite, color: _pink, size: 14),
            const SizedBox(width: 6),
            Text(
              '${context.l10n.bondLabel} Lv.$level',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textPrimary,
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _tier(context, level),
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: _pink,
                    ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(3),
          child: LinearProgressIndicator(
            value: bondProgress(points),
            minHeight: 5,
            backgroundColor: EidolonColors.background,
            valueColor: const AlwaysStoppedAnimation<Color>(_pink),
          ),
        ),
      ],
    );
  }
}
