import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/away_report/presentation/away_report_provider.dart';
import 'package:eidolon/features/eidolon/presentation/providers/eidolon_provider.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/overnight_dispatch_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

import '../../../helpers/test_app.dart';

EidolonProfile _profile({String name = 'Lyra'}) {
  final now = DateTime(2026);
  return EidolonProfile(
    id: 'e1',
    userId: 'uid-1',
    name: name,
    level: 5,
    xp: 100,
    xpToNext: 500,
    currentMood: EidolonMood.calm,
    personality: const PersonalityProfile(),
    createdAt: now,
    updatedAt: now,
  );
}

class _FakeMorningReport extends MorningReportNotifier {
  _FakeMorningReport(this._initial);
  final MorningReportState _initial;
  @override
  MorningReportState build() => _initial;
}

class _FakeEidolon extends EidolonNotifier {
  _FakeEidolon(this._initial);
  final EidolonState _initial;
  @override
  EidolonState build() => _initial;
}

class _FakeAway extends AwayReportNotifier {
  _FakeAway(this._initial);
  final AwayReportState _initial;
  @override
  Future<AwayReportState> build() async => _initial;
}

Widget _wrap({
  required MorningReportState morning,
  EidolonProfile? eidolon,
  AwayReportState away = const AwayReportState(),
}) {
  return ProviderScope(
    overrides: [
      morningReportNotifierProvider.overrideWith(
        () => _FakeMorningReport(morning),
      ),
      eidolonNotifierProvider.overrideWith(
        () => _FakeEidolon(EidolonState(eidolon: eidolon)),
      ),
      awayReportNotifierProvider.overrideWith(() => _FakeAway(away)),
    ],
    child: MaterialApp(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      supportedLocales: const [Locale('en')],
      home: const Scaffold(body: OvernightDispatchCard()),
    ),
  );
}

// flutter_animate leaves a pending start timer; tear the tree down to cancel it
// (and to stop the dispatching spinner's ticker) before the test ends.
Future<void> _settle(WidgetTester tester) async {
  await tester.pump(const Duration(milliseconds: 500));
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pump();
}

void main() {
  group('OvernightDispatchCard', () {
    testWidgets('shows the dispatch prompt when dispatchable', (tester) async {
      await tester.pumpWidget(
        _wrap(morning: const MorningReportState(), eidolon: _profile()),
      );
      await tester.pump();

      expect(find.text('Send off'), findsOneWidget);
      expect(find.textContaining('Lyra'), findsWidgets);

      await _settle(tester);
    });

    testWidgets('hidden when no Eidolon is awakened', (tester) async {
      await tester.pumpWidget(_wrap(morning: const MorningReportState()));
      await tester.pump();

      expect(find.byType(ElevatedButton), findsNothing);
    });

    testWidgets('hidden once a run already happened today', (tester) async {
      await tester.pumpWidget(
        _wrap(
          morning: const MorningReportState(todayRunExists: true),
          eidolon: _profile(),
        ),
      );
      await tester.pump();

      expect(find.byType(ElevatedButton), findsNothing);
    });

    testWidgets('hidden while an away reward is waiting to be claimed',
        (tester) async {
      await tester.pumpWidget(
        _wrap(
          morning: const MorningReportState(),
          eidolon: _profile(),
          away: const AwayReportState(claimable: true, crystals: 60),
        ),
      );
      await tester.pump(); // mount (away still AsyncLoading)
      await tester.pump(); // away future resolves → claimable → card hides

      expect(find.byType(ElevatedButton), findsNothing);

      await _settle(tester);
    });

    testWidgets('shows a spinner while dispatching', (tester) async {
      await tester.pumpWidget(
        _wrap(
          morning: const MorningReportState(isDispatching: true),
          eidolon: _profile(),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Send off'), findsNothing);

      await _settle(tester);
    });

    testWidgets('surfaces a failure message after a failed dispatch',
        (tester) async {
      await tester.pumpWidget(
        _wrap(
          morning: const MorningReportState(errorMessage: 'boom'),
          eidolon: _profile(),
        ),
      );
      await tester.pump();

      expect(
        find.text("Couldn't send them off. Please try again."),
        findsOneWidget,
      );

      await _settle(tester);
    });
  });
}
