import 'dart:math' as math;

import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// A living, expressive embodiment of the Eidolon.
///
/// Unlike the static [EidolonOrb], this draws a little creature with a face
/// whose expression reflects the Eidolon's [mood], and which breathes, floats
/// and blinks so it reads as alive rather than as a stat readout. Pure
/// [CustomPaint] + a single ticker — no image assets, no [setState].
class EidolonAvatar extends StatefulWidget {
  const EidolonAvatar({
    super.key,
    this.mood = EidolonMood.calm,
    this.size = 96,
  });

  final EidolonMood mood;
  final double size;

  @override
  State<EidolonAvatar> createState() => _EidolonAvatarState();
}

class _EidolonAvatarState extends State<EidolonAvatar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 5200),
    )..repeat();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  // Eyes stay open, with two quick blinks per loop. Some moods rest narrower.
  double _eyeOpen(double t) {
    final base = switch (widget.mood) {
      EidolonMood.tired => 0.42,
      EidolonMood.focused => 0.62,
      EidolonMood.melancholic => 0.78,
      _ => 1.0,
    };
    double blink = 0;
    for (final at in const [0.18, 0.52]) {
      final d = (t - at).abs();
      if (d < 0.035) blink = math.max(blink, 1 - d / 0.035);
    }
    return base * (1 - blink);
  }

  @override
  Widget build(BuildContext context) {
    final box = widget.size * 1.18;
    return SizedBox(
      width: box,
      height: box,
      child: AnimatedBuilder(
        animation: _c,
        builder: (context, _) {
          final t = _c.value;
          final fast = widget.mood == EidolonMood.excited;
          final breathe =
              1 + (fast ? 0.06 : 0.035) * math.sin(t * 2 * math.pi * 2);
          final bob = (fast ? 5.0 : 3.0) * math.sin(t * 2 * math.pi);
          return Center(
            child: Transform.translate(
              offset: Offset(0, bob),
              child: Transform.scale(
                scale: breathe,
                child: CustomPaint(
                  size: Size.square(widget.size),
                  painter: _EidolonFacePainter(
                    mood: widget.mood,
                    eyeOpen: _eyeOpen(t),
                    glowPulse: 0.5 + 0.5 * math.sin(t * 2 * math.pi),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _EidolonFacePainter extends CustomPainter {
  _EidolonFacePainter({
    required this.mood,
    required this.eyeOpen,
    required this.glowPulse,
  });

  final EidolonMood mood;
  final double eyeOpen;
  final double glowPulse;

  Color get _accent => switch (mood) {
        EidolonMood.calm => const Color(0xFF45D8C0),
        EidolonMood.excited => EidolonColors.gold,
        EidolonMood.anxious => const Color(0xFF6FA8FF),
        EidolonMood.tired => const Color(0xFF8E86C9),
        EidolonMood.focused => EidolonColors.accent,
        EidolonMood.melancholic => const Color(0xFF5C6BC0),
      };

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;
    final accent = _accent;
    final dark = Color.lerp(accent, Colors.black, 0.45)!;

    // Soul glow behind the body.
    final glowR = w * (0.52 + 0.05 * glowPulse);
    canvas.drawCircle(
      Offset(cx, h * 0.52),
      glowR,
      Paint()
        ..shader = RadialGradient(
          colors: [
            accent.withValues(alpha: 0.30),
            accent.withValues(alpha: 0.0),
          ],
        ).createShader(
          Rect.fromCircle(center: Offset(cx, h * 0.52), radius: glowR),
        ),
    );

    // Floating shadow.
    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, h * 0.92), width: w * 0.5, height: 9),
      Paint()..color = Colors.black.withValues(alpha: 0.35),
    );

    final bodyRect = Rect.fromCenter(
      center: Offset(cx, h * 0.54),
      width: w * 0.7,
      height: h * 0.66,
    );

    // Ears / horns.
    final earPaint = Paint()..color = dark;
    for (final sign in const [-1, 1]) {
      final bx = cx + sign * w * 0.16;
      canvas.drawPath(
        Path()
          ..moveTo(bx - 9, h * 0.30)
          ..lineTo(bx + sign * 4, h * 0.10)
          ..lineTo(bx + 9, h * 0.30)
          ..close(),
        earPaint,
      );
    }

    // Body (two-tone for a little volume).
    canvas.drawOval(bodyRect, Paint()..color = dark);
    canvas.drawOval(
      bodyRect.deflate(w * 0.04).translate(0, -h * 0.02),
      Paint()..color = accent,
    );

    // Sparkle mark.
    _drawSparkle(
      canvas,
      Offset(cx + w * 0.18, h * 0.30),
      w * 0.05,
      Colors.white.withValues(alpha: 0.85),
    );

    final eyeY = h * (mood == EidolonMood.anxious ? 0.48 : 0.50);
    final eyeDx = w * 0.13;
    final eyeR = w * 0.085;

    _drawEye(canvas, Offset(cx - eyeDx, eyeY), eyeR);
    _drawEye(canvas, Offset(cx + eyeDx, eyeY), eyeR);

    // Brows convey worry / determination / sadness.
    final browPaint = Paint()
      ..color = dark
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;
    final browY = eyeY - eyeR - h * 0.04;
    switch (mood) {
      case EidolonMood.anxious:
      case EidolonMood.melancholic:
        for (final sign in const [-1, 1]) {
          canvas.drawLine(
            Offset(cx + sign * (eyeDx - eyeR), browY + 3),
            Offset(cx + sign * (eyeDx + eyeR), browY - 2),
            browPaint,
          );
        }
      case EidolonMood.focused:
        for (final sign in const [-1, 1]) {
          canvas.drawLine(
            Offset(cx + sign * (eyeDx - eyeR), browY - 2),
            Offset(cx + sign * (eyeDx + eyeR), browY + 3),
            browPaint,
          );
        }
      default:
        break;
    }

    // Cheeks (only when content).
    if (mood == EidolonMood.calm || mood == EidolonMood.excited) {
      final cheek = Paint()
        ..color = const Color(0xFFF0997B).withValues(alpha: 0.5);
      canvas.drawCircle(
        Offset(cx - w * 0.20, eyeY + eyeR * 1.6),
        w * 0.045,
        cheek,
      );
      canvas.drawCircle(
        Offset(cx + w * 0.20, eyeY + eyeR * 1.6),
        w * 0.045,
        cheek,
      );
    }

    _drawMouth(canvas, Offset(cx, eyeY + h * 0.16), w, dark);
  }

  void _drawEye(Canvas canvas, Offset c, double r) {
    final open = eyeOpen.clamp(0.0, 1.0);
    if (open < 0.12) {
      // Closed: a calm downward arc.
      canvas.drawArc(
        Rect.fromCircle(center: c, radius: r),
        0.15 * math.pi,
        0.7 * math.pi,
        false,
        Paint()
          ..color = const Color(0xFF15131F)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.4
          ..strokeCap = StrokeCap.round,
      );
      return;
    }
    final narrow = mood == EidolonMood.focused ? 0.7 : 1.0;
    final scleraH = r * 2 * open;
    canvas.drawOval(
      Rect.fromCenter(center: c, width: r * 2 * narrow, height: scleraH),
      Paint()..color = Colors.white,
    );
    final pupilR = r * 0.55 * open;
    canvas.drawCircle(
      c.translate(0, r * 0.12),
      pupilR,
      Paint()..color = const Color(0xFF15131F),
    );
    canvas.drawCircle(
      c.translate(pupilR * 0.4, r * 0.12 - pupilR * 0.4),
      pupilR * 0.32,
      Paint()..color = Colors.white,
    );
  }

  void _drawMouth(Canvas canvas, Offset c, double w, Color color) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final half = w * 0.10;

    if (mood == EidolonMood.excited) {
      // Open, happy mouth.
      final rect =
          Rect.fromCenter(center: c, width: half * 1.6, height: half * 1.4);
      canvas.drawArc(
        rect,
        0,
        math.pi,
        true,
        Paint()..color = const Color(0xFF3A1726),
      );
      return;
    }

    final curve = switch (mood) {
      EidolonMood.calm => 0.7,
      EidolonMood.focused => 0.0,
      EidolonMood.tired => -0.15,
      EidolonMood.anxious => -0.2,
      EidolonMood.melancholic => -0.6,
      EidolonMood.excited => 0.0,
    };
    final dip = half * curve;
    canvas.drawPath(
      Path()
        ..moveTo(c.dx - half, c.dy)
        ..quadraticBezierTo(c.dx, c.dy + dip, c.dx + half, c.dy),
      paint,
    );
  }

  void _drawSparkle(Canvas canvas, Offset c, double r, Color color) {
    final p = Paint()..color = color;
    canvas.drawPath(
      Path()
        ..moveTo(c.dx, c.dy - r)
        ..quadraticBezierTo(c.dx, c.dy, c.dx + r, c.dy)
        ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy + r)
        ..quadraticBezierTo(c.dx, c.dy, c.dx - r, c.dy)
        ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy - r)
        ..close(),
      p,
    );
  }

  @override
  bool shouldRepaint(_EidolonFacePainter old) =>
      old.eyeOpen != eyeOpen || old.glowPulse != glowPulse || old.mood != mood;
}
