import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/share_morning.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/shareable_morning_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

MorningReport _report({int xp = 80}) => MorningReport(
      id: 'r1',
      runDate: DateTime.utc(2026, 6, 14),
      theme: 'shadow realm',
      narrative: 'A long story about the night.',
      highlight: 'Befriended a lantern-moth in the dark.',
      mood: EidolonMood.calm,
      xpGained: xp,
      loot: const [],
      seen: false,
    );

Widget _host(Widget child) =>
    MaterialApp(home: Scaffold(body: Center(child: child)));

void main() {
  testWidgets('renders the hook, name, brand, date and XP', (tester) async {
    await tester.pumpWidget(
      _host(ShareableMorningCard(report: _report(), eidolonName: 'Aria')),
    );
    expect(find.text('EIDOLON'), findsOneWidget);
    expect(find.text('Aria'), findsOneWidget);
    expect(find.text('Befriended a lantern-moth in the dark.'), findsOneWidget);
    expect(find.textContaining('Jun 14'), findsOneWidget);
    expect(find.text('+80 XP'), findsOneWidget);
    expect(find.text('@eidolon'), findsOneWidget);
  });

  testWidgets('hides the XP row when nothing was gained', (tester) async {
    await tester.pumpWidget(
      _host(ShareableMorningCard(report: _report(xp: 0), eidolonName: 'Aria')),
    );
    expect(find.textContaining('XP'), findsNothing);
  });

  testWidgets('captures to non-empty PNG bytes (the shareable artifact)',
      (tester) async {
    final key = GlobalKey();
    await tester.pumpWidget(
      _host(
        RepaintBoundary(
          key: key,
          child: ShareableMorningCard(report: _report(), eidolonName: 'Aria'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    final bytes =
        await tester.runAsync(() => captureCardPng(key, pixelRatio: 2));
    expect(bytes, isNotNull);
    expect(bytes!.lengthInBytes, greaterThan(1000));
    // PNG magic number.
    expect(bytes.sublist(0, 4), [0x89, 0x50, 0x4E, 0x47]);
  });
}
