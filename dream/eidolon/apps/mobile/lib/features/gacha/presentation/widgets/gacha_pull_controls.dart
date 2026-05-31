import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:flutter/material.dart';

/// ×1 / ×10 summon buttons with affordance-aware disabled state.
class GachaPullButtons extends StatelessWidget {
  const GachaPullButtons({
    super.key,
    required this.crystals,
    required this.onSinglePull,
    required this.onTenPull,
  });

  final int crystals;
  final VoidCallback onSinglePull;
  final VoidCallback onTenPull;

  @override
  Widget build(BuildContext context) {
    final canSingle = crystals >= kSinglePullCost;
    final canTen = crystals >= kTenPullCost;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          // 10-pull (primary)
          SizedBox(
            width: double.infinity,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                boxShadow: canTen
                    ? [
                        BoxShadow(
                          color: EidolonColors.accent.withValues(alpha: 0.4),
                          blurRadius: 20,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
              child: ElevatedButton(
                onPressed: canTen ? onTenPull : null,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('💎', style: TextStyle(fontSize: 16)),
                    const SizedBox(width: 8),
                    Text(
                      '$kTenPullCost  ×10 Summon',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: Colors.white,
                            letterSpacing: 1,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          // Single pull
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: canSingle ? onSinglePull : null,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('💎', style: TextStyle(fontSize: 14)),
                  const SizedBox(width: 8),
                  Text(
                    '$kSinglePullCost  ×1 Summon',
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          letterSpacing: 1,
                        ),
                  ),
                ],
              ),
            ),
          ),
          if (!canSingle)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'You need at least $kSinglePullCost 💎 to summon.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: EidolonColors.warning,
                    ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Small "Buy Soul Crystals" button that opens [GachaBuyCrystalsSheet].
class GachaBuyCrystalsButton extends StatelessWidget {
  const GachaBuyCrystalsButton({super.key, required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: OutlinedButton.icon(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(44),
          side: BorderSide(
            color: EidolonColors.gold.withValues(alpha: 0.6),
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        icon: const Text('💎', style: TextStyle(fontSize: 14)),
        label: Text(
          'Buy Soul Crystals',
          style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: EidolonColors.gold,
              ),
        ),
      ),
    );
  }
}
