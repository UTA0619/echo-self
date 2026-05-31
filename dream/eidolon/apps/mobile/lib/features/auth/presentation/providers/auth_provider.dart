import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/firebase/firebase_service.dart';
import 'package:eidolon/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/domain/usecases/create_account_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_apple_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_email_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_google_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/delete_account_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_out_usecase.dart';
// Hide Supabase's User type which clashes with Firebase's User
import 'package:firebase_auth/firebase_auth.dart' hide OAuthProvider;
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_provider.freezed.dart';
part 'auth_provider.g.dart';

enum AuthStatus { loading, unauthenticated, onboardingRequired, authenticated }

@freezed
abstract class AuthState with _$AuthState {
  const factory AuthState({
    @Default(AuthStatus.loading) AuthStatus status,
    AuthUser? user,
    @Default(false) bool isLoading,
    String? errorMessage,
    /// Set to true when deleteAccount() fails with requiresRecentLogin.
    /// The UI should show a re-authentication dialog then call
    /// reauthenticateAndDelete().
    @Default(false) bool needsReAuth,
  }) = _AuthState;
}

@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  @override
  AuthState build() {
    // React to Firebase auth stream on every change
    ref.listen(authStateChangesProvider, (_, next) {
      next.when(
        data: _handleFirebaseUser,
        loading: () => state = const AuthState(status: AuthStatus.loading),
        error: (e, _) => state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: e.toString(),
        ),
      );
    });

    // Also handle the current value (stream may already have emitted)
    Future.microtask(() {
      final current = ref.read(authStateChangesProvider);
      current.whenData(_handleFirebaseUser);
    });

    return const AuthState(status: AuthStatus.loading);
  }

  Future<void> _handleFirebaseUser(User? user) async {
    if (user == null) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    final authUser = AuthUser.fromFirebase(user);
    state = state.copyWith(status: AuthStatus.loading, user: authUser);

    final hasProfile =
        await ref.read(authRepositoryProvider).hasCompletedOnboarding(user.uid);

    state = state.copyWith(
      status:
          hasProfile ? AuthStatus.authenticated : AuthStatus.onboardingRequired,
      user: authUser,
      errorMessage: null,
    );
  }

  // ── Public actions ────────────────────────────────────────────────────────

  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await ref
        .read(signInWithEmailUseCaseProvider)
        .call(email: email, password: password);
    _handleResult(result);
  }

  Future<void> createAccount({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await ref
        .read(createAccountUseCaseProvider)
        .call(email: email, password: password);
    _handleResult(result);
  }

  Future<void> signInWithGoogle() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await ref.read(signInWithGoogleUseCaseProvider).call();
    _handleResult(result);
  }

  Future<void> signInWithApple() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    final result = await ref.read(signInWithAppleUseCaseProvider).call();
    _handleResult(result);
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    await ref.read(signOutUseCaseProvider).call();
    // Firebase stream will trigger state update via _handleFirebaseUser(null)
    state = state.copyWith(isLoading: false);
  }

  Future<void> deleteAccount() async {
    state = state.copyWith(isLoading: true, errorMessage: null, needsReAuth: false);
    final result = await ref.read(deleteAccountUseCaseProvider).call();
    if (!result.isSuccess) {
      final isReAuth = result.error is RequiresRecentLoginError;
      state = state.copyWith(
        isLoading: false,
        needsReAuth: isReAuth,
        errorMessage: isReAuth ? null : _errorMsg(result.error!),
      );
    }
    // On success, Firebase stream will transition state to unauthenticated
  }

  /// Re-authenticates the current user with their password, then immediately
  /// retries account deletion. Call when [AuthState.needsReAuth] is true.
  Future<void> reauthenticateAndDelete({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null, needsReAuth: false);
    final reAuthResult = await ref
        .read(authRepositoryProvider)
        .reauthenticateWithPassword(email: email, password: password);
    if (!reAuthResult.isSuccess) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _errorMsg(reAuthResult.error!),
      );
      return;
    }
    // Re-auth succeeded — retry deletion
    final deleteResult = await ref.read(deleteAccountUseCaseProvider).call();
    if (!deleteResult.isSuccess) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _errorMsg(deleteResult.error!),
      );
    }
    // On success, Firebase stream transitions to unauthenticated
  }

  void clearError() => state = state.copyWith(errorMessage: null);

  /// Re-evaluates auth state against the current Firebase user.
  /// Call this after operations that change profile completeness (e.g. onboarding).
  Future<void> refreshAuth() async {
    final user = ref.read(firebaseAuthProvider).currentUser;
    await _handleFirebaseUser(user);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  void _handleResult(Result<AuthUser> result) {
    if (result.isSuccess) {
      // Firebase stream will update state — just clear loading
      state = state.copyWith(isLoading: false);
    } else {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _errorMsg(result.error!),
      );
    }
  }

  static String _errorMsg(AppError error) => switch (error) {
        AuthError(:final message) => message,
        NetworkError(:final message) => message,
        RequiresRecentLoginError() =>
          'Please sign in again to complete this action.',
        _ => error.toString(),
      };
}
