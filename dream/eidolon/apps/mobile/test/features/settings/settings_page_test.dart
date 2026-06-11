import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/settings/presentation/pages/legal_page.dart';
import 'package:eidolon/features/settings/presentation/pages/settings_page.dart'
    show SettingsPage, settingsAppVersionProvider;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

// ignore: always_use_package_imports
import '../../helpers/test_app.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

AuthState _authState({AuthUser? user}) => AuthState(
      status: AuthStatus.authenticated,
      user: user ??
          const AuthUser(
            uid: 'uid-1',
            email: 'shadow@test.com',
            displayName: 'Shadow Walker',
          ),
    );

Widget _wrap(
  Widget child, {
  AuthState? auth,
}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => child)],
  );

  return ProviderScope(
    overrides: [
      authNotifierProvider.overrideWith(
        () => _FakeAuthNotifier(auth ?? _authState()),
      ),
      settingsAppVersionProvider.overrideWith((_) async => '0.1.0 (1)'),
    ],
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: router,
    ),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('SettingsPage', () {
    testWidgets('renders user displayName and email', (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      expect(find.text('Shadow Walker'), findsOneWidget);
      expect(find.text('shadow@test.com'), findsOneWidget);
    });

    testWidgets('shows avatar initial from displayName', (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      // 'S' is the first letter of 'Shadow Walker'
      expect(find.text('S'), findsOneWidget);
    });

    testWidgets('shows email prefix as name when displayName is absent',
        (tester) async {
      final auth = _authState(
        user: const AuthUser(uid: 'uid-2', email: 'warrior@test.com'),
      );
      await tester.pumpWidget(_wrap(const SettingsPage(), auth: auth));
      await tester.pumpAndSettle();

      expect(find.text('warrior'), findsOneWidget);
    });

    testWidgets('shows Adventurer when user is null', (tester) async {
      final auth = const AuthState(status: AuthStatus.authenticated);
      await tester.pumpWidget(_wrap(const SettingsPage(), auth: auth));
      await tester.pumpAndSettle();

      expect(find.text('Adventurer'), findsOneWidget);
    });

    testWidgets('renders Sign Out tile', (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      expect(find.text('Sign Out'), findsOneWidget);
    });

    testWidgets('renders app version when loaded', (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      expect(find.text('0.1.0 (1)'), findsOneWidget);
    });

    testWidgets('renders Privacy Policy and Terms tiles', (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      expect(find.text('Privacy Policy'), findsOneWidget);
      expect(find.text('Terms of Service'), findsOneWidget);
    });

    testWidgets('tapping Privacy Policy opens in-app legal page',
        (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Privacy Policy'));
      await tester.pumpAndSettle();

      expect(find.byType(LegalPage), findsOneWidget);
      // Heading is numbered ("1. Information We Collect") — match the substring.
      expect(find.textContaining('Information We Collect'), findsOneWidget);
    });

    testWidgets('tapping Terms of Service opens in-app legal page',
        (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Terms of Service'));
      await tester.pumpAndSettle();

      expect(find.byType(LegalPage), findsOneWidget);
      expect(find.text('1. Acceptance'), findsOneWidget);
    });

    testWidgets('renders Delete Account tile', (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      expect(find.text('Delete Account'), findsOneWidget);
    });

    testWidgets('tapping Delete Account shows confirmation dialog',
        (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Delete Account'));
      await tester.pumpAndSettle();

      expect(find.text('Delete Account?'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Delete'), findsOneWidget);
    });

    testWidgets('confirming Delete Account calls deleteAccount',
        (tester) async {
      final fakeNotifier = _FakeAuthNotifier(_authState());
      final router = GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, __) => const SettingsPage())],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith(() => fakeNotifier),
            settingsAppVersionProvider.overrideWith((_) async => '0.1.0 (1)'),
          ],
          child: MaterialApp.router(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            supportedLocales: const [Locale('en')],
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Delete Account'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();

      expect(fakeNotifier.deleteAccountCalled, true);
    });

    testWidgets('tapping Sign Out shows confirmation dialog', (tester) async {
      await tester.pumpWidget(_wrap(const SettingsPage()));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sign Out'));
      await tester.pumpAndSettle();

      expect(find.text('Sign Out?'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
    });

    testWidgets('cancelling sign out dialog does not call signOut',
        (tester) async {
      final fakeNotifier = _FakeAuthNotifier(_authState());
      final router = GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, __) => const SettingsPage())],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith(() => fakeNotifier),
            settingsAppVersionProvider.overrideWith((_) async => '0.1.0 (1)'),
          ],
          child: MaterialApp.router(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            supportedLocales: const [Locale('en')],
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sign Out'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(fakeNotifier.signOutCalled, false);
    });

    testWidgets('confirming sign out calls signOut', (tester) async {
      final fakeNotifier = _FakeAuthNotifier(_authState());
      final router = GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, __) => const SettingsPage())],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith(() => fakeNotifier),
            settingsAppVersionProvider.overrideWith((_) async => '0.1.0 (1)'),
          ],
          child: MaterialApp.router(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            supportedLocales: const [Locale('en')],
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sign Out'));
      await tester.pumpAndSettle();

      // Confirm in dialog — there are two "Sign Out" texts: the tile and the button
      final signOutButtons = find.text('Sign Out');
      await tester.tap(signOutButtons.last);
      await tester.pumpAndSettle();

      expect(fakeNotifier.signOutCalled, true);
    });
  });
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeAuthNotifier extends AuthNotifier {
  _FakeAuthNotifier(this._state);
  final AuthState _state;
  bool signOutCalled = false;
  bool deleteAccountCalled = false;

  @override
  AuthState build() => _state;

  @override
  Future<void> signOut() async {
    signOutCalled = true;
  }

  @override
  Future<void> deleteAccount() async {
    deleteAccountCalled = true;
  }
}
