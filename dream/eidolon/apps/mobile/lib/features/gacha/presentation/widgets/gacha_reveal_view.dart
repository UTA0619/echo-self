import 'dart:async';
import 'dart:math' as math;

import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_card.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_item_sprite.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Full-screen view shown after a pull completes. First it holds a moment of
/// suspense — a pulsing "soul egg" in the top rarity's colour that the player
/// can tap to crack open (or it hatches on its own after a rarity-scaled beat).
/// Then a single pull bursts into a colourful spirit, or a ten-pull lays the
/// loot out as a grid. The hatch beat is where the gacha excitement lives.
class GachaRevealView extends StatefulWidget {
  const GachaRevealView({
    super.key,
    required this.result,
    required this.onDone,
  });

  final GachaPullResult result;
  final VoidCallback onDone;

  @override
  State<GachaRevealView> createState() => _GachaRevealViewState();
}

class _GachaRevealViewState extends State<GachaRevealView> {
  bool _revealed = false;
  Timer? _timer;

  GachaRarity get _topRarity => widget.result.items
      .map((e) => e.rarity)
      .reduce((a, b) => a.index >= b.index ? a : b);

  @override
  void initState() {
    super.initState();
    // A rarer pull holds the suspense longer — the "is this a big one?" beat.
    final ms = switch (_topRarity) {
      GachaRarity.legendary => 2300,
      GachaRarity.epic => 1900,
      GachaRarity.rare => 1500,
      GachaRarity.common => 1100,
    };
    _timer = Timer(Duration(milliseconds: ms), _reveal);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _reveal() {
    if (!mounted || _revealed) return;
    setState(() => _revealed = true);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 450),
      child: _revealed ? _buildReveal(context) : _buildHatch(context),
    );
  }

  Widget _buildHatch(BuildContext context) {
    final color = GachaCard.rarityColor(_topRarity);
    return GestureDetector(
      key: const ValueKey('gacha-hatch'),
      onTap: _reveal,
      behavior: HitTestBehavior.opaque,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 240,
              height: 240,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: const Size.square(240),
                    painter: _RaysPainter(color),
                  )
                      .animate(onPlay: (c) => c.repeat())
                      .rotate(duration: 10.seconds),
                  CustomPaint(
                    size: const Size.square(150),
                    painter: _EggPainter(color),
                  )
                      .animate(onPlay: (c) => c.repeat(reverse: true))
                      .scaleXY(begin: 0.97, end: 1.06, duration: 620.ms)
                      .animate(onPlay: (c) => c.repeat())
                      .shimmer(
                        duration: 1300.ms,
                        color: Colors.white.withValues(alpha: 0.5),
                      ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text(
              context.l10n.gachaTapToOpen,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            )
                .animate(onPlay: (c) => c.repeat(reverse: true))
                .fadeIn(begin: 0.4, duration: 800.ms),
          ],
        ),
      ),
    );
  }

  Widget _buildReveal(BuildContext context) {
    final items = widget.result.items;
    final isSingle = items.length == 1;

    return Column(
      key: const ValueKey('gacha-reveal'),
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
                        childAspectRatio: 0.78,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      itemCount: items.length,
                      itemBuilder: (ctx, i) =>
                          _GridTile(item: items[i], index: i),
                    ),
                  ),
                ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: widget.onDone,
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

/// A single cell in the ten-pull grid: a rarity-bordered creature with its name
/// below, sized to fit the grid cell (no overflow). Distinct from the big
/// [GachaCard] used elsewhere.
class _GridTile extends StatelessWidget {
  const _GridTile({required this.item, required this.index});

  final GachaItem item;
  final int index;

  @override
  Widget build(BuildContext context) {
    final color = GachaCard.rarityColor(item.rarity);
    return Container(
      padding: const EdgeInsets.all(5),
      decoration: BoxDecoration(
        color: EidolonColors.surfaceElevated,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.6), width: 1.4),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          GachaItemSprite(item: item, size: 42),
          const SizedBox(height: 3),
          Text(
            item.name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontSize: 9,
                  color: EidolonColors.textSecondary,
                ),
          ),
        ],
      ),
    )
        .animate(delay: Duration(milliseconds: 90 * index))
        .fadeIn(duration: 300.ms)
        .scaleXY(
          begin: 0.6,
          end: 1.0,
          curve: Curves.easeOutBack,
          duration: 450.ms,
        );
  }
}

/// The "soul egg" shown during the suspense beat — an egg shape in the rarity
/// colour with a glow, a glossy highlight, and a hint of a crack.
class _EggPainter extends CustomPainter {
  _EggPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final hw = size.width * 0.34;
    final hh = size.height * 0.45;

    final egg = Path()
      ..moveTo(cx, cy - hh)
      ..cubicTo(cx + hw * 1.2, cy - hh, cx + hw, cy + hh * 0.95, cx, cy + hh)
      ..cubicTo(cx - hw, cy + hh * 0.95, cx - hw * 1.2, cy - hh, cx, cy - hh)
      ..close();

    // Soft outer glow.
    canvas.drawPath(
      egg,
      Paint()
        ..color = color.withValues(alpha: 0.6)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 14),
    );
    // Body.
    canvas.drawPath(egg, Paint()..color = color);
    // Darker base for a little form.
    canvas.save();
    canvas.clipPath(egg);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx, cy + hh * 0.6),
        width: hw * 2.4,
        height: hh * 1.4,
      ),
      Paint()..color = const Color(0x33000000),
    );
    // Glossy highlight.
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(cx - hw * 0.38, cy - hh * 0.42),
        width: hw * 0.7,
        height: hh * 0.55,
      ),
      Paint()..color = Colors.white.withValues(alpha: 0.35),
    );
    canvas.restore();
    // A faint crack, hinting it's about to break open.
    canvas.drawPath(
      Path()
        ..moveTo(cx - hw * 0.25, cy - hh * 0.25)
        ..lineTo(cx + hw * 0.08, cy - hh * 0.02)
        ..lineTo(cx - hw * 0.12, cy + hh * 0.28),
      Paint()
        ..color = Colors.white.withValues(alpha: 0.5)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(_EggPainter old) => old.color != color;
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
