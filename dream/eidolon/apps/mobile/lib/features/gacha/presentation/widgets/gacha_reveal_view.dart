import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Full-screen view shown after a pull completes, animating the revealed cards.
class GachaRevealView extends StatelessWidget {
  const GachaRevealView({
    super.key,
    required this.result,
    required this.onDone,
  });

  final GachaPullResult result;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final items = result.items;
    final isSingle = items.length == 1;

    return Column(
      children: [
        const SizedBox(height: 16),
        // Rarity badge for single pull
        if (isSingle)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: GachaCard.rarityColor(items.first.rarity)
                  .withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: GachaCard.rarityColor(items.first.rarity)
                    .withValues(alpha: 0.5),
              ),
            ),
            child: Text(
              items.first.rarity.label.toUpperCase(),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: GachaCard.rarityColor(items.first.rarity),
                    letterSpacing: 2,
                  ),
            ),
          )
              .animate()
              .fadeIn(duration: 500.ms, delay: 300.ms)
              .scaleXY(begin: 0.8, end: 1.0, curve: Curves.elasticOut),

        const SizedBox(height: 16),

        // Cards grid
        Expanded(
          child: isSingle
              ? Center(child: GachaCard(item: items.first, index: 0))
              : Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: GridView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 5,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: items.length,
                    itemBuilder: (ctx, i) =>
                        GachaCard(item: items[i], index: i),
                  ),
                ),
        ),

        // Tap to continue
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onDone,
              child: Text(context.l10n.buttonContinue),
            ),
          )
              .animate(
                  delay: Duration(milliseconds: 120 * items.length + 600))
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.3, end: 0),
        ),
      ],
    );
  }
}
