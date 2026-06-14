import 'package:supabase_flutter/supabase_flutter.dart' show User;

class AuthUser {
  const AuthUser({
    required this.uid,
    this.email,
    this.displayName,
    this.photoUrl,
    this.isAnonymous = false,
  });

  final String uid;
  final String? email;
  final String? displayName;
  final String? photoUrl;
  final bool isAnonymous;

  /// Builds an [AuthUser] from a Supabase auth [User]. Display name / avatar
  /// live in user metadata (set by OAuth providers or our own updates).
  factory AuthUser.fromSupabase(User user) => AuthUser(
        uid: user.id,
        email: user.email,
        displayName: (user.userMetadata?['full_name'] ??
            user.userMetadata?['name'] ??
            user.userMetadata?['display_name']) as String?,
        photoUrl: user.userMetadata?['avatar_url'] as String?,
        isAnonymous: user.isAnonymous,
      );

  String get nameOrFallback =>
      displayName ?? email?.split('@').first ?? 'Adventurer';
}
