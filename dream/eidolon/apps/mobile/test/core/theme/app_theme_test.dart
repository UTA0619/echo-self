import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  group('EidolonColors (pure unit tests)', () {
    test('background is sufficiently dark', () {
      const bg = EidolonColors.background;
      expect(bg.computeLuminance(), lessThan(0.05));
    });

    test('accent color meets WCAG AA contrast on background', () {
      final bgLum = EidolonColors.background.computeLuminance();
      final accentLum = EidolonColors.accent.computeLuminance();
      final contrast = (accentLum + 0.05) / (bgLum + 0.05);
      expect(contrast, greaterThanOrEqualTo(3.0));
    });

    test('surface is darker than surfaceElevated', () {
      expect(
        EidolonColors.surface.computeLuminance(),
        lessThan(EidolonColors.surfaceElevated.computeLuminance()),
      );
    });

    test('text primary is near white', () {
      expect(EidolonColors.textPrimary.computeLuminance(), greaterThan(0.8));
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

    testWidgets('is dark theme', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.brightness, equals(Brightness.dark));
    });

    testWidgets('primary color is accent purple', (tester) async {
      final theme = buildEidolonTheme();
      expect(theme.colorScheme.primary, equals(EidolonColors.accent));
    });

    testWidgets('scaffold background is deep black', (tester) async {
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
