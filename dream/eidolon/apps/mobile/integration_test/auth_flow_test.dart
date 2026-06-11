// ignore_for_file: avoid_print
import 'dart:async';

import 'package:eidolon/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patrol/patrol.dart';

/// Integration test: login → home hub navigation.
///
/// Uses Patrol for native-aware widget interaction.
/// Requires a running emulator/device and a valid PATROL_APP_ID env var.
///
/// Run:
///   flutter test integration_test/auth_flow_test.dart \
///     --dart-define=TEST_EMAIL=test@example.com \
///     --dart-define=TEST_PASSWORD=testpassword
void main() {
  const testEmail =
      String.fromEnvironment('TEST_EMAIL', defaultValue: 'ci@eidolon.test');
  const testPassword =
      String.fromEnvironment('TEST_PASSWORD', defaultValue: 'Eidolon!2025');

  patrolTest(
    'login with email and password navigates to Home Hub',
    config: const PatrolTesterConfig(
      settleTimeout: Duration(seconds: 20),
    ),
    ($) async {
      // Intentionally not awaited: pumpAndSettle drives the frames; awaiting
      // main() here can deadlock under the Patrol binding.
      unawaited(app.main());
      await $.pumpAndSettle();

      // ── Landing on Login page ───────────────────────────────────────
      // Wait for the email field to appear
      await $.waitUntilVisible(find.byType(TextField));

      // Fill in credentials
      // The login page renders two TextFields: email then password
      final textFields = find.byType(TextField);
      await $(textFields.first).enterText(testEmail);
      await $(textFields.last).enterText(testPassword);

      // Dismiss keyboard
      await $.pumpAndSettle();

      // Tap the Sign In button
      // The button label is either 'Sign In' or uses a localized key;
      // fall back to finding the only ElevatedButton.
      final signInBtn = find.widgetWithText(ElevatedButton, 'Sign In');
      if (signInBtn.evaluate().isNotEmpty) {
        await $(signInBtn).tap();
      } else {
        await $(find.byType(ElevatedButton).first).tap();
      }

      // ── Home Hub should appear ──────────────────────────────────────
      // Wait for the bottom navigation bar tab labelled 'Home' to show
      await $.waitUntilVisible(
        find.byWidgetPredicate(
          (w) =>
              w is NavigationDestination ||
              (w is Text && (w.data == 'Home' || w.data == 'ホーム')),
        ),
        timeout: const Duration(seconds: 30),
      );

      // Verify we're no longer on the login page
      expect(find.byType(TextField), findsNothing);
    },
  );
}
