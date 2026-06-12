import 'package:eidolon/core/error/app_error.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/morning_report/data/repositories/morning_report_repository_impl.dart';
import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/domain/repositories/morning_report_repository.dart';
import 'package:eidolon/features/morning_report/presentation/pages/morning_report_page.dart';
import 'package:eidolon/features/morning_report/presentation/providers/morning_report_provider.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/morning_report_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

import '../../../helpers/test_app.dart';

class _RecordingRepo implements MorningReportRepository {
  String? seenId;

  @override
  Future<Result<MorningReport?>> getLatestUnseen() async =>
      ok<MorningReport?>(null);

  @override
  Future<Result<void>> markSeen(String runId) async {
    seenId = runId;
    return ok(null);
  }

  @override
  Future<Result<String>> simulateNow() async => ok('run-x');
}

/// Notifier seeded with a fixed state, so the card has a report to render.
class _FakeNotifier extends MorningReportNotifier {
  _FakeNotifier(this._initial);
  final MorningReportState _initial;

  @override
  MorningReportState build() => _initial;
}

MorningReport _report({List<OvernightLoot> loot = const []}) => MorningReport(
      id: 'run-1',
      runDate: DateTime(2026, 6, 12),
      theme: 'forest',
      narrative:
          'Nyx crept through the glowing glade and outwitted a sentinel.',
      highlight: 'Nyx outwitted a sentinel',
      mood: EidolonMood.focused,
      xpGained: 130,
      loot: loot,
      seen: false,
    );

void main() {
  group('MorningReportPage', () {
    testWidgets('renders narrative, XP and loot; marks the report read',
        (tester) async {
      final repo = _RecordingRepo();
      final report = _report(
        loot: const [
          OvernightLoot(name: 'Sentinel Core', rarity: LootRarity.epic),
        ],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            morningReportRepositoryProvider.overrideWithValue(repo),
            // Mirror production: the card has already put this report in state
            // before navigating here, so markSeen() has something to mark.
            morningReportNotifierProvider.overrideWith(
              () => _FakeNotifier(MorningReportState(report: report)),
            ),
          ],
          child: MaterialApp(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            home: MorningReportPage(report: report),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('outwitted a sentinel'), findsOneWidget);
      expect(find.text('+130 XP'), findsOneWidget);
      expect(find.text('Sentinel Core'), findsOneWidget);
      expect(find.text('EPIC'), findsOneWidget);
      // Opening the report marks it seen.
      expect(repo.seenId, 'run-1');
    });

    testWidgets('shows the empty-loot message when there is no loot',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            morningReportRepositoryProvider.overrideWithValue(_RecordingRepo()),
          ],
          child: MaterialApp(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            home: MorningReportPage(report: _report()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Returned empty-handed.'), findsOneWidget);
    });
  });

  group('MorningReportCard', () {
    Widget wrap(MorningReportState state) => ProviderScope(
          overrides: [
            morningReportNotifierProvider.overrideWith(
              () => _FakeNotifier(state),
            ),
          ],
          child: MaterialApp(
            theme: buildEidolonTheme(),
            localizationsDelegates: testLocalizationsDelegates,
            home: const Scaffold(body: MorningReportCard()),
          ),
        );

    testWidgets('renders the highlight when an unseen report exists',
        (tester) async {
      await tester.pumpWidget(wrap(MorningReportState(report: _report())));
      await tester.pumpAndSettle();

      expect(find.text('Nyx outwitted a sentinel'), findsOneWidget);
    });

    testWidgets('renders nothing when there is no report', (tester) async {
      await tester.pumpWidget(wrap(const MorningReportState()));
      await tester.pumpAndSettle();

      expect(find.byType(MorningReportCard), findsOneWidget);
      expect(find.text('Nyx outwitted a sentinel'), findsNothing);
    });
  });
}
