import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/domain/repositories/auth_repository.dart';
import 'package:eidolon/features/auth/domain/usecases/create_account_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/delete_account_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_apple_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_email_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_in_with_google_usecase.dart';
import 'package:eidolon/features/auth/domain/usecases/sign_out_usecase.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/core/firebase/firebase_service.dart';
import 'package:eidolon/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeAuthRepo implements AuthRepository {
  _FakeAuthRepo({
    this.signInEmailResult,
    this.createAccountResult,
    this.signInGoogleResult,
    this.signInAppleResult,
    this.deleteAccountResult,
    this.reauthResult,
  });

  final Result<AuthUser>? signInEmailResult;
  final Result<AuthUser>? createAccountResult;
  final Result<AuthUser>? signInGoogleResult;
  final Result<AuthUser>? signInAppleResult;
  final Result<void>? deleteAccountResult;

  /// Result returned by [reauthenticateWithPassword].
  final Result<void>? reauthResult;

  bool deleteAccountCalled = false;
  bool reauthCalled = false;

  @override
  Future<Result<AuthUser>> signInWithEmail({
    required String email,
    required String password,
  }) async =>
      signInEmailResult ?? err(const AppError.auth(message: 'not set'));

  @override
  Future<Result<AuthUser>> createAccount({
    required String email,
    required String password,
  }) async =>
      createAccountResult ?? err(const AppError.auth(message: 'not set'));

  @override
  Future<Result<AuthUser>> signInWithGoogle() async =>
      signInGoogleResult ?? err(const AppError.auth(message: 'not set'));

  @override
  Future<Result<AuthUser>> signInWithApple() async =>
      signInAppleResult ?? err(const AppError.auth(message: 'not set'));

  @override
  Future<Result<void>> signOut() async => ok(null);

  @override
  Future<Result<void>> deleteAccount() async {
    deleteAccountCalled = true;
    return deleteAccountResult ?? ok(null);
  }

  @override
  Future<Result<void>> reauthenticateWithPassword({
    required String email,
    required String password,
  }) async {
    reauthCalled = true;
    return reauthResult ?? ok(null);
  }

  @override
  Future<bool> hasCompletedOnboarding(String uid) async => false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

AuthUser _makeUser({String uid = 'uid-1', String? email = 'test@test.com'}) =>
    AuthUser(uid: uid, email: email);

ProviderContainer _makeContainer(_FakeAuthRepo repo) {
  return ProviderContainer(
    overrides: [
      authRepositoryProvider.overrideWithValue(repo),
      signInWithEmailUseCaseProvider.overrideWith(
        (ref) => SignInWithEmailUseCase(repo),
      ),
      createAccountUseCaseProvider.overrideWith(
        (ref) => CreateAccountUseCase(repo),
      ),
      signInWithGoogleUseCaseProvider.overrideWith(
        (ref) => SignInWithGoogleUseCase(repo),
      ),
      signInWithAppleUseCaseProvider.overrideWith(
        (ref) => SignInWithAppleUseCase(repo),
      ),
      signOutUseCaseProvider.overrideWith(
        (ref) => SignOutUseCase(repo),
      ),
      deleteAccountUseCaseProvider.overrideWith(
        (ref) => DeleteAccountUseCase(repo),
      ),
      // Provide a stream that never emits so the auth listener never fires
      authStateChangesProvider.overrideWith(
        (ref) => const Stream<User?>.empty(),
      ),
    ],
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  group('AuthNotifier', () {
    test('initial state is loading', () {
      final container = _makeContainer(_FakeAuthRepo());
      addTearDown(container.dispose);
      expect(
        container.read(authNotifierProvider).status,
        AuthStatus.loading,
      );
    });

    test('signInWithEmail on success clears loading', () async {
      final repo = _FakeAuthRepo(
        signInEmailResult: ok(_makeUser()),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).signInWithEmail(
            email: 'test@test.com',
            password: 'pass123',
          );

      final state = container.read(authNotifierProvider);
      expect(state.isLoading, false);
      expect(state.errorMessage, isNull);
    });

    test('signInWithEmail on failure sets errorMessage', () async {
      final repo = _FakeAuthRepo(
        signInEmailResult:
            err(const AppError.auth(message: 'Incorrect password.')),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).signInWithEmail(
            email: 'test@test.com',
            password: 'wrong',
          );

      final state = container.read(authNotifierProvider);
      expect(state.errorMessage, 'Incorrect password.');
      expect(state.isLoading, false);
    });

    test('createAccount on success clears loading', () async {
      final repo = _FakeAuthRepo(
        createAccountResult: ok(_makeUser()),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).createAccount(
            email: 'new@test.com',
            password: 'pass123',
          );

      expect(container.read(authNotifierProvider).isLoading, false);
      expect(container.read(authNotifierProvider).errorMessage, isNull);
    });

    test('createAccount on failure sets errorMessage', () async {
      final repo = _FakeAuthRepo(
        createAccountResult: err(
          const AppError.auth(
            message: 'An account with this email already exists.',
          ),
        ),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).createAccount(
            email: 'existing@test.com',
            password: 'pass123',
          );

      expect(
        container.read(authNotifierProvider).errorMessage,
        'An account with this email already exists.',
      );
    });

    test('signInWithGoogle on failure sets errorMessage', () async {
      final repo = _FakeAuthRepo(
        signInGoogleResult:
            err(const AppError.auth(message: 'Sign-in cancelled')),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).signInWithGoogle();

      expect(
        container.read(authNotifierProvider).errorMessage,
        'Sign-in cancelled',
      );
    });

    test('signInWithApple on failure sets errorMessage', () async {
      final repo = _FakeAuthRepo(
        signInAppleResult:
            err(const AppError.auth(message: 'Sign-in cancelled')),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).signInWithApple();

      expect(
        container.read(authNotifierProvider).errorMessage,
        'Sign-in cancelled',
      );
    });

    test('signOut clears loading state', () async {
      final container = _makeContainer(_FakeAuthRepo());
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).signOut();

      expect(container.read(authNotifierProvider).isLoading, false);
    });

    test('clearError removes errorMessage', () async {
      final repo = _FakeAuthRepo(
        signInEmailResult: err(const AppError.auth(message: 'err')),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).signInWithEmail(
            email: 'a@b.com',
            password: 'p',
          );
      expect(
        container.read(authNotifierProvider).errorMessage,
        isNotNull,
      );

      container.read(authNotifierProvider.notifier).clearError();
      expect(container.read(authNotifierProvider).errorMessage, isNull);
    });

    test('deleteAccount on success clears loading', () async {
      final repo = _FakeAuthRepo(deleteAccountResult: ok(null));
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).deleteAccount();

      expect(container.read(authNotifierProvider).isLoading, false);
      expect(container.read(authNotifierProvider).errorMessage, isNull);
      expect(repo.deleteAccountCalled, true);
    });

    test('deleteAccount on failure sets errorMessage', () async {
      final repo = _FakeAuthRepo(
        deleteAccountResult: err(
          const AppError.unknown(error: 'deletion failed'),
        ),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).deleteAccount();

      expect(container.read(authNotifierProvider).isLoading, false);
      expect(container.read(authNotifierProvider).errorMessage, isNotNull);
    });

    test('deleteAccount sets needsReAuth when requiresRecentLogin', () async {
      final repo = _FakeAuthRepo(
        deleteAccountResult: err(const AppError.requiresRecentLogin()),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).deleteAccount();

      final state = container.read(authNotifierProvider);
      expect(state.needsReAuth, isTrue);
      expect(state.errorMessage, isNull);
      expect(state.isLoading, false);
    });

    test('reauthenticateAndDelete calls repo and clears needsReAuth', () async {
      // First deletion fails with requiresRecentLogin
      final repo = _FakeAuthRepo(
        deleteAccountResult: err(const AppError.requiresRecentLogin()),
        reauthResult: ok(null),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).deleteAccount();
      expect(container.read(authNotifierProvider).needsReAuth, isTrue);

      // Simulate re-auth: we need a separate repo that succeeds on delete
      // Since deleteAccountResult is fixed, the second delete also returns
      // requiresRecentLogin, but reauthCalled should be true regardless.
      await container
          .read(authNotifierProvider.notifier)
          .reauthenticateAndDelete(
            email: 'test@test.com',
            password: 'password',
          );

      expect(repo.reauthCalled, isTrue);
      expect(container.read(authNotifierProvider).needsReAuth, isFalse);
    });

    test('reauthenticateAndDelete sets errorMessage on reauth failure',
        () async {
      final repo = _FakeAuthRepo(
        reauthResult: err(const AppError.auth(message: 'Wrong password.')),
      );
      final container = _makeContainer(repo);
      addTearDown(container.dispose);

      await container
          .read(authNotifierProvider.notifier)
          .reauthenticateAndDelete(
            email: 'test@test.com',
            password: 'wrong',
          );

      final state = container.read(authNotifierProvider);
      expect(state.errorMessage, 'Wrong password.');
      expect(state.isLoading, false);
    });
  });

  group('AuthUser', () {
    test('nameOrFallback returns displayName when set', () {
      const u = AuthUser(uid: '1', displayName: 'Shadow');
      expect(u.nameOrFallback, 'Shadow');
    });

    test('nameOrFallback returns email prefix when no displayName', () {
      const u = AuthUser(uid: '1', email: 'warrior@test.com');
      expect(u.nameOrFallback, 'warrior');
    });

    test('nameOrFallback returns Adventurer as last resort', () {
      const u = AuthUser(uid: '1');
      expect(u.nameOrFallback, 'Adventurer');
    });
  });
}
