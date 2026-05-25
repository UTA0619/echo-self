import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';

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
}
