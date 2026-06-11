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
    @Default({}) Map<String, dynamic> appearance,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _EidolonProfile;

  factory EidolonProfile.fromJson(Map<String, dynamic> json) =>
      _$EidolonProfileFromJson(json);

  double get levelProgress => xp / xpToNext;

  bool get isMaxLevel => level >= 100;
}
