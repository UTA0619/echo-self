import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Animated soul-core orb shown during welcome and awakening screens.
class EidolonOrb extends StatelessWidget {
  const EidolonOrb({
    super.key,
    this.size = 160,
    this.isAwakening = false,
  });

  final double size;
  final bool isAwakening;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer glow ring
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  EidolonColors.accent.withValues(alpha: 0.15),
                  EidolonColors.soulCore.withValues(alpha: 0.05),
                  Colors.transparent,
                ],
              ),
            ),
          ).animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(
                begin: 0.9,
                end: 1.1,
                duration: 3.seconds,
                curve: Curves.easeInOut,
              ),

          // Mid ring
          Container(
            width: size * 0.7,
            height: size * 0.7,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: EidolonColors.accent.withValues(alpha: 0.4),
                width: 1,
              ),
            ),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(
                begin: 0.95,
                end: 1.05,
                duration: 2.seconds,
                curve: Curves.easeInOut,
              )
              .rotate(
                begin: 0,
                end: 0.05,
                duration: 4.seconds,
                curve: Curves.linear,
              ),

          // Core
          Container(
            width: size * 0.45,
            height: size * 0.45,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  EidolonColors.soulCore,
                  EidolonColors.accent,
                  EidolonColors.accentDim,
                ],
                stops: const [0.0, 0.5, 1.0],
              ),
              boxShadow: [
                BoxShadow(
                  color: EidolonColors.soulCore.withValues(alpha: 0.6),
                  blurRadius: 24,
                  spreadRadius: 4,
                ),
                BoxShadow(
                  color: EidolonColors.accent.withValues(alpha: 0.4),
                  blurRadius: 40,
                  spreadRadius: 8,
                ),
              ],
            ),
          )
              .animate(onPlay: (c) => c.repeat(reverse: true))
              .scaleXY(
                begin: 0.92,
                end: 1.08,
                duration: 2500.ms,
                curve: Curves.easeInOut,
              )
              .then()
              .animate(target: isAwakening ? 1 : 0)
              .scaleXY(end: 1.6, duration: 800.ms, curve: Curves.easeOut)
              .fadeOut(begin: 1, duration: 600.ms, delay: 400.ms),
        ],
      ),
    );
  }
}
