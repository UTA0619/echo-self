import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class CrystalCounter extends StatelessWidget {
  const CrystalCounter({super.key, required this.count, this.isLoading = false});

  final int count;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: isLoading ? 'Soul Crystals loading' : 'Soul Crystals: $count',
      child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: EidolonColors.surfaceElevated,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: EidolonColors.soulCore.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '💎',
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(width: 6),
          isLoading
              ? const SizedBox(
                  width: 40,
                  height: 14,
                  child: LinearProgressIndicator(
                    backgroundColor: EidolonColors.border,
                  ),
                )
              : Text(
                  count.toString(),
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: EidolonColors.soulCore,
                        fontWeight: FontWeight.w700,
                      ),
                ).animate(key: ValueKey(count)).fadeIn(duration: 250.ms),
        ],
      ),
    ),
    );
  }
}

