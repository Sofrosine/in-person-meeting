import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import type { RecordingStatus } from 'expo-av/build/Audio';
import * as Notifications from 'expo-notifications';

// ---------------------------------------------------------------------------
// Custom recording preset optimized for voice / meeting capture
// ---------------------------------------------------------------------------
// M4A/AAC provides good compression with high fidelity for speech.
// 128kbps mono is plenty for voice while keeping file sizes reasonable
// (~1 MB/minute). Compatible across iOS and Android.
const MEETING_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface UseAudioRecording {
  /** Whether the recording is currently active */
  isRecording: boolean;
  /** Elapsed recording time in seconds (driven by expo-av status callbacks) */
  duration: number;
  /** Current audio metering level (0-1) for visualizations */
  metering: number;
  /** Start a new recording session */
  startRecording: () => Promise<void>;
  /** Stop the recording and return the local file URI */
  stopRecording: () => Promise<string | null>;
  /** The most recent error message, or null */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Android foreground notification for recording
// ---------------------------------------------------------------------------
// On Android, a persistent notification signals that the app is performing
// active work. This satisfies the OS requirement for foreground services
// and gives the user a way to return to the app.
const ANDROID_NOTIFICATION_ID = 'recording-active';

async function showAndroidRecordingNotification(): Promise<string | undefined> {
  if (Platform.OS !== 'android') return undefined;

  return Notifications.scheduleNotificationAsync({
    identifier: ANDROID_NOTIFICATION_ID,
    content: {
      title: 'Recording in progress',
      body: 'Tap to return to Meeting Notes',
      sticky: true,
      autoDismiss: false,
      data: { type: 'recording-active' },
    },
    trigger: { channelId: 'recording' },
  });
}

async function dismissAndroidRecordingNotification(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.dismissNotificationAsync(ANDROID_NOTIFICATION_ID);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAudioRecording(): UseAudioRecording {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [metering, setMetering] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // ---- Cleanup on unmount --------------------------------------------
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        dismissAndroidRecordingNotification();
      }
    };
  }, []);

  // ---- Handle app state changes (background → foreground) ------------
  // When the app returns to the foreground, sync the duration from the
  // recording status to ensure the timer is accurate after being in the
  // background (where JS timers are throttled/paused).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.durationMillis !== undefined) {
            setDuration(Math.floor(status.durationMillis / 1000));
          }
        } catch {
          // Recording may have been invalidated – ignore
        }
      }
    });

    return () => subscription.remove();
  }, []);

  // ---- Recording status callback -------------------------------------
  // expo-av fires this at ~500ms intervals. We use it for the timer and
  // metering instead of setInterval, which drifts and stops in background.
  const onRecordingStatusUpdate = useCallback((status: RecordingStatus) => {
    if (status.isRecording) {
      setDuration(Math.floor((status.durationMillis ?? 0) / 1000));
      // Metering is in dBFS (negative). Normalize to 0–1 range.
      if (status.metering !== undefined) {
        const normalized = Math.max(0, Math.min(1, (status.metering + 60) / 60));
        setMetering(normalized);
      }
    }

    // Handle interruptions (e.g., phone call)
    if (status.isDoneRecording && !status.isRecording && recordingRef.current) {
      // The OS interrupted the recording (phone call, another audio app, etc.)
      // The recording file is still valid up to the interruption point.
      setIsRecording(false);
      setMetering(0);
      dismissAndroidRecordingNotification();
    }
  }, []);

  // ---- Start recording -----------------------------------------------
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // 1. Request permission
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required to record meetings.');
        return;
      }

      // 2. Configure audio mode for background recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // CRITICAL – keeps audio session alive
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
      });

      // 3. Create and start the recording
      const { recording } = await Audio.Recording.createAsync(
        MEETING_RECORDING_OPTIONS,
        onRecordingStatusUpdate,
        500, // status update interval in ms
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);
      setMetering(0);

      // 4. Show persistent notification on Android
      await showAndroidRecordingNotification();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      setIsRecording(false);
    }
  }, [onRecordingStatusUpdate]);

  // ---- Stop recording ------------------------------------------------
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        setIsRecording(false);
        return null;
      }

      // Get final status before stopping for accurate duration
      const finalStatus = await recordingRef.current.getStatusAsync();
      if (finalStatus.durationMillis) {
        setDuration(Math.floor(finalStatus.durationMillis / 1000));
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      setIsRecording(false);
      setMetering(0);

      // Dismiss Android recording notification
      await dismissAndroidRecordingNotification();

      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      setIsRecording(false);
      await dismissAndroidRecordingNotification();
      return null;
    }
  }, []);

  return { isRecording, duration, metering, startRecording, stopRecording, error };
}
