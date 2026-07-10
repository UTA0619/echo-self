import 'package:eidolon/core/i18n/l10n.dart';
import 'package:eidolon/features/home/presentation/widgets/home_eidolon_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_types/shared_types.dart';

/// Dev-only harness for the upgraded home Eidolon card: leveled avatar + XP bar
/// + bond meter (mock prefs seed a meaningful bond). Run:
/// flutter run -t lib/dev_home_card_preview.dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  // ignore: invalid_use_of_visible_for_testing_member
  SharedPreferences.setMockInitialValues({'bond.points': 250});
  runApp(const _HomeCardPreviewApp());
}

class _HomeCardPreviewApp extends StatelessWidget {
  const _HomeCardPreviewApp();

  @override
  Widget build(BuildContext context) {
    final eidolon = EidolonProfile(
      id: 'e1',
      userId: 'u1',
      name: 'Nova',
      level: 8,
      xp: 420,
      xpToNext: 1000,
      personality: const PersonalityProfile(openness: 82, extraversion: 70),
      currentMood: EidolonMood.calm,
      createdAt: DateTime.utc(2026),
      updatedAt: DateTime.utc(2026),
    );
    return ProviderScope(
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: const Locale('ja'),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          backgroundColor: const Color(0xFF09090F),
          body: SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 40),
                HomeEidolonCard(eidolon: eidolon),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
