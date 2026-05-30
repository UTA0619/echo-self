import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/auth/domain/entities/auth_user.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/features/home/domain/entities/home_summary.dart';
import 'package:eidolon/features/home/presentation/pages/home_hub_page.dart';
import 'package:eidolon/features/home/presentation/providers/home_provider.dart';
import 'package:eidolon/features/reality_sync/presentation/providers/reality_sync_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_types/shared_types.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

Widget _wrap({HomeState? homeState, AuthState? authState}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, __) => const HomeHubPage())],
  );
  return ProviderScope(
    overrides: [
      homeNotifierProvider.overrideWith(() => _FakeHomeNotifier(
            homeState ?? const HomeState(),
          )),
      authNotifierProvider.overrideWith(() => _FakeAuthNotifier(
            authState ??
                const AuthState(
                  status: AuthStatus.authenticated,
                  user: AuthUser(uid: 'uid-1', email: 'test@test.com'),
                ),
          )),
      realitySyncNotifierProvider.overrideWith(
        () => _FakeRealitySyncNotifier(const RealitySyncState()),
      ),
    ],
    child: MaterialApp.router(
      theme: buildEidolonTheme(),
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

  group('HomeHubPage — loading', () {
    testWidgets('shows progress indicator while loading', (tester) async {
      await tester.pumpWidget(
        _wrap(homeState: const HomeState(isLoading: true)),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await _settle(tester);
    });
  });

  group('HomeHubPage — loaded state', () {
    testWidgets('shows greeting and daily stats section', (tester) async {
      await tester.pumpWidget(_wrap(
        homeState: const HomeState(
          summary: HomeSummary(
            hasActiveRun: false,
            dungeonRunsToday: 2,
            currentStreak: 7,
          ),
        ),
      ));
      await tester.pump();

      expect(find.textContaining('Adventurer'), findsOneWidget);
      expect(find.text("TODAY'S STATS"), findsOneWidget);
      expect(find.text('QUICK ACTIONS'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows streak badge when summary is present', (tester) async {
      await tester.pumpWidget(_wrap(
        homeState: const HomeState(
          summary: HomeSummary(
            hasActiveRun: false,
            dungeonRunsToday: 0,
            currentStreak: 14,
          ),
        ),
      ));
      await tester.pump();

      expect(find.text('14'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows Eidolon not awakened when no eidolon', (tester) async {
      await tester.pumpWidget(_wrap(homeState: const HomeState()));
      await tester.pump();

      expect(find.text('Eidolon not yet awakened'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows Eidolon card with name and level', (tester) async {
      final now = DateTime(2026);
      await tester.pumpWidget(_wrap(
        homeState: HomeState(
          eidolon: EidolonProfile(
            id: 'e1',
            userId: 'uid-1',
            name: 'Lyra',
            level: 5,
            xp: 200,
            xpToNext: 500,
            currentMood: EidolonMood.calm,
            personality: const PersonalityProfile(),
            createdAt: now,
            updatedAt: now,
          ),
        ),
      ));
      await tester.pump();

      expect(find.text('Lyra'), findsOneWidget);
      expect(find.text('Lv. 5'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows active dungeon run banner when run is active',
        (tester) async {
      await tester.pumpWidget(_wrap(
        homeState: const HomeState(
          summary: HomeSummary(
            hasActiveRun: true,
            activeRunId: 'run-123',
            dungeonRunsToday: 1,
            currentStreak: 3,
          ),
        ),
      ));
      await tester.pump();

      expect(
        find.text('Active dungeon run in progress — tap to return'),
        findsOneWidget,
      );

      await _settle(tester);
    });

    testWidgets('shows Enter Dungeon and Talk with Eidolon buttons',
        (tester) async {
      await tester.pumpWidget(_wrap());
      await tester.pump();

      expect(find.text('Enter Dungeon'), findsOneWidget);
      expect(find.text('Talk with Eidolon'), findsOneWidget);

      await _settle(tester);
    });

    testWidgets('shows error banner when errorMessage is set', (tester) async {
      await tester.pumpWidget(
        _wrap(homeState: const HomeState(errorMessage: 'Network error')),
      );
      await tester.pump();

      expect(find.text('Network error'), findsOneWidget);

      await _settle(tester);
    });
  });
}

// ── Fakes ─────────────────────────────────────────────────────────────────────

class _FakeHomeNotifier extends HomeNotifier {
  _FakeHomeNotifier(this._initial);
  final HomeState _initial;

  @override
  HomeState build() => _initial;

  @override
  Future<void> load(String uid) async {}

  @override
  void clearError() {
    state = state.copyWith(errorMessage: null);
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

class _FakeRealitySyncNotifier extends RealitySyncNotifier {
  _FakeRealitySyncNotifier(this._state);
  final RealitySyncState _state;

  @override
  RealitySyncState build() => _state;
}
