import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/pages/login_page.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../helpers/test_app.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

Widget _wrap({AuthState? authState, _FakeAuthNotifier? notifier}) {
  final fakeNotifier =
      notifier ?? _FakeAuthNotifier(authState ?? const AuthState());
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => const LoginPage())],
  );
  return ProviderScope(
    overrides: [
      authNotifierProvider.overrideWith(() => fakeNotifier),
    ],
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: router,
    ),
  );
}

Future<void> _settle(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 1));
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pump();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('LoginPage — initial state', () {
    testWidgets('renders email and password fields', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      expect(find.byType(TextFormField), findsAtLeastNWidgets(2));

      await _settle(tester);
    });

    testWidgets('shows Sign In button by default', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      expect(find.text('Sign In'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows Google sign-in button', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      expect(find.textContaining('Google'), findsOneWidget);

      await _settle(tester);
    });
  });

  group('LoginPage — form validation', () {
    testWidgets('shows error when email is empty on submit', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(find.text('Email is required'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows error when password is empty on submit', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      await tester.enterText(
        find.byType(TextFormField).first,
        'test@test.com',
      );
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(find.text('Password is required'), findsOneWidget);

      await _settle(tester);
    });
  });

  group('LoginPage — sign in flow', () {
    testWidgets('submitting valid form calls signInWithEmail', (tester) async {
      final notifier = _FakeAuthNotifier(const AuthState());
      await tester.pumpWidget(_wrap(notifier: notifier));
      await tester.pump();

      final fields = find.byType(TextFormField);
      await tester.enterText(fields.first, 'hero@test.com');
      await tester.enterText(fields.last, 'password123');
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      expect(notifier.signInCalled, true);
      expect(notifier.lastEmail, 'hero@test.com');

      await _settle(tester);
    });
  });

  group('LoginPage — loading state', () {
    testWidgets('shows loading indicator when isLoading is true', (tester) async {
      await tester.pumpWidget(
        _wrap(authState: const AuthState(isLoading: true)),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await _settle(tester);
    });
  });
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeAuthNotifier extends AuthNotifier {
  _FakeAuthNotifier(this._state);
  final AuthState _state;
  bool signInCalled = false;
  bool createAccountCalled = false;
  String? lastEmail;

  @override
  AuthState build() => _state;

  @override
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    signInCalled = true;
    lastEmail = email;
    state = state.copyWith(
      status: AuthStatus.authenticated,
      user: AuthUser(uid: 'uid-1', email: email),
    );
  }

  @override
  Future<void> createAccount({
    required String email,
    required String password,
  }) async {
    createAccountCalled = true;
    lastEmail = email;
  }

  @override
  Future<void> signInWithGoogle() async {}

  @override
  Future<void> signInWithApple() async {}

  @override
  Future<void> signOut() async {}

  @override
  Future<void> deleteAccount() async {}

  @override
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}
