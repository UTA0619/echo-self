import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_item.dart';
import 'package:eidolon/features/gacha/domain/entities/gacha_pull_result.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_item_sprite.dart';
import 'package:eidolon/features/gacha/presentation/widgets/gacha_reveal_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../helpers/test_app.dart';

Future<void> _settle(WidgetTester tester) async {
  // Flush flutter_animate's staggered one-shot timers (the Continue button's
  // entrance fires ~1.8s in) before tearing the tree down.
  await tester.pump(const Duration(seconds: 3));
  await tester.pumpWidget(const SizedBox.shrink());
  await tester.pump();
}

void main() {
  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('ten-pull reveal grid fits without overflowing', (tester) async {
    await tester.binding.setSurfaceSize(const Size(393, 852)); // iPhone 17
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final items = kGachaCatalog.take(10).toList();
    expect(items.length, 10);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildEidolonTheme(),
        localizationsDelegates: testLocalizationsDelegates,
        supportedLocales: const [Locale('en')],
        home: Scaffold(
          body: GachaRevealView(
            result: GachaPullResult(
              items: items,
              pulledAt: DateTime(2026, 6, 23),
              crystalsSpent: 250,
            ),
            onDone: () {},
          ),
        ),
      ),
    );
    await tester.pump();
    // Crack the hatch open so the ten-pull grid actually lays out.
    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(milliseconds: 400));

    // A RenderFlex/box overflow surfaces as a thrown exception during layout.
    expect(tester.takeException(), isNull);

    await _settle(tester);
  });

  testWidgets('every catalog creature sprite renders without error',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildEidolonTheme(),
        home: Scaffold(
          body: Wrap(
            children: [
              for (final item in kGachaCatalog)
                GachaItemSprite(item: item, size: 48),
            ],
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 200));
    expect(tester.takeException(), isNull);
    await _settle(tester);
  });

  test('elementFor is stable and spans the archetypes', () {
    // Deterministic per id.
    expect(
      GachaItemSprite.elementFor('item-abc'),
      GachaItemSprite.elementFor('item-abc'),
    );
    // Across the catalog, more than one element shows up (collectible variety).
    final seen = kGachaCatalog.map((i) => GachaItemSprite.elementFor(i.id)).toSet();
    expect(seen.length, greaterThan(1));
  });
}
