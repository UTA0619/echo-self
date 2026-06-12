import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:flutter/material.dart';

/// Bottom sheet shown when the user taps "Buy Soul Crystals".
class GachaBuyCrystalsSheet extends StatelessWidget {
  const GachaBuyCrystalsSheet({
    super.key,
    required this.state,
    required this.notifier,
  });

  final GachaState state;
  final GachaNotifier notifier;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  context.l10n.gachaSoulCrystals,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        letterSpacing: 1.5,
                      ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              context.l10n.gachaPowerUp,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            if (state.isBuyingCrystals)
              const Center(child: CircularProgressIndicator())
            else if (state.bundles.isEmpty)
              Center(
                child: Text(
                  context.l10n.gachaStoreUnavailable,
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              )
            else
              ...state.bundles.map(
                (bundle) => GachaBundleTile(
                  bundle: bundle,
                  onTap: () {
                    Navigator.pop(context);
                    notifier.buyCrystals(bundle.productId);
                  },
                ),
              ),
            const SizedBox(height: 8),
            Text(
              context.l10n.gachaPriceDisclaimer,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: EidolonColors.textDim,
                    fontSize: 10,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Single IAP bundle row inside [GachaBuyCrystalsSheet].
class GachaBundleTile extends StatelessWidget {
  const GachaBundleTile({
    super.key,
    required this.bundle,
    required this.onTap,
  });

  final CrystalBundle bundle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: EidolonColors.background,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: bundle.isBestValue
                ? EidolonColors.gold.withValues(alpha: 0.6)
                : EidolonColors.border,
          ),
        ),
        child: Row(
          children: [
            const Text('💎', style: TextStyle(fontSize: 20)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.l10n.gachaCrystalsAmount(bundle.crystals),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  if (bundle.isBestValue)
                    Text(
                      context.l10n.gachaBestValue,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: EidolonColors.gold,
                            letterSpacing: 1,
                          ),
                    ),
                ],
              ),
            ),
            Text(
              bundle.displayPrice,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: EidolonColors.accentGlow,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
