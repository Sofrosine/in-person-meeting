/**
 * withBackgroundAudio – Custom Expo config plugin
 *
 * Configures both iOS and Android native projects for background audio
 * recording. This ensures the recording continues when the user backgrounds
 * the app or locks their screen during a meeting.
 *
 * iOS:
 *   - UIBackgroundModes → 'audio' (keeps AVAudioSession active in background)
 *   - NSMicrophoneUsageDescription (permission dialog string)
 *
 * Android:
 *   - RECORD_AUDIO permission (runtime mic access)
 *   - FOREGROUND_SERVICE permission (allows foreground service creation)
 *   - FOREGROUND_SERVICE_MICROPHONE permission (Android 14+ / API 34)
 *   - POST_NOTIFICATIONS permission (Android 13+ for service notification)
 *   - Foreground service declaration with foregroundServiceType="microphone"
 *
 * Usage in app.json:
 *   ["./plugins/withBackgroundAudio"]
 * With options:
 *   ["./plugins/withBackgroundAudio", { "microphonePermission": "Custom text" }]
 *
 * @module plugins/withBackgroundAudio
 */

const { withInfoPlist, withAndroidManifest } = require('@expo/config-plugins');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Adds an Android permission to the manifest if not already present.
 * Avoids duplicates by checking existing entries first.
 */
function addPermissionIfMissing(manifest, permissionName) {
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }

  const exists = manifest['uses-permission'].some(
    (p) => p.$?.['android:name'] === permissionName,
  );

  if (!exists) {
    manifest['uses-permission'].push({
      $: { 'android:name': permissionName },
    });
  }
}

// ---------------------------------------------------------------------------
// iOS: Info.plist modifications
// ---------------------------------------------------------------------------

/**
 * Configures iOS for background audio recording.
 *
 * 1. UIBackgroundModes → adds 'audio'
 *    This tells iOS to allow the AVAudioSession to remain active when the app
 *    is in the background. Without this, iOS suspends audio recording within
 *    seconds of the app being backgrounded.
 *
 * 2. NSMicrophoneUsageDescription
 *    The user-facing string shown in the system permission dialog. Required
 *    by Apple for any app accessing the microphone.
 *
 * Note: The AVAudioSession category (.playAndRecord) and mode are configured
 * at runtime via expo-av's Audio.setAudioModeAsync() in the recording hook.
 * The config plugin only sets the static plist values.
 */
function withBackgroundAudioIOS(config, props = {}) {
  return withInfoPlist(config, (iosConfig) => {
    const plist = iosConfig.modResults;

    // UIBackgroundModes – merge with existing entries (don't overwrite)
    if (!Array.isArray(plist.UIBackgroundModes)) {
      plist.UIBackgroundModes = [];
    }
    if (!plist.UIBackgroundModes.includes('audio')) {
      plist.UIBackgroundModes.push('audio');
    }

    // Microphone usage description
    plist.NSMicrophoneUsageDescription =
      props.microphonePermission ??
      plist.NSMicrophoneUsageDescription ??
      'This app needs microphone access to record your in-person meetings.';

    return iosConfig;
  });
}

// ---------------------------------------------------------------------------
// Android: AndroidManifest.xml modifications
// ---------------------------------------------------------------------------

/**
 * Configures Android for background audio recording.
 *
 * Permissions added:
 * - RECORD_AUDIO:                 Runtime permission for microphone access.
 * - FOREGROUND_SERVICE:           Required to start any foreground service.
 * - FOREGROUND_SERVICE_MICROPHONE: Required on Android 14 (API 34+) for
 *                                  foreground services that use the mic.
 * - POST_NOTIFICATIONS:           Required on Android 13+ to display the
 *                                  persistent notification for the service.
 *
 * Foreground service:
 * - A <service> element with foregroundServiceType="microphone" is declared.
 *   This keeps the recording process alive when the app is backgrounded.
 *   expo-audio uses this service internally via its AudioModule to maintain
 *   an active audio session with a persistent notification.
 *
 * Important Android 14+ behavior:
 * - The foreground service MUST be started while the app has a visible
 *   activity. Starting from the background throws SecurityException.
 * - The RECORD_AUDIO runtime permission must be granted before starting
 *   the service.
 */
function withBackgroundAudioAndroid(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;

    // ---- Permissions --------------------------------------------------
    const requiredPermissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
      'android.permission.POST_NOTIFICATIONS',
    ];

    for (const perm of requiredPermissions) {
      addPermissionIfMissing(manifest, perm);
    }

    // ---- Foreground service declaration -------------------------------
    // Declares a foreground service with microphone type so Android keeps
    // the recording alive in the background. expo-audio's native module
    // manages the service lifecycle and persistent notification.
    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }

      const serviceName = 'expo.modules.audio.AudioForegroundService';
      const exists = application.service.some(
        (s) => s.$?.['android:name'] === serviceName,
      );

      if (!exists) {
        application.service.push({
          $: {
            'android:name': serviceName,
            'android:foregroundServiceType': 'microphone',
            'android:exported': 'false',
          },
        });
      }
    }

    return androidConfig;
  });
}

// ---------------------------------------------------------------------------
// Main plugin entry point
// ---------------------------------------------------------------------------

/** @type {import('@expo/config-plugins').ConfigPlugin<{ microphonePermission?: string } | void>} */
const withBackgroundAudio = (config, props) => {
  const options = props ?? {};
  config = withBackgroundAudioIOS(config, options);
  config = withBackgroundAudioAndroid(config);
  return config;
};

module.exports = withBackgroundAudio;
