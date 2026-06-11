/**
 * Expo Config Plugin — iOS Privacy Manifest (PrivacyInfo.xcprivacy)
 *
 * Required for all iOS apps submitted since May 2024.
 * Declares which privacy-sensitive APIs the app uses (Required Reason APIs).
 *
 * APIs declared below match the libraries bundled with this app:
 *   - NSPrivacyAccessedAPICategoryUserDefaults   (AsyncStorage via @react-native-async-storage)
 *   - NSPrivacyAccessedAPICategoryFileTimestamp  (expo-file-system)
 *   - NSPrivacyAccessedAPICategoryDiskSpace      (expo-file-system, Supabase storage)
 *   - NSPrivacyAccessedAPICategorySystemBootTime (react-native-reanimated, expo-haptics)
 *
 * Reference: https://developer.apple.com/documentation/bundleresources/privacy_manifest_files
 */

const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <!-- NSPrivacyTracking: false — we do NOT use data for tracking -->
  <key>NSPrivacyTracking</key>
  <false/>

  <!-- NSPrivacyTrackingDomains: empty — no tracking domains -->
  <key>NSPrivacyTrackingDomains</key>
  <array/>

  <!-- NSPrivacyCollectedDataTypes: data we collect and how it's used -->
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <!-- Email address (for authentication) -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <!-- User content (journal entries) -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeOtherUserContent</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <true/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <!-- Crash data (Sentry) -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeCrashData</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <false/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <!-- Performance data (PostHog analytics) -->
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypePerformanceData</string>
      <key>NSPrivacyCollectedDataTypeLinked</key>
      <false/>
      <key>NSPrivacyCollectedDataTypeTracking</key>
      <false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
      </array>
    </dict>
  </array>

  <!-- NSPrivacyAccessedAPITypes: Required Reason APIs used by dependencies -->
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- AsyncStorage reads/writes NSUserDefaults -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
    <!-- expo-file-system accesses file timestamps -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>C617.1</string>
      </array>
    </dict>
    <!-- expo-file-system / Supabase Storage checks disk space -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryDiskSpace</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>E174.1</string>
      </array>
    </dict>
    <!-- react-native-reanimated reads system boot time for animation timing -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>35F9.1</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`;

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @returns {import('@expo/config-plugins').ExpoConfig}
 */
const withPrivacyManifest = (config) =>
  withDangerousMod(config, [
    'ios',
    (innerConfig) => {
      const projectName = innerConfig.modRequest.projectName;
      const iosDir = path.join(innerConfig.modRequest.platformProjectRoot, projectName);

      // Create the directory if it doesn't exist (first EAS build)
      if (!fs.existsSync(iosDir)) {
        fs.mkdirSync(iosDir, { recursive: true });
      }

      const privacyManifestPath = path.join(iosDir, 'PrivacyInfo.xcprivacy');
      fs.writeFileSync(privacyManifestPath, PRIVACY_MANIFEST.trimStart());
      console.log('[withPrivacyManifest] Wrote', privacyManifestPath);

      return innerConfig;
    },
  ]);

module.exports = withPrivacyManifest;
