import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  IOSOutputFormat,
  AudioQuality,
} from 'expo-audio';
import type { RecordingOptions, RecordingStatus, RecorderState } from 'expo-audio';
import * as Notifications from 'expo-notifications';

// ---------------------------------------------------------------------------
// Custom recording preset optimized for voice / meeting capture
// ---------------------------------------------------------------------------
// M4A/AAC provides good compression with high fidelity for speech.
// 128kbps mono is plenty for voice while keeping file sizes reasonable
// (~1 MB/minute). Compatible across iOS and Android.
const MEETING_RECORDING_OPTIONS: RecordingOptions = {
  isMeteringEnabled: true,
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
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
  /** Elapsed recording time in seconds (driven by expo-audio state hook) */
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
  const [error, setError] = useState<string | null>(null);
  const isActiveRef = useRef(false);

  // Resolver for the stop() promise — waits for the isFinished callback
  // so the file is fully flushed to disk before we read the URI.
  const finishedResolverRef = useRef<((url: string | null) => void) | null>(null);

  // Status listener for recording completion/error events
  const onRecordingStatus = useCallback((status: RecordingStatus) => {
    if (status.isFinished) {
      // Resolve the pending stop promise with the final file URL
      if (finishedResolverRef.current) {
        finishedResolverRef.current(status.url);
        finishedResolverRef.current = null;
      }
      if (isActiveRef.current) {
        isActiveRef.current = false;
        dismissAndroidRecordingNotification();
      }
    }
    if (status.hasError && status.error) {
      setError(status.error);
      if (finishedResolverRef.current) {
        finishedResolverRef.current(null);
        finishedResolverRef.current = null;
      }
      isActiveRef.current = false;
      dismissAndroidRecordingNotification();
    }
  }, []);

  // expo-audio hooks: recorder instance + polling state
  const recorder = useAudioRecorder(MEETING_RECORDING_OPTIONS, onRecordingStatus);
  const recorderState: RecorderState = useAudioRecorderState(recorder, 500);

  // Derive values from the polled recorder state
  const isRecording = recorderState.isRecording;
  const duration = Math.floor(recorderState.durationMillis / 1000);
  const metering = recorderState.metering !== undefined
    ? Math.max(0, Math.min(1, (recorderState.metering + 60) / 60))
    : 0;

  // ---- Handle media services reset (iOS system interruption) --------
  useEffect(() => {
    if (recorderState.mediaServicesDidReset && isActiveRef.current) {
      isActiveRef.current = false;
      setError('Recording was interrupted by the system.');
      dismissAndroidRecordingNotification();
    }
  }, [recorderState.mediaServicesDidReset]);

  // ---- Cleanup on unmount -------------------------------------------
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        recorder.stop();
        dismissAndroidRecordingNotification();
      }
    };
  }, [recorder]);

  // ---- Handle app state changes (background → foreground) -----------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', () => {
      // RecorderState hook auto-syncs on next poll; no manual action needed
    });
    return () => subscription.remove();
  }, []);

  // ---- Start recording ----------------------------------------------
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // 1. Request permission
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone permission is required to record meetings.');
        return;
      }

      // 2. Configure audio mode for background recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });

      // 3. Prepare and start
      await recorder.prepareToRecordAsync();
      recorder.record();
      isActiveRef.current = true;

      // 4. Show persistent notification on Android
      await showAndroidRecordingNotification();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      isActiveRef.current = false;
    }
  }, [recorder]);

  // ---- Stop recording -----------------------------------------------
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!isActiveRef.current) {
        return null;
      }

      // Create a promise that resolves when the RecordingStatus callback
      // fires with isFinished: true — this ensures the file is fully
      // written to disk before we try to upload it.
      const uriPromise = new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => {
          // Safety fallback: if callback doesn't fire within 5s, use recorder.uri
          if (finishedResolverRef.current) {
            finishedResolverRef.current = null;
            resolve(recorder.uri);
          }
        }, 5000);

        finishedResolverRef.current = (url) => {
          clearTimeout(timeout);
          resolve(url);
        };
      });

      await recorder.stop();
      isActiveRef.current = false;

      // Wait for the file to be fully written
      const uri = await uriPromise;

      // Reset audio mode
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
      });

      // Dismiss Android recording notification
      await dismissAndroidRecordingNotification();

      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      isActiveRef.current = false;
      finishedResolverRef.current = null;
      await dismissAndroidRecordingNotification();
      return null;
    }
  }, [recorder]);

  return { isRecording, duration, metering, startRecording, stopRecording, error };
}
