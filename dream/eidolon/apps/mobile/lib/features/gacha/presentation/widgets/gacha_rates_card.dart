import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_card.dart';
import 'package:flutter/material.dart';

/// Card that lists the summon rate for each rarity tier.
class GachaRatesCard extends StatelessWidget {
  const GachaRatesCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: EidolonColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: EidolonColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.l10n.gachaSummonRates,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    letterSpacing: 1.5,
                  ),
            ),
            const SizedBox(height: 12),
            ...GachaRarity.values.reversed.map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: GachaCard.rarityColor(r),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      r.label,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: GachaCard.rarityColor(r),
                          ),
                    ),
                    const Spacer(),
                    Text(
                      '${(r.weight / 100).toStringAsFixed(1)}%',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
