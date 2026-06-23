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

  _RarityFx get _fx => _RarityFx.of(_topRarity);

  @override
  void initState() {
    super.initState();
    _timer = Timer(Duration(milliseconds: _fx.buildUpMs), _reveal);
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
    return Stack(
      children: [
        Positioned.fill(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 450),
            child: _revealed ? _buildReveal(context) : _buildHatch(context),
          ),
        ),
        // Burst of white light at the moment of the crack — brighter for rarer
        // pulls. Plays once when the reveal mounts.
        if (_revealed && _fx.flash > 0)
          Positioned.fill(
            child: IgnorePointer(
              child: ColoredBox(color: Colors.white)
                  .animate()
                  .fade(begin: _fx.flash, end: 0, duration: 600.ms),
            ),
          ),
      ],
    );
  }

  Widget _buildHatch(BuildContext context) {
    final color = GachaCard.rarityColor(_topRarity);
    Widget egg = CustomPaint(
      size: Size.square(_fx.eggSize),
      painter: _EggPainter(color),
    )
        .animate(onPlay: (c) => c.repeat(reverse: true))
        .scaleXY(begin: 0.97, end: 1.06, duration: 620.ms)
        .animate(onPlay: (c) => c.repeat())
        .shimmer(
          duration: 1300.ms,
          color: Colors.white.withValues(alpha: 0.5),
        );
    if (_fx.shake > 0) {
      egg = egg
          .animate(onPlay: (c) => c.repeat())
          .shake(duration: 700.ms, hz: 5, rotation: _fx.shake);
    }

    return GestureDetector(
      key: const ValueKey('gacha-hatch'),
      onTap: _reveal,
      behavior: HitTestBehavior.opaque,
      child: Stack(
        children: [
          // Higher rarity dims the room to spotlight the egg.
          if (_fx.dim > 0)
            Positioned.fill(
              child: ColoredBox(color: Colors.black.withValues(alpha: _fx.dim))
                  .animate()
                  .fadeIn(duration: 500.ms),
            ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 260,
                  height: 260,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Layered counter-rotating auras — more rings = rarer.
                      for (var i = 0; i < _fx.rings; i++)
                        CustomPaint(
                          size: Size.square(260.0 - i * 26),
                          painter: _RaysPainter(color),
                        )
                            .animate(onPlay: (c) => c.repeat())
                            .rotate(
                              duration: Duration(seconds: 9 + i * 4),
                              begin: 0,
                              end: i.isEven ? 1 : -1,
                            ),
                      egg,
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  context.l10n.gachaTapToOpen,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: _fx.dim > 0.3
                            ? Colors.white70
                            : EidolonColors.textSecondary,
                      ),
                )
                    .animate(onPlay: (c) => c.repeat(reverse: true))
                    .fadeIn(begin: 0.4, duration: 800.ms),
              ],
            ),
          ),
        ],
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
              ? _SingleReveal(item: items.first, fx: _fx)
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

/// Per-rarity production values, so a Legendary pull feels nothing like a
/// Common one. Everything escalates together: aura rings, screen dimming, egg
/// shake, the crack flash, the particle burst, the wait, and the banner.
class _RarityFx {
  const _RarityFx({
    required this.rings,
    required this.dim,
    required this.shake,
    required this.flash,
    required this.sparkles,
    required this.buildUpMs,
    required this.bannerScale,
    required this.eggSize,
  });

  final int rings; // counter-rotating aura layers
  final double dim; // backdrop darkening, 0..1
  final double shake; // egg shake amplitude (radians)
  final double flash; // peak white crack-flash opacity
  final int sparkles; // burst particle count
  final int buildUpMs; // suspense before auto-hatch
  final double bannerScale; // rarity banner size multiplier
  final double eggSize;

  static _RarityFx of(GachaRarity r) => switch (r) {
        GachaRarity.common => const _RarityFx(
            rings: 0,
            dim: 0,
            shake: 0,
            flash: 0,
            sparkles: 0,
            buildUpMs: 1000,
            bannerScale: 1.0,
            eggSize: 140,
          ),
        GachaRarity.rare => const _RarityFx(
            rings: 1,
            dim: 0.18,
            shake: 0.012,
            flash: 0.30,
            sparkles: 10,
            buildUpMs: 1500,
            bannerScale: 1.08,
            eggSize: 150,
          ),
        GachaRarity.epic => const _RarityFx(
            rings: 2,
            dim: 0.42,
            shake: 0.025,
            flash: 0.55,
            sparkles: 20,
            buildUpMs: 1950,
            bannerScale: 1.20,
            eggSize: 158,
          ),
        GachaRarity.legendary => const _RarityFx(
            rings: 3,
            dim: 0.65,
            shake: 0.045,
            flash: 0.92,
            sparkles: 34,
            buildUpMs: 2500,
            bannerScale: 1.42,
            eggSize: 168,
          ),
      };
}

class _SingleReveal extends StatelessWidget {
  const _SingleReveal({required this.item, required this.fx});
  final GachaItem item;
  final _RarityFx fx;

  @override
  Widget build(BuildContext context) {
    final color = GachaCard.rarityColor(item.rarity);
    final rayLayers = fx.rings == 0 ? 1 : fx.rings;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 300,
            height: 300,
            child: Stack(
              alignment: Alignment.center,
              children: [
                for (var i = 0; i < rayLayers; i++)
                  CustomPaint(
                    size: Size.square(300.0 - i * 32),
                    painter: _RaysPainter(color),
                  )
                      .animate(onPlay: (c) => c.repeat())
                      .rotate(
                        duration: Duration(seconds: 14 + i * 5),
                        begin: 0,
                        end: i.isEven ? 1 : -1,
                      ),
                if (fx.sparkles > 0) _Burst(color: color, count: fx.sparkles),
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
          const SizedBox(height: 10),
          _RarityBanner(rarity: item.rarity, color: color, fx: fx),
          const SizedBox(height: 12),
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

/// The rarity readout: a row of stars (1 = common … 4 = legendary) above the
/// label, scaled and glowing for higher tiers, so the rarity is unmistakable.
class _RarityBanner extends StatelessWidget {
  const _RarityBanner({
    required this.rarity,
    required this.color,
    required this.fx,
  });
  final GachaRarity rarity;
  final Color color;
  final _RarityFx fx;

  @override
  Widget build(BuildContext context) {
    final s = fx.bannerScale;
    final stars = rarity.index + 1;
    final banner = Container(
      padding: EdgeInsets.symmetric(horizontal: 20 * s, vertical: 7 * s),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: color, width: 1.5),
        boxShadow: fx.flash > 0.4
            ? [
                BoxShadow(
                  color: color.withValues(alpha: 0.6),
                  blurRadius: 20 * s,
                  spreadRadius: 1,
                ),
              ]
            : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < stars; i++)
                Icon(Icons.star_rounded, color: color, size: 16 * s),
            ],
          ),
          SizedBox(height: 2 * s),
          Text(
            rarity.label.toUpperCase(),
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: color,
                  letterSpacing: 2,
                  fontWeight: FontWeight.bold,
                  fontSize: 13 * s,
                ),
          ),
        ],
      ),
    );

    final animated = banner
        .animate(delay: 350.ms)
        .fadeIn(duration: 400.ms)
        .scaleXY(begin: 0.6, end: 1.0, curve: Curves.elasticOut);
    // Legendary keeps shimmering — it earned the spotlight.
    return rarity == GachaRarity.legendary
        ? animated
            .animate(onPlay: (c) => c.repeat(), delay: 900.ms)
            .shimmer(duration: 1600.ms, color: Colors.white.withValues(alpha: 0.7))
        : animated;
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

/// A one-shot burst of sparks flying outward from the centre when the egg
/// cracks. More (and longer-flying) sparks for rarer pulls.
class _Burst extends StatelessWidget {
  const _Burst({required this.color, required this.count});
  final Color color;
  final int count;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 900),
      curve: Curves.easeOut,
      builder: (_, t, __) => CustomPaint(
        size: const Size.square(300),
        painter: _BurstPainter(t, color, count),
      ),
    );
  }
}

class _BurstPainter extends CustomPainter {
  _BurstPainter(this.t, this.color, this.count);
  final double t;
  final Color color;
  final int count;

  @override
  void paint(Canvas canvas, Size size) {
    final c = Offset(size.width / 2, size.height / 2);
    final maxR = size.width * 0.52;
    final rnd = math.Random(7);
    final paint = Paint()..color = color.withValues(alpha: (1 - t).clamp(0, 1));
    for (var i = 0; i < count; i++) {
      final a = i / count * 2 * math.pi + rnd.nextDouble() * 0.4;
      final dist = maxR * (0.35 + 0.65 * rnd.nextDouble()) * t;
      final pos = c + Offset(math.cos(a), math.sin(a)) * dist;
      final r = (3.5 * (1 - t)).clamp(0.6, 3.5);
      canvas.drawCircle(pos, r, paint);
    }
  }

  @override
  bool shouldRepaint(_BurstPainter old) => old.t != t || old.count != count;
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
