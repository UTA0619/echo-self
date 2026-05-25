import 'dart:math';

import 'package:eidolon/features/reality_sync/domain/entities/health_snapshot.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'reality_sync_bonus.g.dart';
part 'reality_sync_bonus.freezed.dart';

@freezed
abstract class RealitySyncBonus with _$RealitySyncBonus {
  const factory RealitySyncBonus({
    required int atkBonus,
    required int hpPercent,
    required int expBonus,
    required int syncScore,
  }) = _RealitySyncBonus;

  factory RealitySyncBonus.fromJson(Map<String, dynamic> json) =>
      _$RealitySyncBonusFromJson(json);
}

RealitySyncBonus bonusFromSnapshot(HealthSnapshot s) {
  // ATK: +2 per 1000 steps, capped at +20
  final atk = min(20, (s.stepsToday ~/ 1000) * 2);
  // HP: 100% if ≥7h sleep, 50% if ≥5h, 0% otherwise
  final hp = s.sleepHoursLast >= 7.0
      ? 100
      : s.sleepHoursLast >= 5.0
          ? 50
          : 0;
  // EXP: +5 per 100 kcal burned, capped at +50
  final exp = min(50, (s.caloriesBurned / 100).floor() * 5);
  // Overall sync score: weighted average (ATK 40%, HP 40%, EXP 20%)
  final score = (atk / 20.0 * 40 + hp / 100.0 * 40 + exp / 50.0 * 20).round();
  return RealitySyncBonus(
    atkBonus: atk,
    hpPercent: hp,
    expBonus: exp,
    syncScore: score,
  );
}
