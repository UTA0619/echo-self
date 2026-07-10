import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// "Daylight Pop" — a bright, friendly, mass-market palette: warm cream base,
/// white surfaces, and vibrant coral / teal / sunny accents. Token names are
/// kept stable so the whole app re-skins from this one place.
abstract final class EidolonColors {
  static const background = Color(0xFFFFF8F0); // warm cream
  static const surface = Color(0xFFFFFFFF); // white card
  static const surfaceElevated = Color(0xFFF6F1EA); // input fills / raised tint
  static const border = Color(0xFFEFE6DA); // soft warm hairline

  static const accent = Color(0xFFFF7A59); // coral — primary action
  static const accentDim = Color(0xFFF2643F); // deeper coral — outlined borders
  static const accentGlow = Color(0xFF2BB6A3); // teal — secondary highlight

  static const gold = Color(0xFFFFC53D); // sunny — rewards
  static const goldDim = Color(0xFFC9971F);

  static const textPrimary = Color(0xFF1E2330); // dark navy
  static const textSecondary = Color(0xFF6B7180);
  static const textMuted = Color(0xFF9AA0AC);
  static const textDim = Color(0xFFC2C7D0);

  static const success = Color(0xFF16B364);
  static const warning = Color(0xFFF5A524);
  static const error = Color(0xFFE5484D);

  static const soulCore = Color(0xFF00C2A8); // teal-cyan soul glow
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
    brightness: Brightness.light,
    scaffoldBackgroundColor: EidolonColors.background,
    colorScheme: const ColorScheme.light(
      primary: EidolonColors.accent,
      onPrimary: Colors.white,
      secondary: EidolonColors.gold,
      onSecondary: EidolonColors.textPrimary,
      surface: EidolonColors.surface,
      onSurface: EidolonColors.textPrimary,
      error: EidolonColors.error,
      onError: Colors.white,
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
    cardTheme: CardThemeData(
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
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        // Coral button needs white text — labelLarge bakes in a dark color.
        textStyle: EidolonTextStyles.labelLarge.copyWith(color: Colors.white),
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
