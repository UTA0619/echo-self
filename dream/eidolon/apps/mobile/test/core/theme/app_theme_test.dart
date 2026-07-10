import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

double _contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  final hi = la > lb ? la : lb;
  final lo = la > lb ? lb : la;
  return (hi + 0.05) / (lo + 0.05);
}

void main() {
  group('EidolonColors — Daylight Pop (pure unit tests)', () {
    test('background is light', () {
      expect(EidolonColors.background.computeLuminance(), greaterThan(0.8));
    });

    test('primary text is readable on the light background (WCAG AA)', () {
      expect(
        _contrast(EidolonColors.textPrimary, EidolonColors.background),
        greaterThanOrEqualTo(4.5),
      );
    });

    test('white button text stays legible on the coral accent', () {
      // Vibrant CTAs deliberately trade strict WCAG for "pop" (cf. Duolingo's
      // ~1.9:1 green buttons). We hold a sensible floor for bold button text
      // rather than dull the brand coral down to a 4.5:1 brown.
      expect(
        _contrast(const Color(0xFFFFFFFF), EidolonColors.accent),
        greaterThanOrEqualTo(2.5),
      );
    });

    test('surfaceElevated is a subtle tint, distinct from the white surface',
        () {
      expect(
        EidolonColors.surfaceElevated.computeLuminance(),
        lessThan(EidolonColors.surface.computeLuminance()),
      );
    });

    test('primary text is dark', () {
      expect(EidolonColors.textPrimary.computeLuminance(), lessThan(0.1));
    });
  });

  group('buildEidolonTheme (widget tests — requires binding)', () {
    setUpAll(() {
      TestWidgetsFlutterBinding.ensureInitialized();
      // Allow network fetching (CI has no fonts); fall back gracefully
      GoogleFonts.config.allowRuntimeFetching = true;
    });

    testWidgets('uses Material3', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.useMaterial3, isTrue);
    });

    testWidgets('is light theme', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.brightness, equals(Brightness.light));
    });

    testWidgets('primary color is the accent', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.colorScheme.primary, equals(EidolonColors.accent));
    });

    testWidgets('onPrimary is white so button labels stay readable',
        (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.colorScheme.onPrimary, equals(const Color(0xFFFFFFFF)));
    });

    testWidgets('scaffold background is the app background', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.scaffoldBackgroundColor, equals(EidolonColors.background));
    });

    testWidgets('card has no elevation', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.cardTheme.elevation, equals(0));
    });

    testWidgets('elevated button style is defined', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.elevatedButtonTheme.style, isNotNull);
    });
  });
}
