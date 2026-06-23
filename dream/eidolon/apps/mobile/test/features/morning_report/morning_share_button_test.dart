import 'dart:typed_data';

import 'package:eidolon/features/morning_report/domain/entities/morning_report.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/morning_share_button.dart';
import 'package:eidolon/features/morning_report/presentation/widgets/shareable_morning_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_types/shared_types.dart';

class _FakeSharer implements MorningSharer {
  Uint8List? bytes;
  String? text;

  @override
  Future<void> share(Uint8List pngBytes, String shareText) async {
    bytes = pngBytes;
    text = shareText;
  }
}

MorningReport _report() => MorningReport(
      id: 'r1',
      runDate: DateTime.utc(2026, 6, 14),
      theme: 'shadow realm',
      narrative: 'A long story.',
      highlight: 'Befriended a lantern-moth in the dark.',
      mood: EidolonMood.calm,
      xpGained: 80,
      loot: const [],
      seen: false,
    );

void main() {
  testWidgets('shows the share preview card and a share CTA', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: MorningShareCard(
              report: _report(),
              eidolonName: 'Aria',
              label: 'Share this morning',
              sharer: _FakeSharer(),
            ),
          ),
        ),
      ),
    );
    expect(find.byType(ShareableMorningCard), findsOneWidget);
    expect(find.text('Share this morning'), findsOneWidget);
    expect(find.byIcon(Icons.ios_share), findsOneWidget);
  });

  testWidgets('tapping share fires the viral-funnel callbacks', (tester) async {
    var initiated = 0;
    bool? completedSuccess;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: MorningShareCard(
              report: _report(),
              eidolonName: 'Aria',
              label: 'Share this morning',
              sharer: _FakeSharer(),
              onShareInitiated: () => initiated++,
              onShareCompleted: (s) => completedSuccess = s,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.runAsync(() async {
      await tester.tap(find.byIcon(Icons.ios_share));
      await tester
          .pump(); // start _share (fires onShareInitiated synchronously)
      // Let the off-thread RepaintBoundary.toImage() capture resolve.
      await Future<void>.delayed(const Duration(milliseconds: 400));
      await tester.pump(); // process the completion setState + callback
    });

    expect(initiated, 1); // top of funnel
    expect(completedSuccess, isNotNull); // bottom of funnel fired
    expect(completedSuccess, true); // card captured + handed to the sharer
  });

  testWidgets('captureAndShare turns the visible card into a valid PNG',
      (tester) async {
    final key = GlobalKey();
    final fake = _FakeSharer();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: RepaintBoundary(
              key: key,
              child: ShareableMorningCard(
                report: _report(),
                eidolonName: 'Aria',
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final ok = await tester.runAsync(
      () => captureAndShare(
        boundaryKey: key,
        sharer: fake,
        text: 'My Eidolon adventured while I slept. #Eidolon',
      ),
    );

    expect(ok, true);
    expect(fake.bytes, isNotNull);
    expect(fake.bytes!.lengthInBytes, greaterThan(1000));
    expect(fake.bytes!.sublist(0, 4), [0x89, 0x50, 0x4E, 0x47]); // PNG magic
    expect(fake.text, contains('Eidolon'));
  });
}
