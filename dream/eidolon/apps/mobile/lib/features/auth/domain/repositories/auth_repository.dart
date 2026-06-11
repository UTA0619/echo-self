import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';

abstract interface class AuthRepository {
  Future<Result<AuthUser>> signInWithEmail({
    required String email,
    required String password,
  });

  Future<Result<AuthUser>> createAccount({
    required String email,
    required String password,
  });

  Future<Result<AuthUser>> signInWithGoogle();

  Future<Result<AuthUser>> signInWithApple();

  Future<Result<void>> signOut();

  /// Permanently deletes the authenticated user's account and all associated
  /// data. Apple App Store requires this capability per guideline 5.1.1(v).
  /// Returns [AppError.requiresRecentLogin] if Firebase requires re-auth first.
  Future<Result<void>> deleteAccount();

  /// Re-authenticates the current user with their email password.
  /// Call this when [deleteAccount] returns [AppError.requiresRecentLogin].
  Future<Result<void>> reauthenticateWithPassword({
    required String email,
    required String password,
  });

  /// Returns true when the user has a profile record in Supabase (onboarding
  /// was completed at some point). Used to decide whether to route to
  /// onboarding or home after sign-in.
  Future<bool> hasCompletedOnboarding(String uid);
}
