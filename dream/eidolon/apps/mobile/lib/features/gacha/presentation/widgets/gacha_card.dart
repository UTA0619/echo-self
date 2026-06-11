import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// A single revealed gacha card.
class GachaCard extends StatelessWidget {
  const GachaCard({
    super.key,
    required this.item,
    required this.index,
    this.compact = false,
  });

  final GachaItem item;
  final int index;
  final bool compact;

  static Color rarityColor(GachaRarity r) => switch (r) {
        GachaRarity.legendary => const Color(0xFFFFB347),
        GachaRarity.epic => const Color(0xFFAB5CF7),
        GachaRarity.rare => const Color(0xFF5AB4FF),
        GachaRarity.common => EidolonColors.textSecondary,
      };

  @override
  Widget build(BuildContext context) {
    final color = rarityColor(item.rarity);
    final delay = Duration(milliseconds: 120 * index);

    if (compact) {
      return _CompactCard(item: item, color: color)
          .animate(delay: delay)
          .fadeIn(duration: 350.ms)
          .scaleXY(
            begin: 0.7,
            end: 1.0,
            curve: Curves.elasticOut,
            duration: 500.ms,
          );
    }

    return Container(
      width: 140,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: EidolonColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.6), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.25),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(item.iconEmoji, style: const TextStyle(fontSize: 40)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              item.rarity.label.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: color,
                    letterSpacing: 1.2,
                    fontSize: 10,
                  ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.name,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontSize: 13,
                  height: 1.3,
                ),
          ),
        ],
      ),
    )
        .animate(delay: delay)
        .fadeIn(duration: 400.ms)
        .scaleXY(
          begin: 0.5,
          end: 1.0,
          curve: Curves.elasticOut,
          duration: 700.ms,
        )
        .then()
        .shimmer(
          duration: 600.ms,
          color: color.withValues(alpha: 0.3),
          delay: 200.ms,
        );
  }
}

class _CompactCard extends StatelessWidget {
  const _CompactCard({required this.item, required this.color});
  final GachaItem item;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: EidolonColors.surfaceElevated,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 1),
      ),
      child: Row(
        children: [
          Text(item.iconEmoji, style: const TextStyle(fontSize: 20)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontSize: 13,
                      ),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  item.rarity.label,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: color,
                        fontSize: 10,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
