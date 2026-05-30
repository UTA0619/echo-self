import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

abstract final class EidolonColors {
  static const background = Color(0xFF09090F);
  static const surface = Color(0xFF13141E);
  static const surfaceElevated = Color(0xFF1C1D2A);
  static const border = Color(0xFF252636);

  static const accent = Color(0xFF7B5CF6);
  static const accentDim = Color(0xFF4C3699);
  static const accentGlow = Color(0xFFAB8FFF);

  static const gold = Color(0xFFFFB347);
  static const goldDim = Color(0xFF8B6A1A);

  static const textPrimary = Color(0xFFF0F0FF);
  static const textSecondary = Color(0xFF9898B8);
  static const textMuted = Color(0xFF5A5A78);
  static const textDim = Color(0xFF3D3D58);

  static const success = Color(0xFF4ADE80);
  static const warning = Color(0xFFFBBF24);
  static const error = Color(0xFFF87171);

  static const soulCore = Color(0xFF00FFCC);
}

abstract final class EidolonTextStyles {
  static TextStyle get displayLarge => GoogleFonts.rajdhani(
    fontSize: 48,
    fontWeight: FontWeight.w700,
    letterSpacing: 2.0,
    color: EidolonColors.textPrimary,
  );

  static TextStyle get displayMedium => GoogleFonts.rajdhani(
    fontSize: 36,
    fontWeight: FontWeight.w600,
    letterSpacing: 1.5,
    color: EidolonColors.textPrimary,
  );

  static TextStyle get titleLarge => GoogleFonts.rajdhani(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.5,
    color: EidolonColors.textPrimary,
  );

  static TextStyle get titleMedium => GoogleFonts.spaceGrotesk(
    fontSize: 18,
    fontWeight: FontWeight.w500,
    color: EidolonColors.textPrimary,
  );

  static TextStyle get bodyLarge => GoogleFonts.spaceGrotesk(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: EidolonColors.textPrimary,
    height: 1.6,
  );

  static TextStyle get bodyMedium => GoogleFonts.spaceGrotesk(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: EidolonColors.textSecondary,
    height: 1.5,
  );

  static TextStyle get labelLarge => GoogleFonts.spaceGrotesk(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5,
    color: EidolonColors.textPrimary,
  );

  static TextStyle get labelSmall => GoogleFonts.spaceGrotesk(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 1.0,
    color: EidolonColors.textMuted,
  );
}

ThemeData buildEidolonTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: EidolonColors.background,
    colorScheme: const ColorScheme.dark(
      primary: EidolonColors.accent,
      onPrimary: EidolonColors.textPrimary,
      secondary: EidolonColors.gold,
      onSecondary: EidolonColors.background,
      surface: EidolonColors.surface,
      onSurface: EidolonColors.textPrimary,
      error: EidolonColors.error,
      onError: EidolonColors.textPrimary,
    ),
    textTheme: TextTheme(
      displayLarge: EidolonTextStyles.displayLarge,
      displayMedium: EidolonTextStyles.displayMedium,
      titleLarge: EidolonTextStyles.titleLarge,
      titleMedium: EidolonTextStyles.titleMedium,
      bodyLarge: EidolonTextStyles.bodyLarge,
      bodyMedium: EidolonTextStyles.bodyMedium,
      labelLarge: EidolonTextStyles.labelLarge,
      labelSmall: EidolonTextStyles.labelSmall,
    ),
    cardTheme: CardTheme(
      color: EidolonColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: EidolonColors.border, width: 1),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: EidolonColors.accent,
        foregroundColor: EidolonColors.textPrimary,
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: EidolonTextStyles.labelLarge,
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: EidolonColors.accent,
        side: const BorderSide(color: EidolonColors.accentDim, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: EidolonTextStyles.labelLarge,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: EidolonColors.surfaceElevated,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: EidolonColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: EidolonColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: EidolonColors.accent, width: 1.5),
      ),
      hintStyle: EidolonTextStyles.bodyMedium,
      labelStyle: EidolonTextStyles.bodyMedium,
    ),
    dividerTheme: const DividerThemeData(
      color: EidolonColors.border,
      thickness: 1,
      space: 1,
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: ZoomPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}
