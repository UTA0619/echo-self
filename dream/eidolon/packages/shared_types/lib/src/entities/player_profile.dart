import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:shared_types/src/enums/subscription_tier.dart';

part 'player_profile.freezed.dart';
part 'player_profile.g.dart';

@freezed
abstract class PlayerProfile with _$PlayerProfile {
  const PlayerProfile._();

  const factory PlayerProfile({
    required String id,
    required String authUid,
    required String username,
    String? displayName,
    String? avatarUrl,
    @Default('UTC') String timezone,
    @Default('en') String language,
    @Default(SubscriptionTier.free) SubscriptionTier tier,
    @Default(false) bool healthSyncEnabled,
    @Default(true) bool emotionLogEnabled,
    required DateTime createdAt,
    required DateTime lastActive,
  }) = _PlayerProfile;

  factory PlayerProfile.fromJson(Map<String, dynamic> json) =>
      _$PlayerProfileFromJson(json);

  String get displayNameOrUsername => displayName ?? username;
  bool get isPremium => tier != SubscriptionTier.free;
}
