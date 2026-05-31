import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart'
    hide AuthUser, OAuthProvider, User;

// ── Fakes ─────────────────────────────────────────────────────────────────────

/// Minimal Firebase User stub.
class _FakeFirebaseUser extends Fake implements User {
  _FakeFirebaseUser({
    required this.uid,
    this.email,
    this.displayName,
  });

  @override
  final String uid;

  @override
  final String? email;

  @override
  final String? displayName;

  @override
  Future<void> delete() async {}
}

/// FirebaseAuth fake that simulates requires-recent-login on delete.
class _FakeFirebaseAuth extends Fake implements FirebaseAuth {
  _FakeFirebaseAuth({
    this.currentUserValue,
    this.throwOnDelete = false,
  });

  final User? currentUserValue;
  final bool throwOnDelete;

  @override
  User? get currentUser => currentUserValue;

  @override
  Future<void> signOut() async {}
}

/// Overrides currentUser.delete() to throw requires-recent-login.
class _FakeUserRequiresRecentLogin extends _FakeFirebaseUser {
  _FakeUserRequiresRecentLogin() : super(uid: 'uid-1', email: 'x@y.com');

  @override
  Future<void> delete() async {
    throw FirebaseAuthException(code: 'requires-recent-login');
  }
}

/// SupabaseClient fake that records delete calls.
class _FakeSupabaseClient extends Fake implements SupabaseClient {
  bool deleteCalled = false;

  @override
  SupabaseQueryBuilder from(String table) => _FakeQuery(this);
}

class _FakeQuery extends Fake implements SupabaseQueryBuilder {
  _FakeQuery(this._client);
  final _FakeSupabaseClient _client;

  @override
  _FakeFilterBuilder delete() {
    _client.deleteCalled = true;
    return _FakeFilterBuilder();
  }

  @override
  _FakeFilterBuilder select([String columns = '*']) => _FakeFilterBuilder();

  @override
  Future<dynamic> upsert(dynamic values, {String? onConflict}) async => null;
}

class _FakeFilterBuilder extends Fake implements PostgrestFilterBuilder<dynamic> {
  @override
  PostgrestFilterBuilder<dynamic> eq(String column, dynamic value) => this;

  @override
  PostgrestFilterBuilder<dynamic> limit(int count, {String? referencedTable}) =>
      this;

  @override
  Future<List<Map<String, dynamic>>> then<R>(
    Function(List<Map<String, dynamic>>) onValue, {
    Function? onError,
  }) async {
    return <Map<String, dynamic>>[];
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('AuthRepositoryImpl.deleteAccount', () {
    test('returns ok and calls supabase delete when user exists', () async {
      final fakeUser = _FakeFirebaseUser(uid: 'uid-1', email: 'a@b.com');
      final fakeAuth = _FakeFirebaseAuth(currentUserValue: fakeUser);
      final fakeSupabase = _FakeSupabaseClient();

      final repo = AuthRepositoryImpl(fakeAuth, fakeSupabase);
      final result = await repo.deleteAccount();

      expect(result.isSuccess, isTrue);
      expect(fakeSupabase.deleteCalled, isTrue);
    });

    test('returns requiresRecentLogin when Firebase throws that code', () async {
      final fakeUser = _FakeUserRequiresRecentLogin();
      final fakeAuth = _FakeFirebaseAuth(currentUserValue: fakeUser);
      final fakeSupabase = _FakeSupabaseClient();

      final repo = AuthRepositoryImpl(fakeAuth, fakeSupabase);
      final result = await repo.deleteAccount();

      expect(result.isFailure, isTrue);
      expect(result.error, isA<RequiresRecentLoginError>());
    });

    test('returns ok when no current user', () async {
      final fakeAuth = _FakeFirebaseAuth();
      final fakeSupabase = _FakeSupabaseClient();

      final repo = AuthRepositoryImpl(fakeAuth, fakeSupabase);
      final result = await repo.deleteAccount();

      // No user → skip Supabase delete, skip Firebase delete → ok
      expect(result.isSuccess, isTrue);
    });
  });

  group('AuthRepositoryImpl.hasCompletedOnboarding', () {
    test('returns false when Supabase returns empty list', () async {
      final fakeAuth = _FakeFirebaseAuth();
      final fakeSupabase = _FakeSupabaseClient();

      final repo = AuthRepositoryImpl(fakeAuth, fakeSupabase);
      final result = await repo.hasCompletedOnboarding('uid-1');

      expect(result, isFalse);
    });
  });
}
