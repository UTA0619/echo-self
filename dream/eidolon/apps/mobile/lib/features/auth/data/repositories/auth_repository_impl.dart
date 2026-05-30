import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/firebase/firebase_service.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/domain/repositories/auth_repository.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
// Hide Supabase types that clash with Firebase / our domain types
import 'package:supabase_flutter/supabase_flutter.dart'
    hide AuthUser, OAuthProvider, User;

part 'auth_repository_impl.g.dart';

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) => AuthRepositoryImpl(
      ref.watch(firebaseAuthProvider),
      ref.watch(supabaseClientProvider),
    );

class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl(this._auth, this._supabase);

  final FirebaseAuth _auth;
  final SupabaseClient _supabase;

  // ── Email / password ──────────────────────────────────────────────────────

  @override
  Future<Result<AuthUser>> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      final cred = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      await _ensureUserRecord(cred.user!);
      return ok(AuthUser.fromFirebase(cred.user!));
    } on FirebaseAuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e.code)));
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
      final cred = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      await _ensureUserRecord(cred.user!);
      return ok(AuthUser.fromFirebase(cred.user!));
    } on FirebaseAuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e.code)));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Google (v7 singleton API) ─────────────────────────────────────────────

  @override
  Future<Result<AuthUser>> signInWithGoogle() async {
    try {
      final googleAccount = await GoogleSignIn.instance.authenticate();
      final idToken = googleAccount.authentication.idToken;
      if (idToken == null) {
        return err(const AppError.auth(message: 'Google sign-in failed: no ID token'));
      }
      final credential = GoogleAuthProvider.credential(idToken: idToken);
      final cred = await _auth.signInWithCredential(credential);
      await _ensureUserRecord(cred.user!);
      return ok(AuthUser.fromFirebase(cred.user!));
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) {
        return err(const AppError.auth(message: 'Sign-in cancelled'));
      }
      return err(AppError.auth(message: e.description ?? 'Google sign-in failed'));
    } on FirebaseAuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e.code)));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Apple ─────────────────────────────────────────────────────────────────

  @override
  Future<Result<AuthUser>> signInWithApple() async {
    try {
      final rawNonce = _generateNonce();
      final nonce = _sha256(rawNonce);

      final appleCredential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: nonce,
      );

      final oauthCredential = OAuthProvider('apple.com').credential(
        idToken: appleCredential.identityToken,
        rawNonce: rawNonce,
      );

      final cred = await _auth.signInWithCredential(oauthCredential);
      await _ensureUserRecord(cred.user!);
      return ok(AuthUser.fromFirebase(cred.user!));
    } on FirebaseAuthException catch (e) {
      return err(AppError.auth(message: _friendlyMessage(e.code)));
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) {
        return err(const AppError.auth(message: 'Sign-in cancelled'));
      }
      return err(AppError.auth(message: e.message));
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────

  @override
  Future<Result<void>> signOut() async {
    try {
      await Future.wait([
        _auth.signOut(),
        GoogleSignIn.instance.signOut(),
      ]);
      return ok(null);
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────

  @override
  Future<Result<void>> deleteAccount() async {
    try {
      final uid = _auth.currentUser?.uid;
      if (uid != null) {
        // Delete all user data via Supabase cascade delete
        await _supabase.from('users').delete().eq('auth_uid', uid);
      }
      // Delete Firebase Auth user (must be recent sign-in; prompt re-auth if needed)
      await _auth.currentUser?.delete();
      // Sign out any remaining sessions
      await Future.wait([
        _auth.signOut(),
        GoogleSignIn.instance.signOut(),
      ]);
      return ok(null);
    } catch (e, st) {
      return err(AppError.unknown(error: e, stackTrace: st));
    }
  }

  // ── Onboarding check ──────────────────────────────────────────────────────

  @override
  Future<bool> hasCompletedOnboarding(String uid) async {
    try {
      final rows = await _supabase
          .from('users')
          .select('id')
          .eq('auth_uid', uid)
          .limit(1);
      return (rows as List).isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  Future<void> _ensureUserRecord(User user) async {
    try {
      await _supabase.from('users').upsert(
        {
          'auth_uid': user.uid,
          'email': user.email ?? '',
          'username':
              user.displayName ?? user.email?.split('@').first ?? 'adventurer',
          'last_active': DateTime.now().toIso8601String(),
        },
        onConflict: 'auth_uid',
      );
    } catch (_) {
      // Non-fatal — user record will be fully created during onboarding
    }
  }

  static String _friendlyMessage(String code) => switch (code) {
        'user-not-found' => 'No account found with this email.',
        'wrong-password' || 'invalid-credential' =>
          'Incorrect email or password.',
        'email-already-in-use' =>
          'An account with this email already exists.',
        'invalid-email' => 'Please enter a valid email address.',
        'weak-password' => 'Password must be at least 6 characters.',
        'user-disabled' => 'This account has been disabled.',
        'too-many-requests' => 'Too many attempts. Please try again later.',
        'network-request-failed' => 'Network error. Check your connection.',
        _ => 'Authentication failed. Please try again.',
      };

  static String _generateNonce([int length = 32]) {
    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._';
    final rng = Random.secure();
    return List.generate(length, (_) => chars[rng.nextInt(chars.length)])
        .join();
  }

  static String _sha256(String input) {
    final bytes = utf8.encode(input);
    return sha256.convert(bytes).toString();
  }
}
