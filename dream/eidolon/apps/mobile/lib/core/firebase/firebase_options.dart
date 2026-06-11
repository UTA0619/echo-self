import 'package:eidolon/core/env/app_env.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

// Generated from --dart-define-from-file env values.
// Do NOT commit real keys. Add .env.*.json to .gitignore.
final class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions not supported on ${defaultTargetPlatform.name}',
        );
    }
  }

  static FirebaseOptions get android => FirebaseOptions(
        apiKey: AppEnv.firebaseApiKeyAndroid,
        appId: AppEnv.firebaseAppIdAndroid,
        messagingSenderId: AppEnv.firebaseMessagingSenderId,
        projectId: AppEnv.firebaseProjectId,
        storageBucket: AppEnv.firebaseStorageBucket,
      );

  static FirebaseOptions get ios => FirebaseOptions(
        apiKey: AppEnv.firebaseApiKeyIos,
        appId: AppEnv.firebaseAppIdIos,
        messagingSenderId: AppEnv.firebaseMessagingSenderId,
        projectId: AppEnv.firebaseProjectId,
        storageBucket: AppEnv.firebaseStorageBucket,
        iosBundleId: AppEnv.firebaseIosBundleId,
      );

  static FirebaseOptions get web => FirebaseOptions(
        apiKey: AppEnv.firebaseApiKeyWeb,
        appId: AppEnv.firebaseAppIdWeb,
        messagingSenderId: AppEnv.firebaseMessagingSenderId,
        projectId: AppEnv.firebaseProjectId,
        storageBucket: AppEnv.firebaseStorageBucket,
        authDomain: '${AppEnv.firebaseProjectId}.firebaseapp.com',
      );
}
