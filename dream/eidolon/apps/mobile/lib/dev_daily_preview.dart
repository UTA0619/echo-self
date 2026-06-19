import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/features/daily_reward/presentation/daily_reward_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Dev-only harness: empty prefs => today's daily bonus is claimable, so the
/// [DailyRewardCard] renders. Run: flutter run -t lib/dev_daily_preview.dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // ignore: invalid_use_of_visible_for_testing_member
  SharedPreferences.setMockInitialValues({});
  runApp(
    const ProviderScope(
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: Locale('ja'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          backgroundColor: Color(0xFF09090F),
          body: SafeArea(
            child: Column(children: [SizedBox(height: 40), DailyRewardCard()]),
          ),
        ),
      ),
    ),
  );
}
