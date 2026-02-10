---
name: config-plugin
description: Build the custom Expo config plugin that enables background audio recording on iOS and Android. This is the HIGHEST weighted criteria (25%) - must correctly configure native projects.
argument-hint: "[ios|android|both]"
---

# Config Plugin - Background Audio Recording

Build the custom Expo config plugin for background audio recording. **This is 25% of the evaluation.**

## Task Context

The config plugin must configure native iOS and Android projects to allow audio recording that continues when the app is backgrounded or the screen is locked.

## What to Implement

Create the plugin at `/plugins/withBackgroundAudio.ts` (or `.js`).

### iOS Configuration (Info.plist modifications):

1. **UIBackgroundModes** - Add `'audio'` to the array to enable background audio
2. **NSMicrophoneUsageDescription** - Add microphone usage description string (e.g., "This app needs microphone access to record meetings")
3. **AVAudioSession category** - Configure for recording (this is typically done in app code, but document the approach)

### Android Configuration (AndroidManifest.xml modifications):

1. **Permissions**:
   - `android.permission.RECORD_AUDIO`
   - `android.permission.FOREGROUND_SERVICE`
   - `android.permission.FOREGROUND_SERVICE_MICROPHONE` (Android 14+)
2. **Foreground Service**:
   - Add `<service>` element with `android:foregroundServiceType="microphone"`
   - The service should be used for background recording
3. **Notification Channel**:
   - Configure notification channel for the foreground service indicator

### Plugin Structure

```typescript
// plugins/withBackgroundAudio.ts
import { ConfigPlugin, withInfoPlist, withAndroidManifest } from 'expo/config-plugins';

const withBackgroundAudio: ConfigPlugin = (config) => {
  // 1. iOS: Modify Info.plist
  config = withInfoPlist(config, (config) => {
    // Add UIBackgroundModes audio
    // Add NSMicrophoneUsageDescription
    return config;
  });

  // 2. Android: Modify AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    // Add permissions
    // Add foreground service
    return config;
  });

  return config;
};

export default withBackgroundAudio;
```

### Register in app.config.ts / app.json:

```json
{
  "plugins": [
    "./plugins/withBackgroundAudio"
  ]
}
```

## Verification

After creating the plugin:
1. Run `npx expo prebuild --clean` to generate native projects
2. Check `ios/<app>/Info.plist` contains UIBackgroundModes with audio
3. Check `ios/<app>/Info.plist` contains NSMicrophoneUsageDescription
4. Check `android/app/src/main/AndroidManifest.xml` contains RECORD_AUDIO permission
5. Check `android/app/src/main/AndroidManifest.xml` contains FOREGROUND_SERVICE permission
6. Check `android/app/src/main/AndroidManifest.xml` contains the foreground service declaration

## Key Considerations
- Use `@expo/config-plugins` API properly (withInfoPlist, withAndroidManifest, etc.)
- Don't overwrite existing UIBackgroundModes - merge with existing array
- Android 14+ requires `FOREGROUND_SERVICE_MICROPHONE` specifically
- Export the plugin as the default export
- Add proper TypeScript types
