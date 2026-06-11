import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/dungeon/domain/entities/dungeon_run.dart';
import 'package:eidolon/features/dungeon/presentation/pages/dungeon_page.dart';
import 'package:eidolon/features/dungeon/presentation/providers/dungeon_provider.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_types/shared_types.dart';

// ignore: always_use_package_imports
import '../../../helpers/test_app.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

Widget _wrap({
  DungeonState? dungeonState,
  EidolonState? eidolonState,
}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => const DungeonPage())],
  );
  return ProviderScope(
    overrides: [
      dungeonNotifierProvider.overrideWith(
        () => _FakeDungeonNotifier(
          dungeonState ?? const DungeonState(),
        ),
      ),
      eidolonNotifierProvider.overrideWith(
        () => _FakeEidolonNotifier(
          eidolonState ?? const EidolonState(),
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

Widget _wrapWithNotifier(_FakeDungeonNotifier notifier) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => const DungeonPage())],
  );
  return ProviderScope(
    overrides: [
      dungeonNotifierProvider.overrideWith(() => notifier),
      eidolonNotifierProvider.overrideWith(
        () => _FakeEidolonNotifier(const EidolonState()),
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

Future<void> _settle(WidgetTester tester) async {
  await tester.pump(const Duration(seconds: 1));
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pump();
}

EidolonProfile _profile() {
  final now = DateTime(2026);
  return EidolonProfile(
    id: 'e1',
    userId: 'uid-1',
    name: 'Lyra',
    personality: const PersonalityProfile(),
    createdAt: now,
    updatedAt: now,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  group('DungeonPage — hub view', () {
    testWidgets('renders Dungeon title and Enter Dungeon button',
        (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      expect(find.text('Dungeon'), findsOneWidget);
      expect(find.text('Enter Dungeon'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('Enter Dungeon button disabled when no Eidolon',
        (tester) async {
      await tester.pumpWidget(
        _wrap(
          eidolonState: const EidolonState(),
        ),
      );
      await tester.pump();

      final btn = tester.widget<ElevatedButton>(
        find.widgetWithText(ElevatedButton, 'Enter Dungeon'),
      );
      expect(btn.onPressed, isNull);

      await _settle(tester);
    });

    testWidgets('Enter Dungeon button enabled when Eidolon is loaded',
        (tester) async {
      await tester.pumpWidget(
        _wrap(
          eidolonState: EidolonState(eidolon: _profile()),
        ),
      );
      await tester.pump();

      final btn = tester.widget<ElevatedButton>(
        find.widgetWithText(ElevatedButton, 'Enter Dungeon'),
      );
      expect(btn.onPressed, isNotNull);

      await _settle(tester);
    });

    testWidgets('shows theme selection chips', (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      expect(find.text('Theme'), findsOneWidget);
      // At least one theme chip visible
      expect(find.text('forest'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows random dungeon hint when no theme selected',
        (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      expect(
        find.text('No theme selected — random dungeon will be generated.'),
        findsOneWidget,
      );

      await _settle(tester);
    });

    testWidgets('shows error message when errorMessage is set', (tester) async {
      await tester.pumpWidget(
        _wrap(
          dungeonState: const DungeonState(errorMessage: 'AI unavailable'),
        ),
      );
      await tester.pump();

      expect(find.text('AI unavailable'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('tapping theme chip calls setTheme', (tester) async {
      final notifier = _FakeDungeonNotifier(const DungeonState());
      await tester.pumpWidget(_wrapWithNotifier(notifier));
      await tester.pump();

      await tester.tap(find.text('forest'));
      await tester.pump();

      expect(notifier.lastTheme, DungeonTheme.forest);

      await _settle(tester);
    });
  });

  group('DungeonPage — generating view', () {
    testWidgets('shows Eidolon mapping text during generation', (tester) async {
      await tester.pumpWidget(
        _wrap(
          dungeonState: const DungeonState(phase: DungeonPhase.generating),
        ),
      );
      await tester.pump();

      expect(
        find.text('Your Eidolon is mapping the dungeon…'),
        findsOneWidget,
      );

      await _settle(tester);
    });
  });

  group('DungeonPage — result view', () {
    testWidgets('shows Victory when run completed', (tester) async {
      final now = DateTime(2026);
      await tester.pumpWidget(
        _wrap(
          dungeonState: DungeonState(
            phase: DungeonPhase.result,
            run: DungeonRun(
              id: 'r1',
              dungeonId: 'd1',
              eidolonId: 'e1',
              startedAt: now,
              status: RunStatus.completed,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.textContaining('Victory!'), findsOneWidget);
      expect(find.text('Return to Hub'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows Retreated when run abandoned', (tester) async {
      final now = DateTime(2026);
      await tester.pumpWidget(
        _wrap(
          dungeonState: DungeonState(
            phase: DungeonPhase.result,
            run: DungeonRun(
              id: 'r1',
              dungeonId: 'd1',
              eidolonId: 'e1',
              startedAt: now,
              status: RunStatus.abandoned,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.textContaining('Retreated'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('tapping Return to Hub calls backToHub', (tester) async {
      final now = DateTime(2026);
      final notifier = _FakeDungeonNotifier(
        DungeonState(
          phase: DungeonPhase.result,
          run: DungeonRun(
            id: 'r1',
            dungeonId: 'd1',
            eidolonId: 'e1',
            startedAt: now,
            status: RunStatus.completed,
          ),
        ),
      );
      await tester.pumpWidget(_wrapWithNotifier(notifier));
      await tester.pump();

      await tester.tap(find.text('Return to Hub'));
      await tester.pump();

      expect(notifier.backToHubCalled, true);

      await _settle(tester);
    });
  });
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeDungeonNotifier extends DungeonNotifier {
  _FakeDungeonNotifier(this._initial);
  final DungeonState _initial;
  bool backToHubCalled = false;
  DungeonTheme? lastTheme;

  @override
  DungeonState build() => _initial;

  @override
  Future<void> checkForActiveRun(String eidolonId) async {}

  @override
  Future<void> generateAndStart(String eidolonId) async {}

  @override
  void setDifficulty(int value) {
    state = state.copyWith(selectedDifficulty: value);
  }

  @override
  void setTheme(DungeonTheme? theme) {
    lastTheme = theme;
    state = state.copyWith(selectedTheme: theme);
  }

  @override
  Future<void> advanceRoom() async {}

  @override
  Future<void> abandonRun() async {}

  @override
  void backToHub() {
    backToHubCalled = true;
    state = state.copyWith(phase: DungeonPhase.hub);
  }

  @override
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

class _FakeEidolonNotifier extends EidolonNotifier {
  _FakeEidolonNotifier(this._state);
  final EidolonState _state;

  @override
  EidolonState build() => _state;

  @override
  Future<void> loadEidolon() async {}

  @override
  Future<void> sendMessage(String text) async {}

  @override
  void clearError() {}
}
