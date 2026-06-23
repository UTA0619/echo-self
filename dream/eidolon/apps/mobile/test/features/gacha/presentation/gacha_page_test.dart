import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/pages/gacha_page.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

// ignore: always_use_package_imports
import '../../../helpers/test_app.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

Widget _wrap(Widget child, {GachaState? gachaState, AuthState? authState}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => child)],
  );
  return ProviderScope(
    overrides: [
      gachaNotifierProvider.overrideWith(
        () => _FakeGachaNotifier(
          gachaState ?? const GachaState(crystals: 500),
        ),
      ),
      authNotifierProvider.overrideWith(
        () => _FakeAuthNotifier(
          authState ??
              const AuthState(
                status: AuthStatus.authenticated,
                user: AuthUser(uid: 'uid-1', email: 'test@test.com'),
              ),
        ),
      ),
    ],
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: router,
    ),
  );
}

Widget _wrapWithNotifier(_FakeGachaNotifier notifier) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => const GachaPage())],
  );
  return ProviderScope(
    overrides: [
      gachaNotifierProvider.overrideWith(() => notifier),
      authNotifierProvider.overrideWith(
        () => _FakeAuthNotifier(
          const AuthState(
            status: AuthStatus.authenticated,
            user: AuthUser(uid: 'uid-1', email: 'test@test.com'),
          ),
        ),
      ),
    ],
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      routerConfig: router,
    ),
  );
}

GachaItem _item(GachaRarity r) =>
    kGachaCatalog.firstWhere((i) => i.rarity == r);

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  // Advance 1s so all Future.delayed timers (including the 720ms reveal timer)
  // are fired before we assert, then replace with SizedBox to cancel vsync tickers.
  Future<void> settle(WidgetTester tester) async {
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  }

  group('GachaPage — idle view', () {
    testWidgets('renders Summon title and crystal count', (tester) async {
      await tester.pumpWidget(_wrap(const GachaPage()));

      expect(find.text('Summon'), findsOneWidget);
      expect(find.text('500'), findsOneWidget);

      await settle(tester);
    });

    testWidgets('shows 10x and 1x summon buttons', (tester) async {
      await tester.pumpWidget(_wrap(const GachaPage()));

      expect(find.textContaining('×10 Summon'), findsOneWidget);
      expect(find.textContaining('×1 Summon'), findsOneWidget);

      await settle(tester);
    });

    testWidgets('buttons disabled when not enough crystals', (tester) async {
      await tester.pumpWidget(
        _wrap(const GachaPage(), gachaState: const GachaState(crystals: 50)),
      );

      expect(
        find.textContaining('100 💎 to summon'),
        findsOneWidget,
      );

      await settle(tester);
    });

    testWidgets('shows summon rates section', (tester) async {
      await tester.pumpWidget(_wrap(const GachaPage()));

      expect(find.text('SUMMON RATES'), findsOneWidget);
      expect(find.text('Legendary'), findsOneWidget);
      expect(find.text('Common'), findsOneWidget);

      await settle(tester);
    });
  });

  group('GachaPage — reveal view', () {
    testWidgets('shows single card and Continue button', (tester) async {
      final item = _item(GachaRarity.legendary);
      await tester.pumpWidget(
        _wrap(
          const GachaPage(),
          gachaState: GachaState(
            phase: GachaPhase.revealing,
            crystals: 400,
            lastResult: GachaPullResult(
              items: [item],
              pulledAt: DateTime.now(),
              crystalsSpent: kSinglePullCost,
            ),
          ),
        ),
      );
      await tester.pump();
      // The reveal opens with a hatch beat; let it crack open (auto-reveal).
      await tester.pump(const Duration(seconds: 3));
      await tester.pump();

      expect(find.text(item.name), findsOneWidget);
      expect(find.text('LEGENDARY'), findsAtLeastNWidgets(1));
      expect(find.text('Continue'), findsOneWidget);

      await settle(tester);
    });

    testWidgets('tapping Continue calls finishReveal', (tester) async {
      final notifier = _FakeGachaNotifier(
        GachaState(
          phase: GachaPhase.revealing,
          crystals: 400,
          lastResult: GachaPullResult(
            items: [_item(GachaRarity.common)],
            pulledAt: DateTime.now(),
            crystalsSpent: kSinglePullCost,
          ),
        ),
      );
      final router = GoRouter(
        initialLocation: '/',
        routes: [GoRoute(path: '/', builder: (_, __) => const GachaPage())],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gachaNotifierProvider.overrideWith(() => notifier),
            authNotifierProvider.overrideWith(
              () => _FakeAuthNotifier(
                const AuthState(
                  status: AuthStatus.authenticated,
                  user: AuthUser(uid: 'uid-1'),
                ),
              ),
            ),
          ],
          child: MaterialApp.router(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            supportedLocales: const [Locale('en')],
            routerConfig: router,
          ),
        ),
      );
      await tester.pump(); // one frame — widget is in tree
      // Crack the hatch open so the Continue button appears.
      await tester.pump(const Duration(seconds: 3));
      await tester.pump();

      await tester.tap(find.text('Continue'));
      await tester.pump();

      expect(notifier.finishRevealCalled, true);

      await settle(tester);
    });
  });

  group('GachaPage — pulling view', () {
    testWidgets('shows Summoning… text', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const GachaPage(),
          gachaState: const GachaState(phase: GachaPhase.pulling),
        ),
      );
      await tester.pump();

      expect(find.text('Summoning…'), findsOneWidget);

      await settle(tester);
    });
  });

  group('GachaPage — history', () {
    testWidgets('shows recent summons when history is non-empty',
        (tester) async {
      final history = kGachaCatalog.take(3).toList();
      await tester.pumpWidget(
        _wrap(
          const GachaPage(),
          gachaState: GachaState(crystals: 500, history: history),
        ),
      );
      await tester.pump();

      // RECENT SUMMONS may be below viewport — drag down to reveal it
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -600));
      await tester.pump();

      expect(find.text('RECENT SUMMONS'), findsOneWidget);

      await settle(tester);
    });
  });

  group('GachaPage — confirmation dialog', () {
    testWidgets('tapping ×1 Summon shows confirmation dialog', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const GachaPage(),
          gachaState: const GachaState(crystals: 500),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('100  ×1 Summon'));
      await tester
          .pump(); // open dialog (no pumpAndSettle — infinite animations)

      expect(find.text('Confirm this summon?'), findsOneWidget);

      await tester.tap(find.text('Cancel'));
      await tester.pump();

      await settle(tester);
    });

    testWidgets('confirming ×1 Summon calls pull(count:1)', (tester) async {
      final notifier = _FakeGachaNotifier(const GachaState(crystals: 500));
      await tester.pumpWidget(_wrapWithNotifier(notifier));
      await tester.pump();

      await tester.tap(find.text('100  ×1 Summon'));
      await tester.pump(); // open dialog

      // Tap the ElevatedButton 'Summon' in the dialog (not the page buttons)
      await tester.tap(find.widgetWithText(ElevatedButton, 'Summon'));
      await tester.pump(); // confirm

      expect(notifier.pullCalled, true);
      expect(notifier.lastPullCount, 1);

      await settle(tester);
    });

    testWidgets('shows Buy Soul Crystals button', (tester) async {
      await tester.pumpWidget(
        _wrap(
          const GachaPage(),
          gachaState: const GachaState(crystals: 0),
        ),
      );
      await tester.pump();

      expect(find.text('Buy Soul Crystals'), findsOneWidget);

      await settle(tester);
    });
  });
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeGachaNotifier extends GachaNotifier {
  _FakeGachaNotifier(this._initial);
  final GachaState _initial;
  bool finishRevealCalled = false;
  bool resetCalled = false;
  bool pullCalled = false;
  int? lastPullCount;

  @override
  GachaState build() => _initial;

  @override
  Future<void> pull({required int count}) async {
    pullCalled = true;
    lastPullCount = count;
  }

  @override
  void finishReveal() {
    finishRevealCalled = true;
    state = state.copyWith(phase: GachaPhase.done);
  }

  @override
  void reset() {
    resetCalled = true;
    state = state.copyWith(phase: GachaPhase.idle, lastResult: null);
  }
}

class _FakeAuthNotifier extends AuthNotifier {
  _FakeAuthNotifier(this._state);
  final AuthState _state;

  @override
  AuthState build() => _state;

  @override
  Future<void> deleteAccount() async {}
}
