import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'gacha_pull_result.freezed.dart';

@freezed
abstract class GachaPullResult with _$GachaPullResult {
  const factory GachaPullResult({
    required List<GachaItem> items,
    required DateTime pulledAt,
    required int crystalsSpent,
  }) = _GachaPullResult;
}

const int kSinglePullCost = 100;
const int kTenPullCost = 900;
