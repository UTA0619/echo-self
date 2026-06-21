import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/features/away_report/presentation/away_report_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Dev-only harness: seed a last-seen 5 hours ago so the away report is
/// claimable. Run: flutter run -t lib/dev_away_preview.dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final fiveHoursAgo =
      DateTime.now().subtract(const Duration(hours: 5)).millisecondsSinceEpoch;
  // ignore: invalid_use_of_visible_for_testing_member
  SharedPreferences.setMockInitialValues({
    'away_report.last_seen_ms': fiveHoursAgo,
  });
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
            child: Column(children: [SizedBox(height: 40), AwayReportCard()]),
          ),
        ),
      ),
    ),
  );
}
