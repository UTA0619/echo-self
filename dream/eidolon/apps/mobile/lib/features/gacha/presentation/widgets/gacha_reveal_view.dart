import 'dart:math' as math;

import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_card.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_item_sprite.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Full-screen view shown after a pull completes. A single pull bursts with the
/// item's rarity colour and reveals a colourful spirit; a ten-pull lays out the
/// loot as a grid of sprites.
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
        const SizedBox(height: 8),
        Expanded(
          child: isSingle
              ? _SingleReveal(item: items.first)
              : Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Center(
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 5,
                        childAspectRatio: 0.72,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: items.length,
                      itemBuilder: (ctx, i) =>
                          GachaCard(item: items[i], index: i),
                    ),
                  ),
                ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onDone,
              child: Text(context.l10n.buttonContinue),
            ),
          )
              .animate(delay: Duration(milliseconds: 120 * items.length + 600))
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.3, end: 0),
        ),
      ],
    );
  }
}

class _SingleReveal extends StatelessWidget {
  const _SingleReveal({required this.item});
  final GachaItem item;

  @override
  Widget build(BuildContext context) {
    final color = GachaCard.rarityColor(item.rarity);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 280,
            height: 280,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CustomPaint(
                  size: const Size.square(280),
                  painter: _RaysPainter(color),
                )
                    .animate(onPlay: (c) => c.repeat())
                    .rotate(duration: 14.seconds)
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .scaleXY(begin: 0.95, end: 1.06, duration: 2.seconds),
                GachaItemSprite(item: item, size: 150)
                    .animate()
                    .scaleXY(
                      begin: 0.4,
                      end: 1.0,
                      curve: Curves.elasticOut,
                      duration: 800.ms,
                    )
                    .fadeIn(duration: 300.ms),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: color),
            ),
            child: Text(
              item.rarity.label.toUpperCase(),
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: color,
                    letterSpacing: 2,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          )
              .animate(delay: 350.ms)
              .fadeIn(duration: 400.ms)
              .scaleXY(begin: 0.7, end: 1.0, curve: Curves.elasticOut),
          const SizedBox(height: 10),
          Text(
            item.name,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: EidolonColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
          ).animate(delay: 500.ms).fadeIn(),
        ],
      ),
    );
  }
}

/// Radiating light rays + a soft ring in the rarity colour, behind the sprite.
class _RaysPainter extends CustomPainter {
  _RaysPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final r = size.width / 2;
    const n = 12;
    final ray = Paint()..color = color.withValues(alpha: 0.12);
    for (var i = 0; i < n; i++) {
      final a = i / n * 2 * math.pi;
      final w = 0.13;
      final p1 = c + Offset(math.cos(a - w), math.sin(a - w)) * r;
      final p2 = c + Offset(math.cos(a + w), math.sin(a + w)) * r;
      canvas.drawPath(
        Path()
          ..moveTo(c.dx, c.dy)
          ..lineTo(p1.dx, p1.dy)
          ..lineTo(p2.dx, p2.dy)
          ..close(),
        ray,
      );
    }
    canvas.drawCircle(
      c,
      r * 0.42,
      Paint()..color = color.withValues(alpha: 0.10),
    );
  }

  @override
  bool shouldRepaint(_RaysPainter old) => old.color != color;
}
