import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/reality_sync/domain/entities/health_snapshot.dart';
import 'package:eidolon/features/reality_sync/domain/entities/reality_sync_bonus.dart';
import 'package:eidolon/features/reality_sync/presentation/providers/reality_sync_provider.dart';
import 'package:eidolon/features/reality_sync/presentation/widgets/reality_sync_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../helpers/test_app.dart';

// ── Helpers ───────────────────────────────────────────────────────────────────

Widget _wrap(RealitySyncState state) {
  return ProviderScope(
    overrides: [
      realitySyncNotifierProvider.overrideWith(
        () => _FakeNotifier(state),
      ),
    ],
    child: MaterialApp(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      home: const Scaffold(body: RealitySyncCard()),
    ),
  );
}

final _testSnapshot = HealthSnapshot(
  stepsToday: 8000,
  sleepHoursLast: 7.5,
  caloriesBurned: 450,
  fetchedAt: DateTime(2026, 1, 1),
);

final _testBonus = bonusFromSnapshot(_testSnapshot);

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  Future<void> settle(WidgetTester tester) async {
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump();
  }

  group('RealitySyncCard — loading', () {
    testWidgets('shows loading indicator while loading', (tester) async {
      await tester.pumpWidget(
        _wrap(const RealitySyncState(isLoading: true)),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await settle(tester);
    });
  });

  group('RealitySyncCard — permission denied', () {
    testWidgets('shows connect button when no permission', (tester) async {
      await tester.pumpWidget(
        _wrap(const RealitySyncState(hasPermission: false)),
      );
      await tester.pump();

      expect(find.text('Connect Health'), findsOneWidget);
      expect(find.text('REALITY SYNC'), findsOneWidget);

      await settle(tester);
    });

    testWidgets('tapping Connect calls requestPermissionAndFetch', (tester) async {
      final notifier = _FakeNotifier(const RealitySyncState(hasPermission: false));
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            realitySyncNotifierProvider.overrideWith(() => notifier),
          ],
          child: MaterialApp(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            supportedLocales: const [Locale('en')],
            home: const Scaffold(body: RealitySyncCard()),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Connect Health'));
      await tester.pump();

      expect(notifier.connectCalled, true);

      await settle(tester);
    });
  });

  group('RealitySyncCard — with data', () {
    testWidgets('shows ATK / HP / EXP chips', (tester) async {
      await tester.pumpWidget(
        _wrap(
          RealitySyncState(
            hasPermission: true,
            snapshot: _testSnapshot,
            bonus: _testBonus,
          ),
        ),
      );
      await tester.pump();

      expect(find.text('ATK'), findsOneWidget);
      expect(find.text('HP'), findsOneWidget);
      expect(find.text('EXP'), findsOneWidget);

      await settle(tester);
    });

    testWidgets('shows correct ATK bonus value', (tester) async {
      // 8000 steps → ATK 16
      await tester.pumpWidget(
        _wrap(
          RealitySyncState(
            hasPermission: true,
            snapshot: _testSnapshot,
            bonus: _testBonus,
          ),
        ),
      );
      await tester.pump();

      expect(find.text('+${_testBonus.atkBonus}'), findsOneWidget);

      await settle(tester);
    });

    testWidgets('shows sync score label', (tester) async {
      await tester.pumpWidget(
        _wrap(
          RealitySyncState(
            hasPermission: true,
            snapshot: _testSnapshot,
            bonus: _testBonus,
          ),
        ),
      );
      await tester.pump();

      expect(find.textContaining('Score'), findsOneWidget);

      await settle(tester);
    });
  });
}

// ── Fake ──────────────────────────────────────────────────────────────────────

class _FakeNotifier extends RealitySyncNotifier {
  _FakeNotifier(this._initial);
  final RealitySyncState _initial;
  bool connectCalled = false;

  @override
  RealitySyncState build() => _initial;

  @override
  Future<void> requestPermissionAndFetch() async {
    connectCalled = true;
  }

  @override
  Future<void> refresh() async {}
}
