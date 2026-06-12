import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/repositories/gacha_repository.dart';
import 'package:eidolon/features/gacha/presentation/providers/gacha_provider.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_buy_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../helpers/test_app.dart';

// ── Fakes ─────────────────────────────────────────────────────────────────────

/// Never attached to a container — only the overridden members are used.
class _RecordingNotifier extends GachaNotifier {
  final List<String> boughtProductIds = [];

  @override
  GachaState build() => const GachaState();

  @override
  Future<void> buyCrystals(String productId) async {
    boughtProductIds.add(productId);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const _bundles = [
  CrystalBundle(
    productId: 'eidolon.crystals.80',
    crystals: 80,
    displayPrice: '¥160',
    isBestValue: false,
  ),
  CrystalBundle(
    productId: 'eidolon.crystals.500',
    crystals: 500,
    displayPrice: '¥800',
    isBestValue: true,
  ),
];

Widget _wrap(GachaState state, _RecordingNotifier notifier) => MaterialApp(
      theme: buildEidolonTheme(),
      localizationsDelegates: testLocalizationsDelegates,
      home: Scaffold(
        body: GachaBuyCrystalsSheet(state: state, notifier: notifier),
      ),
    );

// ── Tests ─────────────────────────────────────────────────────────────────────

void main() {
  testWidgets('shows a spinner while a purchase is in flight', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const GachaState(isBuyingCrystals: true, bundles: _bundles),
        _RecordingNotifier(),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.byType(GachaBundleTile), findsNothing);
  });

  testWidgets('shows the store-unavailable message when bundles are empty',
      (tester) async {
    await tester.pumpWidget(_wrap(const GachaState(), _RecordingNotifier()));

    expect(
      find.text('Store unavailable. Check your connection.'),
      findsOneWidget,
    );
  });

  testWidgets('renders a tile per bundle with price and BEST VALUE badge',
      (tester) async {
    await tester.pumpWidget(
      _wrap(const GachaState(bundles: _bundles), _RecordingNotifier()),
    );

    expect(find.byType(GachaBundleTile), findsNWidgets(2));
    expect(find.text('80 Crystals'), findsOneWidget);
    expect(find.text('500 Crystals'), findsOneWidget);
    expect(find.text('¥800'), findsOneWidget);
    // Only the 500 bundle is flagged best value.
    expect(find.text('BEST VALUE'), findsOneWidget);
  });

  testWidgets('tapping a bundle closes the sheet and starts the purchase',
      (tester) async {
    final notifier = _RecordingNotifier();

    // Present the sheet the way production does: via showModalBottomSheet,
    // so Navigator.pop inside the tile has a route to pop.
    await tester.pumpWidget(
      MaterialApp(
        theme: buildEidolonTheme(),
        localizationsDelegates: testLocalizationsDelegates,
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () => showModalBottomSheet<void>(
                  context: context,
                  builder: (_) => GachaBuyCrystalsSheet(
                    state: const GachaState(bundles: _bundles),
                    notifier: notifier,
                  ),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.byType(GachaBuyCrystalsSheet), findsOneWidget);

    await tester.tap(find.text('500 Crystals'));
    await tester.pumpAndSettle();

    expect(notifier.boughtProductIds, ['eidolon.crystals.500']);
    expect(find.byType(GachaBuyCrystalsSheet), findsNothing); // sheet closed
  });

  testWidgets('close button dismisses the sheet without buying',
      (tester) async {
    final notifier = _RecordingNotifier();

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEidolonTheme(),
        localizationsDelegates: testLocalizationsDelegates,
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () => showModalBottomSheet<void>(
                  context: context,
                  builder: (_) => GachaBuyCrystalsSheet(
                    state: const GachaState(bundles: _bundles),
                    notifier: notifier,
                  ),
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.close));
    await tester.pumpAndSettle();

    expect(find.byType(GachaBuyCrystalsSheet), findsNothing);
    expect(notifier.boughtProductIds, isEmpty);
  });
}
