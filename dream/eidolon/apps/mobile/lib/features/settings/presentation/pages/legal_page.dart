import 'package:eidolon/core/theme/app_theme.dart';
import 'package:flutter/material.dart';

enum LegalPageType { privacy, terms }

class LegalPage extends StatelessWidget {
  const LegalPage({super.key, required this.type});

  final LegalPageType type;

  bool get _isPrivacy => type == LegalPageType.privacy;

  String get _title => _isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  String get _effectiveDate => 'Effective: May 30, 2026';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EidolonColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(_title, style: Theme.of(context).textTheme.titleMedium),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: EidolonColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _effectiveDate,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: EidolonColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 24),
            if (_isPrivacy) ..._privacySections(context),
            if (!_isPrivacy) ..._termsSections(context),
          ],
        ),
      ),
    );
  }

  List<Widget> _privacySections(BuildContext context) => [
        _section(
          context,
          '1. Information We Collect',
          'We collect information you provide directly, including account '
              'credentials, display name, and in-game activity. We also collect '
              'health and fitness data from Apple HealthKit and Google Health '
              'Connect when you grant permission through the Reality Sync feature. '
              'Usage data and crash reports are collected automatically.',
        ),
        _section(
          context,
          '2. How We Use Your Information',
          'Your information powers personalized gameplay, Eidolon AI dialogue, '
              'dungeon generation, and leaderboard features. Health data is used '
              'exclusively to calculate Reality Sync bonuses and is never sold '
              'or shared with third parties for advertising.',
        ),
        _section(
          context,
          '3. Health Data',
          'Eidolon integrates with Apple HealthKit (iOS) and Google Health '
              'Connect (Android) to read step count, workout minutes, and sleep '
              'data. This data is used only to compute in-game bonuses. We do '
              'not store raw health data on our servers; only aggregated bonus '
              'values are retained.',
        ),
        _section(
          context,
          '4. In-App Purchases',
          'Purchase transactions are processed by Apple or Google. We receive '
              'receipt data to verify purchases and credit Soul Crystals to your '
              'account. Payment card details are never transmitted to or stored '
              'by Eidolon.',
        ),
        _section(
          context,
          '5. Gacha / Summoning Rates',
          'All gacha summoning rates are disclosed on the Summon screen. '
              'Legendary items have a base pull rate of 1.0%. Rates are not '
              'modified by purchase history or any other factor.',
        ),
        _section(
          context,
          '6. Data Retention and Deletion',
          'You may delete your account at any time from the Settings screen. '
              'Upon deletion, your profile, Eidolon data, and gameplay history '
              'are permanently removed within 30 days. Health data is not '
              'retained on our servers.',
        ),
        _section(
          context,
          '7. Children',
          'Eidolon is rated 12+ and is not directed at children under 12. '
              'We do not knowingly collect personal information from children '
              'under 13 (or the applicable age in your jurisdiction).',
        ),
        _section(
          context,
          '8. Contact',
          'For privacy inquiries, contact us at:\n'
              'privacy@eidolon.app',
        ),
      ];

  List<Widget> _termsSections(BuildContext context) => [
        _section(
          context,
          '1. Acceptance',
          'By downloading or using Eidolon you agree to these Terms of Service. '
              'If you do not agree, please uninstall the app.',
        ),
        _section(
          context,
          '2. License',
          'We grant you a limited, non-exclusive, non-transferable license to '
              'use Eidolon for personal, non-commercial purposes in accordance '
              'with these Terms.',
        ),
        _section(
          context,
          '3. In-App Purchases and Soul Crystals',
          'Soul Crystals are virtual currency with no real-world monetary value '
              'and are non-refundable except as required by applicable law. '
              'Gacha summoning rates are displayed before each pull. '
              'Purchases are final once completed.',
        ),
        _section(
          context,
          '4. User Conduct',
          'You may not: (a) reverse-engineer the app; (b) use cheats, bots, '
              'or automation tools; (c) exploit bugs to gain unfair advantages; '
              '(d) harass other users; or (e) violate any applicable law.',
        ),
        _section(
          context,
          '5. Intellectual Property',
          'All game content, artwork, story, characters, and AI outputs '
              'generated within Eidolon are owned by or licensed to Eidolon '
              'Studio. You may not reproduce or distribute this content '
              'without prior written consent.',
        ),
        _section(
          context,
          '6. Disclaimers and Limitation of Liability',
          'Eidolon is provided "as is" without warranty of any kind. '
              'To the maximum extent permitted by law, Eidolon Studio is not '
              'liable for indirect, incidental, or consequential damages.',
        ),
        _section(
          context,
          '7. Termination',
          'We reserve the right to suspend or terminate accounts that violate '
              'these Terms. You may close your account at any time from Settings.',
        ),
        _section(
          context,
          '8. Changes',
          'We may update these Terms at any time. Continued use after changes '
              'are posted constitutes acceptance.',
        ),
        _section(
          context,
          '9. Contact',
          'Questions? Contact us at:\n'
              'support@eidolon.app',
        ),
      ];

  Widget _section(BuildContext context, String heading, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            heading,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: EidolonColors.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            body,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: EidolonColors.textSecondary,
                  height: 1.6,
                ),
          ),
        ],
      ),
    );
  }
}
