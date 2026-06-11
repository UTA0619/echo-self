import 'package:shared_types/shared_types.dart';

abstract final class PlayerProfileModel {
  static PlayerProfile fromRow(Map<String, dynamic> row) => PlayerProfile(
        id: row['id'] as String,
        authUid: row['auth_uid'] as String,
        username: row['username'] as String,
        displayName: row['display_name'] as String?,
        avatarUrl: row['avatar_url'] as String?,
        timezone: row['timezone'] as String? ?? 'UTC',
        language: row['language'] as String? ?? 'en',
        tier: SubscriptionTier.fromValue(
          row['subscription_tier'] as String? ?? 'free',
        ),
        healthSyncEnabled: row['health_sync_enabled'] as bool? ?? false,
        emotionLogEnabled: row['emotion_log_enabled'] as bool? ?? true,
        createdAt: DateTime.parse(row['created_at'] as String),
        lastActive: DateTime.parse(row['last_active'] as String),
      );
}
