import 'dart:io';

import 'package:eidolon/core/env/app_env.dart';
import 'package:eidolon/core/firebase/firebase_service.dart';
import 'package:eidolon/core/router/app_router.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/core/utils/logger.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mixpanel_flutter/mixpanel_flutter.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: EidolonColors.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  await _initServices();

  runApp(
    const ProviderScope(
      child: EidolonApp(),
    ),
  );
}

Future<void> _initServices() async {
  // Firebase (Crashlytics + Analytics + Remote Config)
  await initFirebase();
  log.i('[init] Firebase ready');

  // Supabase (Auth + DB + Edge Functions)
  await initSupabase();
  log.i('[init] Supabase ready');

  // Sentry error tracking
  if (AppEnv.sentryDsn.isNotEmpty) {
    await SentryFlutter.init(
      (options) {
        options
          ..dsn = AppEnv.sentryDsn
          ..environment = AppEnv.environment
          ..tracesSampleRate = AppEnv.isProduction ? 0.2 : 1.0
          ..profilesSampleRate = AppEnv.isProduction ? 0.1 : 0.0;
      },
    );
    log.i('[init] Sentry ready');
  }

  // RevenueCat in-app purchases (skip on web)
  if (!kIsWeb &&
      (AppEnv.revenueCatApiKeyAndroid.isNotEmpty ||
          AppEnv.revenueCatApiKeyIos.isNotEmpty)) {
    final rcKey = Platform.isAndroid
        ? AppEnv.revenueCatApiKeyAndroid
        : AppEnv.revenueCatApiKeyIos;
    await Purchases.configure(PurchasesConfiguration(rcKey));
    log.i('[init] RevenueCat ready');
  }

  // Mixpanel analytics
  if (AppEnv.mixpanelToken.isNotEmpty) {
    final mixpanel = await Mixpanel.init(
      AppEnv.mixpanelToken,
      trackAutomaticEvents: true,
    );
    mixpanel.setLoggingEnabled(!AppEnv.isProduction);
    log.i('[init] Mixpanel ready');
  }
}


class EidolonApp extends ConsumerWidget {
  const EidolonApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Eidolon',
      debugShowCheckedModeBanner: false,
      theme: buildEidolonTheme(),
      routerConfig: router,
      // ── Localizations ─────────────────────────────────────────────
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
    );
  }
}
