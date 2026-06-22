import 'package:flutter/material.dart';
import 'package:eidolon/l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

/// Standard localizations delegates for widget tests.
/// Add these to any [MaterialApp] or [MaterialApp.router] that renders pages
/// consuming [AppLocalizations].
const testLocalizationsDelegates = [
  AppLocalizations.delegate,
  GlobalMaterialLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
];
