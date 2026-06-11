import 'package:freezed_annotation/freezed_annotation.dart';

part 'personality_profile.freezed.dart';
part 'personality_profile.g.dart';

/// Big Five (OCEAN) personality model — each trait 0-100.
@freezed
abstract class PersonalityProfile with _$PersonalityProfile {
  const PersonalityProfile._();

  const factory PersonalityProfile({
    @Default(50) int openness,
    @Default(50) int conscientiousness,
    @Default(50) int extraversion,
    @Default(50) int agreeableness,
    @Default(50) int neuroticism,
  }) = _PersonalityProfile;

  factory PersonalityProfile.fromJson(Map<String, dynamic> json) =>
      _$PersonalityProfileFromJson(json);

  // Derived helpers used by AI prompt template
  double get explorationBias => openness / 100.0;
  double get gearOptimizationRate => conscientiousness / 100.0;
  double get socialFrequency => extraversion / 100.0;
  double get guildContributionRate => agreeableness / 100.0;
  double get panicRate => neuroticism / 100.0;

  /// Apply a small delta from an emotion log event.
  /// Clamps each trait to [0, 100].
  PersonalityProfile applyEmotionDelta({double neuroticismDelta = 0.0}) {
    return copyWith(
      neuroticism: (neuroticism + (neuroticismDelta * 10).round()).clamp(0, 100),
    );
  }
}
