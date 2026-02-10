import { ConfigPlugin, withInfoPlist, withAndroidManifest } from '@expo/config-plugins';

/**
 * Custom Expo config plugin to enable background audio recording on iOS and Android.
 *
 * iOS: Adds UIBackgroundModes 'audio', NSMicrophoneUsageDescription
 * Android: Adds RECORD_AUDIO, FOREGROUND_SERVICE, FOREGROUND_SERVICE_MICROPHONE permissions,
 *          foreground service type, and notification channel
 */
const withBackgroundAudio: ConfigPlugin = (config) => {
  // --- iOS Configuration ---
  config = withInfoPlist(config, (iosConfig) => {
    const plist = iosConfig.modResults;

    // Enable background audio mode
    if (!plist.UIBackgroundModes) {
      plist.UIBackgroundModes = [];
    }
    if (!plist.UIBackgroundModes.includes('audio')) {
      plist.UIBackgroundModes.push('audio');
    }

    // Microphone usage description
    if (!plist.NSMicrophoneUsageDescription) {
      plist.NSMicrophoneUsageDescription =
        'This app needs microphone access to record your in-person meetings.';
    }

    return iosConfig;
  });

  // --- Android Configuration ---
  config = withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;

    // Add required permissions
    const permissions = [
      'android.permission.RECORD_AUDIO',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    ];

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    for (const perm of permissions) {
      const exists = manifest['uses-permission'].some(
        (p) => p.$?.['android:name'] === perm,
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    // Add foreground service with microphone type to application
    const application = manifest.application?.[0];
    if (application) {
      if (!application.service) {
        application.service = [];
      }

      const serviceName = 'com.meetingnotes.app.AudioRecordingService';
      const serviceExists = application.service.some(
        (s) => s.$?.['android:name'] === serviceName,
      );

      if (!serviceExists) {
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

  return config;
};

export default withBackgroundAudio;
