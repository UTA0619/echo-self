// All values injected via --dart-define-from-file=.env.json at build time.
// Never hardcode real values here.
abstract final class AppEnv {
  // ── Firebase ────────────────────────────────────────────────────
  static const firebaseProjectId =
      String.fromEnvironment('FIREBASE_PROJECT_ID');
  static const firebaseApiKeyAndroid =
      String.fromEnvironment('FIREBASE_API_KEY_ANDROID');
  static const firebaseApiKeyIos =
      String.fromEnvironment('FIREBASE_API_KEY_IOS');
  static const firebaseApiKeyWeb =
      String.fromEnvironment('FIREBASE_API_KEY_WEB');
  static const firebaseAppIdAndroid =
      String.fromEnvironment('FIREBASE_APP_ID_ANDROID');
  static const firebaseAppIdIos = String.fromEnvironment('FIREBASE_APP_ID_IOS');
  static const firebaseAppIdWeb = String.fromEnvironment('FIREBASE_APP_ID_WEB');
  static const firebaseMessagingSenderId =
      String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const firebaseStorageBucket =
      String.fromEnvironment('FIREBASE_STORAGE_BUCKET');
  static const firebaseIosBundleId =
      String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID');

  // ── Supabase ────────────────────────────────────────────────────
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  // ── RevenueCat ──────────────────────────────────────────────────
  static const revenueCatApiKeyAndroid =
      String.fromEnvironment('REVENUECAT_API_KEY_ANDROID');
  static const revenueCatApiKeyIos =
      String.fromEnvironment('REVENUECAT_API_KEY_IOS');

  // ── Sentry ──────────────────────────────────────────────────────
  static const sentryDsn = String.fromEnvironment('SENTRY_DSN');

  // ── Mixpanel ────────────────────────────────────────────────────
  static const mixpanelToken = String.fromEnvironment('MIXPANEL_TOKEN');

  // ── App ─────────────────────────────────────────────────────────
  static const environment =
      String.fromEnvironment('APP_ENV', defaultValue: 'development');
  static bool get isProduction => environment == 'production';
  static bool get isDevelopment => environment == 'development';
}
