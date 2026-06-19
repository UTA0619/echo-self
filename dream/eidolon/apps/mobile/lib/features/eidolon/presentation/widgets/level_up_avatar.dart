import 'dart:math' as math;

import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:eidolon/features/eidolon/presentation/widgets/eidolon_avatar.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// An [EidolonAvatar] that bursts into a gold celebration whenever [level]
/// rises — the home-screen payoff that makes a dungeon level-up *felt*.
class LevelUpAvatar extends StatefulWidget {
  const LevelUpAvatar({
    super.key,
    required this.mood,
    required this.genes,
    required this.level,
    this.size = 72,
  });

  final EidolonMood mood;
  final AvatarGenes genes;
  final int level;
  final double size;

  @override
  State<LevelUpAvatar> createState() => _LevelUpAvatarState();
}

class _LevelUpAvatarState extends State<LevelUpAvatar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _burst;
  late int _shownLevel;

  @override
  void initState() {
    super.initState();
    _shownLevel = widget.level;
    _burst = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
  }

  @override
  void didUpdateWidget(LevelUpAvatar old) {
    super.didUpdateWidget(old);
    if (widget.level > _shownLevel) {
      _shownLevel = widget.level;
      _burst.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _burst.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final box = widget.size * 1.6;
    return SizedBox(
      width: box,
      height: box,
      child: AnimatedBuilder(
        animation: _burst,
        builder: (context, _) {
          final t = _burst.value;
          final active = _burst.isAnimating;
          // A quick pop that peaks early then settles.
          final pop =
              active ? 1 + 0.2 * math.sin((t * 2).clamp(0, 1) * math.pi) : 1.0;
          return Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              if (active)
                CustomPaint(size: Size.square(box), painter: _BurstPainter(t)),
              Transform.scale(
                scale: pop,
                child: EidolonAvatar(
                  mood: active && widget.level > 1
                      ? EidolonMood.excited
                      : widget.mood,
                  genes: widget.genes,
                  size: widget.size,
                ),
              ),
              if (active && t < 0.85)
                Positioned(
                  top: box * 0.02,
                  child: Opacity(
                    opacity: (1 - t / 0.85).clamp(0.0, 1.0),
                    child: Transform.translate(
                      offset: Offset(0, -t * 20),
                      child: Text(
                        'Lv.${widget.level}',
                        style: TextStyle(
                          color: EidolonColors.gold,
                          fontWeight: FontWeight.bold,
                          fontSize: widget.size * 0.24,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _BurstPainter extends CustomPainter {
  _BurstPainter(this.t);
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxR = size.width / 2;
    const gold = EidolonColors.gold;

    for (var i = 0; i < 2; i++) {
      final rt = (t - i * 0.12).clamp(0.0, 1.0);
      if (rt <= 0) continue;
      canvas.drawCircle(
        center,
        maxR * (0.25 + rt * 0.75),
        Paint()
          ..color = gold.withValues(alpha: (1 - rt) * 0.6)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3 * (1 - rt) + 0.5,
      );
    }

    const n = 7;
    final op = (1 - t).clamp(0.0, 1.0);
    for (var i = 0; i < n; i++) {
      final a = i / n * 2 * math.pi + 0.4;
      final d = maxR * (0.2 + t * 0.85);
      final p = center + Offset(math.cos(a), math.sin(a)) * d;
      _star(canvas, p, maxR * 0.05 * (1 - t * 0.4), gold.withValues(alpha: op));
    }
  }

  void _star(Canvas canvas, Offset c, double r, Color color) {
    canvas.drawPath(
      Path()
        ..moveTo(c.dx, c.dy - r)
        ..quadraticBezierTo(c.dx, c.dy, c.dx + r, c.dy)
        ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy + r)
        ..quadraticBezierTo(c.dx, c.dy, c.dx - r, c.dy)
        ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy - r)
        ..close(),
      Paint()..color = color,
    );
  }

  @override
  bool shouldRepaint(_BurstPainter old) => old.t != t;
}
