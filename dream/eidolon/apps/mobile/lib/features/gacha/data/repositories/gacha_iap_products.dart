import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';

// ── IAP product IDs (must match App Store Connect / Play Console) ─────────────
const kGachaOffering = 'soul_crystals';
const kGachaProductSmall = 'eidolon.crystals.80';
const kGachaProductMedium = 'eidolon.crystals.500';
const kGachaProductLarge = 'eidolon.crystals.1800';
const kGachaProductMega = 'eidolon.crystals.5000';

/// Crystals granted for a given store product identifier.
int crystalsForProduct(String productId) => switch (productId) {
      kGachaProductSmall => 80,
      kGachaProductMedium => 500,
      kGachaProductLarge => 1800,
      kGachaProductMega => 5000,
      _ => 0,
    };

/// Static bundles shown when the store is unavailable, so the UI still renders.
List<CrystalBundle> fallbackCrystalBundles() => const [
      CrystalBundle(
        productId: kGachaProductSmall,
        crystals: 80,
        displayPrice: '\$0.99',
        isBestValue: false,
      ),
      CrystalBundle(
        productId: kGachaProductMedium,
        crystals: 500,
        displayPrice: '\$4.99',
        isBestValue: false,
      ),
      CrystalBundle(
        productId: kGachaProductLarge,
        crystals: 1800,
        displayPrice: '\$14.99',
        isBestValue: false,
      ),
      CrystalBundle(
        productId: kGachaProductMega,
        crystals: 5000,
        displayPrice: '\$39.99',
        isBestValue: true,
      ),
    ];
