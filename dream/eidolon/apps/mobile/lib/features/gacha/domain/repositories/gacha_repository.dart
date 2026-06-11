import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';

/// Soul Crystal bundle available for purchase.
class CrystalBundle {
  const CrystalBundle({
    required this.productId,
    required this.crystals,
    required this.displayPrice,
    required this.isBestValue,
  });

  final String productId;
  final int crystals;
  final String displayPrice;
  final bool isBestValue;
}

abstract interface class GachaRepository {
  /// Executes [count] pulls (1 or 10), deducts crystals, returns results.
  Future<Result<GachaPullResult>> pull({
    required String userId,
    required int count,
  });

  /// Returns the player's current soul crystal balance.
  Future<Result<int>> getCrystals(String userId);

  /// Returns recently pulled items (last 30), newest first.
  Future<Result<List<GachaItem>>> getPullHistory(String userId);

  /// Fetches available IAP crystal bundles from RevenueCat.
  Future<Result<List<CrystalBundle>>> getCrystalBundles();

  /// Purchases a crystal bundle via RevenueCat and credits the user's account.
  Future<Result<int>> purchaseCrystals({
    required String userId,
    required String productId,
  });
}
