import 'dart:convert';

import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart'
    hide AuthUser, OAuthProvider, User;

// ── Firebase fakes ────────────────────────────────────────────────────────────
// Pure-Dart hand-rolled fakes (flutter_test's Fake throws on anything not
// overridden, which is exactly what we want for unused surface).

class _FakeUser extends Fake implements User {
  _FakeUser({
    this.uid = 'uid-1',
    String? email = 'kai@eidolon.app',
    this.displayName,
    this.deleteError,
    this.reauthError,
  }) : _email = email;

  @override
  final String uid;
  final String? _email;
  @override
  String? get email => _email;
  @override
  final String? displayName;
  @override
  String? get photoURL => null;
  @override
  bool get isAnonymous => false;

  final FirebaseAuthException? deleteError;
  final FirebaseAuthException? reauthError;
  bool deleteCalled = false;
  AuthCredential? lastReauthCredential;

  @override
  Future<void> delete() async {
    deleteCalled = true;
    if (deleteError != null) throw deleteError!;
  }

  @override
  Future<UserCredential> reauthenticateWithCredential(
    AuthCredential credential,
  ) async {
    lastReauthCredential = credential;
    if (reauthError != null) throw reauthError!;
    return _FakeUserCredential(this);
  }
}

class _FakeUserCredential extends Fake implements UserCredential {
  _FakeUserCredential(this._user);
  final User _user;
  @override
  User? get user => _user;
}

class _FakeFirebaseAuth extends Fake implements FirebaseAuth {
  _FakeFirebaseAuth({
    this.signInError,
    this.createError,
    _FakeUser? user,
  }) : user = user ?? _FakeUser();

  final _FakeUser user;
  final Object? signInError;
  final Object? createError;

  String? lastEmail;
  String? lastPassword;
  bool signOutCalled = false;
  _FakeUser? _currentUser;

  @override
  User? get currentUser => _currentUser;
  set currentUser(User? u) => _currentUser = u as _FakeUser?;

  @override
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    lastEmail = email;
    lastPassword = password;
    if (signInError != null) throw signInError!;
    _currentUser = user;
    return _FakeUserCredential(user);
  }

  @override
  Future<UserCredential> createUserWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    lastEmail = email;
    if (createError != null) throw createError!;
    _currentUser = user;
    return _FakeUserCredential(user);
  }

  @override
  Future<void> signOut() async {
    signOutCalled = true;
    _currentUser = null;
  }
}

// ── Supabase via real builder chain + MockClient ─────────────────────────────

class _SupabaseRecorder {
  final List<http.Request> requests = [];

  /// Body returned for GET (select) requests.
  String selectBody = '[]';

  /// When set, every request fails with this status.
  int? failStatus;

  SupabaseClient buildClient() {
    final mock = MockClient((request) async {
      requests.add(request);
      // postgrest's response parser dereferences response.request!, so the
      // originating request must be attached to every fake response.
      if (failStatus != null) {
        return http.Response(
          '{"message":"boom"}',
          failStatus!,
          request: request,
        );
      }
      if (request.method == 'GET') {
        return http.Response(
          selectBody,
          200,
          request: request,
          headers: {'content-type': 'application/json'},
        );
      }
      // upsert / delete
      return http.Response(
        '[]',
        200,
        request: request,
        headers: {'content-type': 'application/json'},
      );
    });
    return SupabaseClient(
      'http://localhost:54321',
      'test-key',
      httpClient: mock,
    );
  }

  http.Request? get only => requests.length == 1 ? requests.single : null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('signInWithEmail', () {
    test('success returns AuthUser and upserts the Supabase user record',
        () async {
      final auth = _FakeFirebaseAuth(
        user: _FakeUser(uid: 'uid-9', email: 'kai@eidolon.app'),
      );
      final recorder = _SupabaseRecorder();
      final repo = AuthRepositoryImpl(auth, recorder.buildClient());

      final result = await repo.signInWithEmail(
        email: 'kai@eidolon.app',
        password: 'hunter22',
      );

      expect(result.error, isNull);
      expect(result.value!.uid, 'uid-9');
      expect(result.value!.email, 'kai@eidolon.app');
      expect(auth.lastPassword, 'hunter22');

      // _ensureUserRecord → POST /rest/v1/users?on_conflict=auth_uid
      final req = recorder.only!;
      expect(req.method, 'POST');
      expect(req.url.path, endsWith('/users'));
      expect(req.url.queryParameters['on_conflict'], 'auth_uid');
      final body = jsonDecode(req.body) as Map<String, dynamic>;
      expect(body['auth_uid'], 'uid-9');
      // No displayName → username falls back to the email local part.
      expect(body['username'], 'kai');
    });

    test('username prefers the Firebase displayName when present', () async {
      final auth = _FakeFirebaseAuth(
        user: _FakeUser(displayName: 'Kai the Bold'),
      );
      final recorder = _SupabaseRecorder();
      final repo = AuthRepositoryImpl(auth, recorder.buildClient());

      await repo.signInWithEmail(email: 'a@b.c', password: 'p');

      final body = jsonDecode(recorder.only!.body) as Map<String, dynamic>;
      expect(body['username'], 'Kai the Bold');
    });

    test('username falls back to "adventurer" when no name and no email',
        () async {
      final auth = _FakeFirebaseAuth(user: _FakeUser(email: null));
      final recorder = _SupabaseRecorder();
      final repo = AuthRepositoryImpl(auth, recorder.buildClient());

      await repo.signInWithEmail(email: 'x@y.z', password: 'p');

      final body = jsonDecode(recorder.only!.body) as Map<String, dynamic>;
      expect(body['username'], 'adventurer');
    });

    test('a failing upsert is non-fatal — sign-in still succeeds', () async {
      final auth = _FakeFirebaseAuth();
      final recorder = _SupabaseRecorder()..failStatus = 500;
      final repo = AuthRepositoryImpl(auth, recorder.buildClient());

      final result = await repo.signInWithEmail(email: 'a@b.c', password: 'p');

      expect(result.error, isNull);
      expect(result.value, isNotNull);
    });

    for (final (code, message) in [
      ('user-not-found', 'No account found with this email.'),
      ('wrong-password', 'Incorrect email or password.'),
      ('invalid-credential', 'Incorrect email or password.'),
      ('invalid-email', 'Please enter a valid email address.'),
      ('user-disabled', 'This account has been disabled.'),
      ('too-many-requests', 'Too many attempts. Please try again later.'),
      ('network-request-failed', 'Network error. Check your connection.'),
      ('something-novel', 'Authentication failed. Please try again.'),
    ]) {
      test('FirebaseAuthException($code) → "$message"', () async {
        final auth = _FakeFirebaseAuth(
          signInError: FirebaseAuthException(code: code),
        );
        final repo =
            AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

        final result =
            await repo.signInWithEmail(email: 'a@b.c', password: 'p');

        expect(result.error, isA<AuthError>());
        expect((result.error! as AuthError).message, message);
      });
    }

    test('non-Firebase exception → UnknownError', () async {
      final auth = _FakeFirebaseAuth(signInError: StateError('weird'));
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result = await repo.signInWithEmail(email: 'a@b.c', password: 'p');

      expect(result.error, isA<UnknownError>());
    });
  });

  group('createAccount', () {
    test('success returns the new AuthUser', () async {
      final auth = _FakeFirebaseAuth();
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result =
          await repo.createAccount(email: 'new@eidolon.app', password: 'p');

      expect(result.error, isNull);
      expect(result.value!.uid, 'uid-1');
    });

    test('email-already-in-use maps to the friendly message', () async {
      final auth = _FakeFirebaseAuth(
        createError: FirebaseAuthException(code: 'email-already-in-use'),
      );
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result = await repo.createAccount(email: 'a@b.c', password: 'p');

      expect(
        (result.error! as AuthError).message,
        'An account with this email already exists.',
      );
    });

    test('weak-password maps to the friendly message', () async {
      final auth = _FakeFirebaseAuth(
        createError: FirebaseAuthException(code: 'weak-password'),
      );
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result = await repo.createAccount(email: 'a@b.c', password: 'p');

      expect(
        (result.error! as AuthError).message,
        'Password must be at least 6 characters.',
      );
    });
  });

  group('deleteAccount', () {
    test(
        'requires-recent-login from Firebase → RequiresRecentLoginError, '
        'after the Supabase cascade delete was issued', () async {
      final user = _FakeUser(
        uid: 'uid-del',
        deleteError: FirebaseAuthException(code: 'requires-recent-login'),
      );
      final auth = _FakeFirebaseAuth(user: user)..currentUser = user;
      final recorder = _SupabaseRecorder();
      final repo = AuthRepositoryImpl(auth, recorder.buildClient());

      final result = await repo.deleteAccount();

      expect(result.error, isA<RequiresRecentLoginError>());
      expect(user.deleteCalled, isTrue);

      final req = recorder.only!;
      expect(req.method, 'DELETE');
      expect(req.url.queryParameters['auth_uid'], 'eq.uid-del');
    });

    test('other FirebaseAuthException → friendly AuthError', () async {
      final user = _FakeUser(
        deleteError: FirebaseAuthException(code: 'user-disabled'),
      );
      final auth = _FakeFirebaseAuth(user: user)..currentUser = user;
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result = await repo.deleteAccount();

      expect(result.error, isA<AuthError>());
      expect(
        (result.error! as AuthError).message,
        'This account has been disabled.',
      );
    });
  });

  group('reauthenticateWithPassword', () {
    test('success passes an email credential to the current user', () async {
      final user = _FakeUser();
      final auth = _FakeFirebaseAuth(user: user)..currentUser = user;
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result = await repo.reauthenticateWithPassword(
        email: 'kai@eidolon.app',
        password: 'pw',
      );

      expect(result.error, isNull);
      expect(user.lastReauthCredential, isNotNull);
      expect(user.lastReauthCredential!.providerId, 'password');
    });

    test('wrong-password → friendly AuthError', () async {
      final user = _FakeUser(
        reauthError: FirebaseAuthException(code: 'wrong-password'),
      );
      final auth = _FakeFirebaseAuth(user: user)..currentUser = user;
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result = await repo.reauthenticateWithPassword(
        email: 'a@b.c',
        password: 'bad',
      );

      expect(
        (result.error! as AuthError).message,
        'Incorrect email or password.',
      );
    });

    test('no current user → succeeds as a no-op', () async {
      final auth = _FakeFirebaseAuth(); // currentUser stays null
      final repo = AuthRepositoryImpl(auth, _SupabaseRecorder().buildClient());

      final result = await repo.reauthenticateWithPassword(
        email: 'a@b.c',
        password: 'p',
      );

      expect(result.error, isNull);
    });
  });

  group('hasCompletedOnboarding', () {
    test('true when a users row exists', () async {
      final recorder = _SupabaseRecorder()..selectBody = '[{"id": 1}]';
      final repo =
          AuthRepositoryImpl(_FakeFirebaseAuth(), recorder.buildClient());

      expect(await repo.hasCompletedOnboarding('uid-1'), isTrue);

      final req = recorder.only!;
      expect(req.method, 'GET');
      expect(req.url.queryParameters['auth_uid'], 'eq.uid-1');
      expect(req.url.queryParameters['limit'], '1');
    });

    test('false when no row exists', () async {
      final recorder = _SupabaseRecorder(); // selectBody defaults to []
      final repo =
          AuthRepositoryImpl(_FakeFirebaseAuth(), recorder.buildClient());

      expect(await repo.hasCompletedOnboarding('uid-1'), isFalse);
    });

    test('false when the query throws', () async {
      final recorder = _SupabaseRecorder()..failStatus = 500;
      final repo =
          AuthRepositoryImpl(_FakeFirebaseAuth(), recorder.buildClient());

      expect(await repo.hasCompletedOnboarding('uid-1'), isFalse);
    });
  });
}
