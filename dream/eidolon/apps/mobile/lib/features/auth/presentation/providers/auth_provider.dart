import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/domain/usecases/create_account_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/delete_account_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_apple_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_email_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_google_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_out_usecase.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' show User;

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

    /// Set to true when deleteAccount() requires the user to re-authenticate.
    @Default(false) bool needsReAuth,
  }) = _AuthState;
}

@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  @override
  AuthState build() {
    // React to the Supabase auth session on every change.
    ref.listen(supabaseAuthStateProvider, (_, next) {
      next.when(
        data: _handleSupabaseUser,
        loading: () => state = const AuthState(status: AuthStatus.loading),
        error: (e, _) => state = state.copyWith(
          status: AuthStatus.unauthenticated,
          errorMessage: e.toString(),
        ),
      );
    });

    // Handle the session that already exists at startup (if any).
    Future.microtask(() {
      final current = ref.read(supabaseClientProvider).auth.currentUser;
      _handleSupabaseUser(current);
    });

    return const AuthState(status: AuthStatus.loading);
  }

  Future<void> _handleSupabaseUser(User? user) async {
    if (user == null) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    final authUser = AuthUser.fromSupabase(user);
    state = state.copyWith(status: AuthStatus.loading, user: authUser);

    final onboarded =
        await ref.read(authRepositoryProvider).hasCompletedOnboarding(user.id);

    state = state.copyWith(
      status:
          onboarded ? AuthStatus.authenticated : AuthStatus.onboardingRequired,
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
    // The auth stream transitions state to unauthenticated.
    state = state.copyWith(isLoading: false);
  }

  Future<void> deleteAccount() async {
    state =
        state.copyWith(isLoading: true, errorMessage: null, needsReAuth: false);
    final result = await ref.read(deleteAccountUseCaseProvider).call();
    if (!result.isSuccess) {
      final isReAuth = result.error is RequiresRecentLoginError;
      state = state.copyWith(
        isLoading: false,
        needsReAuth: isReAuth,
        errorMessage: isReAuth ? null : _errorMsg(result.error!),
      );
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  /// Re-authenticates with the password, then retries account deletion.
  Future<void> reauthenticateAndDelete({
    required String email,
    required String password,
  }) async {
    state =
        state.copyWith(isLoading: true, errorMessage: null, needsReAuth: false);
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
    final deleteResult = await ref.read(deleteAccountUseCaseProvider).call();
    if (!deleteResult.isSuccess) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _errorMsg(deleteResult.error!),
      );
    }
  }

  void clearError() => state = state.copyWith(errorMessage: null);

  /// Re-evaluates auth state against the current session.
  /// Call after operations that change profile completeness (e.g. onboarding).
  Future<void> refreshAuth() async {
    final user = ref.read(supabaseClientProvider).auth.currentUser;
    await _handleSupabaseUser(user);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  void _handleResult(Result<AuthUser> result) {
    if (result.isSuccess) {
      // The auth stream updates state — just clear loading.
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
