import 'dart:math' as math;

import 'package:eidolon/features/eidolon/presentation/widgets/avatar_genes.dart';
import 'package:flutter/material.dart';
import 'package:shared_types/shared_types.dart';

/// A living, one-of-a-kind embodiment of the Eidolon.
///
/// [genes] (derived from the owner's personality) decide the *identity* — body
/// shape, colour, crown and markings — so no two companions look alike, while
/// [mood] drives the *expression*. It breathes, floats and blinks. Pure
/// [CustomPaint] + a single ticker — no image assets, no [setState].
class EidolonAvatar extends StatefulWidget {
  const EidolonAvatar({
    super.key,
    this.mood = EidolonMood.calm,
    this.size = 96,
    this.genes = AvatarGenes.fallback,
  });

  final EidolonMood mood;
  final double size;
  final AvatarGenes genes;

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
    final box = widget.size * 1.2;
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
                    genes: widget.genes,
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
    required this.genes,
    required this.eyeOpen,
    required this.glowPulse,
  });

  final EidolonMood mood;
  final AvatarGenes genes;
  final double eyeOpen;
  final double glowPulse;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final cx = w / 2;
    final primary = genes.primary;
    final dark = genes.secondary;

    final glowR = w * (0.52 + 0.05 * glowPulse);
    canvas.drawCircle(
      Offset(cx, h * 0.52),
      glowR,
      Paint()
        ..shader = RadialGradient(
          colors: [
            primary.withValues(alpha: 0.32),
            primary.withValues(alpha: 0.0),
          ],
        ).createShader(
          Rect.fromCircle(center: Offset(cx, h * 0.52), radius: glowR),
        ),
    );

    canvas.drawOval(
      Rect.fromCenter(center: Offset(cx, h * 0.92), width: w * 0.5, height: 9),
      Paint()..color = Colors.black.withValues(alpha: 0.35),
    );

    _drawCrown(canvas, w, h, cx, primary, dark);

    final bodyRect = _bodyRect(w, h, cx);
    canvas.drawPath(_bodyPath(bodyRect), Paint()..color = dark);
    canvas.drawPath(
      _bodyPath(bodyRect.deflate(w * 0.035).translate(0, -h * 0.015)),
      Paint()..color = primary,
    );

    _drawMarking(canvas, bodyRect, primary, dark);

    for (var i = 0; i < genes.sparkles; i++) {
      final a = i * 2.3 + 0.6;
      _drawSparkle(
        canvas,
        Offset(cx + math.cos(a) * w * 0.26, h * 0.34 + math.sin(a) * h * 0.16),
        w * 0.045,
        Colors.white.withValues(alpha: 0.85),
      );
    }

    final eyeY = h * (mood == EidolonMood.anxious ? 0.48 : 0.50);
    final eyeDx = w * genes.eyeSpacing;
    final eyeR = w * 0.085;
    _drawEye(canvas, Offset(cx - eyeDx, eyeY), eyeR);
    _drawEye(canvas, Offset(cx + eyeDx, eyeY), eyeR);
    _drawBrows(canvas, cx, eyeDx, eyeR, eyeY, dark);

    if (mood == EidolonMood.calm || mood == EidolonMood.excited) {
      final cheek = Paint()
        ..color = const Color(0xFFF0997B).withValues(alpha: 0.5);
      canvas.drawCircle(
        Offset(cx - eyeDx * 1.5, eyeY + eyeR * 1.6),
        w * 0.045,
        cheek,
      );
      canvas.drawCircle(
        Offset(cx + eyeDx * 1.5, eyeY + eyeR * 1.6),
        w * 0.045,
        cheek,
      );
    }

    _drawMouth(canvas, Offset(cx, eyeY + h * 0.16), w, dark);
  }

  Rect _bodyRect(double w, double h, double cx) {
    final size = switch (genes.body) {
      BodyForm.round => const Size(0.70, 0.66),
      BodyForm.chubby => const Size(0.80, 0.62),
      BodyForm.slim => const Size(0.58, 0.72),
      BodyForm.teardrop => const Size(0.68, 0.68),
    };
    return Rect.fromCenter(
      center: Offset(cx, h * 0.54),
      width: w * size.width,
      height: h * size.height,
    );
  }

  Path _bodyPath(Rect r) {
    if (genes.body != BodyForm.teardrop) {
      return Path()..addOval(r);
    }
    // Teardrop: a pointed crown of the head with a round body.
    return Path()
      ..moveTo(r.center.dx, r.top - r.height * 0.12)
      ..quadraticBezierTo(r.right, r.top, r.right, r.center.dy)
      ..quadraticBezierTo(r.right, r.bottom, r.center.dx, r.bottom)
      ..quadraticBezierTo(r.left, r.bottom, r.left, r.center.dy)
      ..quadraticBezierTo(r.left, r.top, r.center.dx, r.top - r.height * 0.12)
      ..close();
  }

  void _drawCrown(
    Canvas canvas,
    double w,
    double h,
    double cx,
    Color primary,
    Color dark,
  ) {
    final p = Paint()..color = dark;
    switch (genes.crown) {
      case CrownType.none:
        break;
      case CrownType.ears:
        for (final s in const [-1, 1]) {
          final bx = cx + s * w * 0.16;
          canvas.drawPath(
            Path()
              ..moveTo(bx - 9, h * 0.30)
              ..lineTo(bx + s * 4, h * 0.11)
              ..lineTo(bx + 9, h * 0.30)
              ..close(),
            p,
          );
        }
      case CrownType.horns:
        for (final s in const [-1, 1]) {
          final bx = cx + s * w * 0.18;
          canvas.drawPath(
            Path()
              ..moveTo(bx - 7, h * 0.32)
              ..quadraticBezierTo(bx + s * 16, h * 0.10, bx + s * 22, h * 0.02)
              ..quadraticBezierTo(bx + s * 10, h * 0.16, bx + 7, h * 0.32)
              ..close(),
            p,
          );
        }
      case CrownType.antennae:
        final stalk = Paint()
          ..color = dark
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round;
        for (final s in const [-1, 1]) {
          final bx = cx + s * w * 0.12;
          canvas.drawLine(
            Offset(bx, h * 0.30),
            Offset(bx + s * 8, h * 0.06),
            stalk,
          );
          canvas.drawCircle(
            Offset(bx + s * 8, h * 0.05),
            w * 0.045,
            Paint()..color = primary,
          );
        }
      case CrownType.halo:
        canvas.drawOval(
          Rect.fromCenter(
            center: Offset(cx, h * 0.12),
            width: w * 0.42,
            height: h * 0.10,
          ),
          Paint()
            ..color = const Color(0xFFFFD479)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 3.5,
        );
    }
  }

  void _drawMarking(Canvas canvas, Rect body, Color primary, Color dark) {
    switch (genes.marking) {
      case Marking.none:
        break;
      case Marking.spots:
        final c = Paint()..color = dark.withValues(alpha: 0.55);
        for (final o in const [
          Offset(-0.18, 0.10),
          Offset(0.16, 0.02),
          Offset(0.0, 0.22),
        ]) {
          canvas.drawCircle(
            body.center.translate(o.dx * body.width, o.dy * body.height),
            body.width * 0.06,
            c,
          );
        }
      case Marking.belly:
        canvas.drawOval(
          Rect.fromCenter(
            center: body.center.translate(0, body.height * 0.20),
            width: body.width * 0.5,
            height: body.height * 0.4,
          ),
          Paint()
            ..color =
                Color.lerp(primary, Colors.white, 0.4)!.withValues(alpha: 0.7),
        );
      case Marking.stripe:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(
              center: body.center.translate(0, body.height * 0.05),
              width: body.width * 0.14,
              height: body.height * 0.7,
            ),
            const Radius.circular(6),
          ),
          Paint()..color = dark.withValues(alpha: 0.45),
        );
      case Marking.constellation:
        final dot = Paint()..color = Colors.white.withValues(alpha: 0.9);
        final line = Paint()
          ..color = Colors.white.withValues(alpha: 0.35)
          ..strokeWidth = 1.2;
        const stars = [
          Offset(-0.16, 0.18),
          Offset(0.02, 0.06),
          Offset(0.18, 0.20),
        ];
        Offset at(Offset o) =>
            body.center.translate(o.dx * body.width, o.dy * body.height);
        for (var i = 0; i < stars.length - 1; i++) {
          canvas.drawLine(at(stars[i]), at(stars[i + 1]), line);
        }
        for (final s in stars) {
          canvas.drawCircle(at(s), 2, dot);
        }
    }
  }

  void _drawBrows(
    Canvas canvas,
    double cx,
    double eyeDx,
    double eyeR,
    double eyeY,
    Color dark,
  ) {
    final paint = Paint()
      ..color = dark
      ..strokeWidth = 2.4
      ..strokeCap = StrokeCap.round;
    final browY = eyeY - eyeR - eyeR * 0.6;
    switch (mood) {
      case EidolonMood.anxious:
      case EidolonMood.melancholic:
        for (final s in const [-1, 1]) {
          canvas.drawLine(
            Offset(cx + s * (eyeDx - eyeR), browY + 3),
            Offset(cx + s * (eyeDx + eyeR), browY - 2),
            paint,
          );
        }
      case EidolonMood.focused:
        for (final s in const [-1, 1]) {
          canvas.drawLine(
            Offset(cx + s * (eyeDx - eyeR), browY - 2),
            Offset(cx + s * (eyeDx + eyeR), browY + 3),
            paint,
          );
        }
      default:
        break;
    }
  }

  void _drawEye(Canvas canvas, Offset c, double r) {
    final open = eyeOpen.clamp(0.0, 1.0);
    if (open < 0.12) {
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
    canvas.drawOval(
      Rect.fromCenter(center: c, width: r * 2 * narrow, height: r * 2 * open),
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
    final half = w * 0.10;
    if (mood == EidolonMood.excited) {
      canvas.drawArc(
        Rect.fromCenter(center: c, width: half * 1.6, height: half * 1.4),
        0,
        math.pi,
        true,
        Paint()..color = const Color(0xFF3A1726),
      );
      return;
    }
    final curve = switch (mood) {
      EidolonMood.calm => 0.7,
      EidolonMood.tired => -0.15,
      EidolonMood.anxious => -0.2,
      EidolonMood.melancholic => -0.6,
      _ => 0.0,
    };
    canvas.drawPath(
      Path()
        ..moveTo(c.dx - half, c.dy)
        ..quadraticBezierTo(c.dx, c.dy + half * curve, c.dx + half, c.dy),
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round,
    );
  }

  void _drawSparkle(Canvas canvas, Offset c, double r, Color color) {
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
  bool shouldRepaint(_EidolonFacePainter old) =>
      old.eyeOpen != eyeOpen ||
      old.glowPulse != glowPulse ||
      old.mood != mood ||
      old.genes != genes;
}
