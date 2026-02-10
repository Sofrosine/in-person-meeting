---
name: background-recording
description: Implement background audio recording using expo-av that survives app backgrounding and screen lock. This is 25% of evaluation - must handle interruptions reliably.
argument-hint: "[implement|debug|test]"
---

# Background Recording Implementation

Implement audio recording that continues when the app is backgrounded. **This is 25% of the evaluation.**

## Task Context

The user taps record, puts their phone in their pocket, and the recording continues for the entire meeting (potentially 30+ minutes). When they stop, the audio is uploaded.

## What to Implement

### 1. Recording Service Hook (`/hooks/useAudioRecording.ts`)

Create a custom hook that manages the recording lifecycle:

```typescript
interface UseAudioRecording {
  isRecording: boolean;
  duration: number; // seconds
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>; // returns file URI
  error: string | null;
}
```

### 2. Audio Recording Setup (using expo-av)

- **Audio Mode Configuration**:
  ```typescript
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true, // CRITICAL for background recording
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: false,
  });
  ```

- **Recording Options**: Use high quality preset suitable for voice:
  ```typescript
  Audio.RecordingOptionsPresets.HIGH_QUALITY
  // Or custom options optimized for speech
  ```

- **Permissions**: Request microphone permissions before recording

### 3. Background Handling

- **iOS**: The config plugin's `UIBackgroundModes: ['audio']` enables this. The `staysActiveInBackground: true` in Audio mode keeps the session active.

- **Android**: Need a foreground service notification. Use `expo-notifications` or `expo-task-manager` to show a persistent notification while recording. Consider using `react-native-foreground-service` or implementing via the config plugin's service declaration.

### 4. Recording State Management

Track recording state across the app:
- Use React Context or a simple state manager
- Persist recording state (in case of app restart)
- Handle interruptions gracefully:
  - Phone call interruption
  - Other app taking audio focus
  - Low memory warnings
  - App being killed by OS (save what we have)

### 5. Duration Timer

- Show elapsed recording time on the UI
- Use `setInterval` or recording status updates from expo-av
- `recording.setOnRecordingStatusUpdate()` for real-time status

### 6. Upload After Stop

When recording stops:
1. Get the local file URI from the recording
2. Upload to Supabase Storage
3. Get the public/signed URL
4. Create a meeting record in the database
5. Trigger the backend processing endpoint

## Error Handling

- Microphone permission denied
- Recording fails to start
- Background recording interrupted
- Upload fails (retry logic)
- Device runs out of storage

## Key Considerations
- Test with long recordings (30+ minutes)
- Audio file format: m4a (iOS) or 3gp/webm (Android) - consider standardizing
- Memory management for long recordings
- Battery considerations
- The recording MUST survive app backgrounding - this is critical
