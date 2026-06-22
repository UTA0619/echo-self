import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/domain/repositories/auth_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthUser;

part 'auth_repository_impl.g.dart';

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) =>
    AuthRepositoryImpl(ref.watch(supabaseClientProvider));

/// Supabase-Auth–backed implementation. Identity, sessions, and the
/// public.users row (auto-provisioned by migration 008's trigger) all live in
/// Supabase — there is no Firebase dependency.
class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl(this._supabase);

  final SupabaseClient _supabase;

  GoTrueClient get _auth => _supabase.auth;

  // ── Email / password ──────────────────────────────────────────────────────

  @override
  Future<Result<AuthUser>> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _auth.signInWithPassword(
        email: email,
        password: password,
      );
      final user = res.user;
      if (user == null) {
        return err(const AppError.auth(message: 'Sign-in failed.'));
      }
      return ok(AuthUser.fromSupabase(user));
    } on AuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e)));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  @override
  Future<Result<AuthUser>> createAccount({
    required String email,
    required String password,
  }) async {
    try {
      final res = await _auth.signUp(email: email, password: password);
      final user = res.user;
      if (user == null) {
        return err(const AppError.auth(message: 'Sign-up failed.'));
      }
      // If the project requires email confirmation, signUp returns a user but
      // no session — surface a clear message instead of silently failing.
      if (res.session == null) {
        return err(
          const AppError.auth(
            message: 'Check your email to confirm your account, then sign in. '
                '(For development, disable "Confirm email" in Supabase → '
                'Authentication → Providers → Email.)',
          ),
        );
      }
      return ok(AuthUser.fromSupabase(user));
    } on AuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e)));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── OAuth ─────────────────────────────────────────────────────────────────

  @override
  Future<Result<AuthUser>> signInWithGoogle() => _oauth(OAuthProvider.google);

  @override
  Future<Result<AuthUser>> signInWithApple() => _oauth(OAuthProvider.apple);

  Future<Result<AuthUser>> _oauth(OAuthProvider provider) async {
    try {
      // Launches the provider flow (external browser / native sheet). The
      // session arrives via the auth state stream, so the user may not be
      // available synchronously here.
      await _auth.signInWithOAuth(provider);
      final user = _auth.currentUser;
      if (user == null) {
        return err(
          const AppError.auth(
            message: 'Continue in the browser to finish signing in.',
          ),
        );
      }
      return ok(AuthUser.fromSupabase(user));
    } on AuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e)));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────

  @override
  Future<Result<void>> signOut() async {
    try {
      await _auth.signOut();
      return ok(null);
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Delete account ──────────────────────────────────────────────────────--

  @override
  Future<Result<void>> deleteAccount() async {
    try {
      // Remove all user-owned data. The public.users row cascades to eidolons,
      // runs, gacha, etc. via FK ON DELETE CASCADE. Fully deleting the
      // auth.users record itself requires the service role, handled server-side
      // (Edge Function) before store launch; here we purge data and sign out.
      final uid = _auth.currentUser?.id;
      if (uid != null) {
        await _supabase.from('users').delete().eq('auth_uid', uid);
      }
      await _auth.signOut();
      return ok(null);
    } on PostgrestException catch (e) {
      return err(
        AppError.network(
          message: e.message,
          statusCode: int.tryParse(e.code ?? ''),
        ),
      );
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Re-authentication ─────────────────────────────────────────────────────

  @override
  Future<Result<void>> reauthenticateWithPassword({
    required String email,
    required String password,
  }) async {
    try {
      // Supabase has no separate "recent login" gate; re-signing in refreshes
      // the session, which is sufficient before sensitive actions.
      await _auth.signInWithPassword(email: email, password: password);
      return ok(null);
    } on AuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e)));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Onboarding check ──────────────────────────────────────────────────────

  @override
  Future<bool> hasCompletedOnboarding(String uid) async {
    try {
      // A signup auto-creates the users row (migration 008), so a users row is
      // NOT a reliable signal. Onboarding is complete once the player has
      // awakened their Eidolon. RLS scopes this query to the caller's rows.
      final rows = await _supabase.from('eidolons').select('id').limit(1);
      return (rows as List).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  static String _friendlyMessage(AuthException e) {
    final msg = e.message.toLowerCase();
    if (msg.contains('invalid login') || msg.contains('invalid credentials')) {
      return 'Incorrect email or password.';
    }
    if (msg.contains('already registered') ||
        msg.contains('already been registered')) {
      return 'An account with this email already exists.';
    }
    if (msg.contains('valid email') || msg.contains('invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.contains('password') && msg.contains('6')) {
      return 'Password must be at least 6 characters.';
    }
    if (msg.contains('rate limit') || msg.contains('too many')) {
      return 'Too many attempts. Please try again later.';
    }
    return e.message;
  }
}
