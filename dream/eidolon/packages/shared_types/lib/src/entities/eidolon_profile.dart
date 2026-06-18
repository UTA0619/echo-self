import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:shared_types/src/entities/personality_profile.dart';
import 'package:shared_types/src/enums/eidolon_mood.dart';

part 'eidolon_profile.freezed.dart';
part 'eidolon_profile.g.dart';

@freezed
abstract class EidolonProfile with _$EidolonProfile {
  const EidolonProfile._();

  const factory EidolonProfile({
    required String id,
    required String userId,
    required String name,
    @Default(1) int level,
    @Default(0) int xp,
    @Default(1000) int xpToNext,
    required PersonalityProfile personality,
    @Default(10) int baseAtk,
    @Default(10) int baseDef,
    @Default(100) int baseHp,
    @Default(50) int baseMp,
    @Default(EidolonMood.calm) EidolonMood currentMood,
    @Default('balanced') String autoStrategy,
    // Bounded-autonomy guardrails (Doctrine D6). Conservative defaults mirror
    // migration 014 + backend guardrails.ts so an unset value never widens autonomy.
    @Default(40) int riskTolerance,
    @Default(30) int socialOpenness,
    @Default({}) Map<String, dynamic> appearance,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _EidolonProfile;

  factory EidolonProfile.fromJson(Map<String, dynamic> json) =>
      _$EidolonProfileFromJson(json);

  double get levelProgress => xp / xpToNext;

  bool get isMaxLevel => level >= 100;

  /// Clamp guardrails into the valid 0-100 range (defends against stray data).
  int get safeRiskTolerance => riskTolerance.clamp(0, 100);
  int get safeSocialOpenness => socialOpenness.clamp(0, 100);

  /// XP required to advance *from* [level] to the next. Cheap early levels for
  /// a fast first payoff, then a gently growing curve.
  static int xpToNextForLevel(int level) => 300 + (level - 1) * 450;

  /// Returns a copy with [amount] XP applied, cascading any level-ups. Each
  /// level grants stat growth so the player visibly gets stronger. Pure — the
  /// single source of truth for progression, so it can be unit-tested.
  EidolonProfile gainXp(int amount) {
    if (amount <= 0) return this;
    var lvl = level;
    var remaining = xp + amount;
    var atk = baseAtk, def = baseDef, hp = baseHp, mp = baseMp;
    var toNext = xpToNextForLevel(lvl);
    while (lvl < 100 && remaining >= toNext) {
      remaining -= toNext;
      lvl++;
      atk += 3;
      def += 2;
      hp += 25;
      mp += 10;
      toNext = xpToNextForLevel(lvl);
    }
    return copyWith(
      level: lvl,
      xp: lvl >= 100 ? 0 : remaining,
      xpToNext: toNext,
      baseAtk: atk,
      baseDef: def,
      baseHp: hp,
      baseMp: mp,
    );
  }
}
