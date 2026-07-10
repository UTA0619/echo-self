import 'dart:io';

import 'package:app_tracking_transparency/app_tracking_transparency.dart';
import 'dart:async';

import 'package:eidolon/core/analytics/analytics.dart';
import 'package:eidolon/core/analytics/attribution.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:eidolon/core/demo/demo_overrides.dart';
import 'package:eidolon/features/auth/presentation/providers/auth_provider.dart';
import 'package:eidolon/core/env/app_env.dart';
import 'package:eidolon/core/router/app_router.dart';
import 'package:eidolon/core/supabase/supabase_service.dart';
import 'package:eidolon/core/theme/app_theme.dart';
import 'package:eidolon/core/utils/logger.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:eidolon/l10n/app_localizations.dart';
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
      // Dark icons for the light "Daylight Pop" background.
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: EidolonColors.background,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // DEMO build: no backend credentials were injected, so skip all real
  // service initialization and run with sample-data provider overrides.
  if (AppEnv.isDemoMode) {
    log.i('[init] DEMO MODE — backend disabled, using sample data');
    runApp(
      ProviderScope(
        overrides: demoOverrides(),
        child: const EidolonApp(),
      ),
    );
    return;
  }

  final mixpanel = await _initServices();

  // Request ATT permission on iOS 14+ (required for IDFA used by Mixpanel)
  if (!kIsWeb && Platform.isIOS) {
    final status = await AppTrackingTransparency.trackingAuthorizationStatus;
    if (status == TrackingStatus.notDetermined) {
      await AppTrackingTransparency.requestTrackingAuthorization();
    }
  }

  runApp(
    ProviderScope(
      overrides: [
        if (mixpanel != null)
          analyticsProvider.overrideWithValue(MixpanelAnalytics(mixpanel)),
      ],
      child: const EidolonApp(),
    ),
  );
}

/// Initializes backend services. Returns the [Mixpanel] instance (or null when
/// no token was injected) so the caller can wire it into the analytics provider.
Future<Mixpanel?> _initServices() async {
  // Supabase (Auth + DB + Edge Functions) — the single backend.
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
          // ignore: experimental_member_use
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
    return mixpanel;
  }
  return null;
}

class EidolonApp extends ConsumerStatefulWidget {
  const EidolonApp({super.key});

  @override
  ConsumerState<EidolonApp> createState() => _EidolonAppState();
}

class _EidolonAppState extends ConsumerState<EidolonApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final analytics = ref.read(analyticsProvider);
      // Identify a returning user who is already signed in at launch (the
      // ref.listen below only catches later auth *changes*).
      final uid = ref.read(authNotifierProvider).user?.uid;
      if (uid != null && uid.isNotEmpty) analytics.identify(uid);
      // First open of this launch — feeds D1/D7 retention cohorts in Mixpanel.
      analytics.track(
        AppEvents.appOpened,
        props: {'daypart': daypart(), 'cold_start': true},
      );
      // Attribute this install to a referral code (once per install) — the
      // install side of viral K. No-op unless an attribution source is wired.
      unawaited(_resolveAttribution(analytics));
    });
  }

  /// Resolve deferred-deep-link attribution exactly once per install and fire
  /// `install_referred`. Never blocks or crashes startup.
  Future<void> _resolveAttribution(Analytics analytics) async {
    try {
      final attribution = ref.read(attributionProvider);
      if (attribution is NoopAttribution) return; // nothing to resolve
      final prefs = await SharedPreferences.getInstance();
      const key = 'attribution.resolved';
      await AttributionResolver(
        attribution: attribution,
        analytics: analytics,
      ).run(
        alreadyResolved: prefs.getBool(key) ?? false,
        onResolved: () => prefs.setBool(key, true),
      );
    } catch (_) {/* attribution is best-effort */}
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Each foreground counts as an open — this is the retention signal.
    if (state == AppLifecycleState.resumed) {
      ref.read(analyticsProvider).track(
        AppEvents.appOpened,
        props: {'daypart': daypart(), 'cold_start': false},
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Tie events to the signed-in user (fires immediately for returning users),
    // and clear identity on sign-out.
    ref.listen(authNotifierProvider, (prev, next) {
      final uid = next.user?.uid;
      final analytics = ref.read(analyticsProvider);
      if (uid != null && uid.isNotEmpty) {
        analytics.identify(uid);
      } else if (prev?.user != null && next.user == null) {
        analytics.reset();
      }
    });

    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Eidolon',
      debugShowCheckedModeBanner: false,
      theme: buildEidolonTheme(),
      routerConfig: router,
      // Show a corner ribbon in demo builds so it's never mistaken for real data.
      builder: AppEnv.isDemoMode
          ? (context, child) => Banner(
                message: 'DEMO',
                location: BannerLocation.topEnd,
                color: EidolonColors.accent,
                child: child ?? const SizedBox.shrink(),
              )
          : null,
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
