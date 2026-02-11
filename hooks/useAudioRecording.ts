import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  IOSOutputFormat,
  AudioQuality,
} from 'expo-audio';
import type { RecordingOptions, RecordingStatus, RecorderState } from 'expo-audio';

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
  /** Whether the recording is currently active (recording or paused) */
  isRecording: boolean;
  /** Whether the recording is paused */
  isPaused: boolean;
  /** Elapsed recording time in seconds (driven by expo-audio state hook) */
  duration: number;
  /** Current audio metering level (0-1) for visualizations */
  metering: number;
  /** Start a new recording session */
  startRecording: () => Promise<void>;
  /** Stop the recording and return the local file URI */
  stopRecording: () => Promise<string | null>;
  /** Pause or resume the recording */
  togglePause: () => Promise<void>;
  /** The most recent error message, or null */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAudioRecording(): UseAudioRecording {
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const isActiveRef = useRef(false);

  // Resolver for the stop() promise — waits for the isFinished callback
  // so the file is fully flushed to disk before we read the URI.
  const finishedResolverRef = useRef<((url: string | null) => void) | null>(null);

  // Status listener for recording completion/error events
  const onRecordingStatus = useCallback((status: RecordingStatus) => {
    if (status.isFinished) {
      if (finishedResolverRef.current) {
        finishedResolverRef.current(status.url);
        finishedResolverRef.current = null;
      }
      if (isActiveRef.current) {
        isActiveRef.current = false;
        setIsSessionActive(false);
        setIsPaused(false);
      }
    }
    if (status.hasError && status.error) {
      setError(status.error);
      if (finishedResolverRef.current) {
        finishedResolverRef.current(null);
        finishedResolverRef.current = null;
      }
      isActiveRef.current = false;
      setIsSessionActive(false);
      setIsPaused(false);
    }
  }, []);

  // expo-audio hooks: recorder instance + polling state
  const recorder = useAudioRecorder(MEETING_RECORDING_OPTIONS, onRecordingStatus);
  const recorderState: RecorderState = useAudioRecorderState(recorder, 500);

  // Use session state (not polled state) to avoid UI blip on resume
  const isRecording = isSessionActive;
  const duration = Math.floor(recorderState.durationMillis / 1000);
  const metering = recorderState.metering !== undefined && !isPaused
    ? Math.max(0, Math.min(1, (recorderState.metering + 60) / 60))
    : 0;

  // ---- Handle media services reset (iOS system interruption) --------
  useEffect(() => {
    if (recorderState.mediaServicesDidReset && isActiveRef.current) {
      isActiveRef.current = false;
      setIsSessionActive(false);
      setIsPaused(false);
      setError('Recording was interrupted by the system.');
    }
  }, [recorderState.mediaServicesDidReset]);

  // ---- Cleanup on unmount -------------------------------------------
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        recorder.stop();
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
      setIsPaused(false);
      setIsSessionActive(false);

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
      setIsSessionActive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      isActiveRef.current = false;
      setIsSessionActive(false);
    }
  }, [recorder]);

  // ---- Toggle pause/resume -------------------------------------------
  const togglePause = useCallback(async () => {
    try {
      if (!isActiveRef.current) return;

      if (isPaused) {
        recorder.record();
        setIsPaused(false);
      } else {
        recorder.pause();
        setIsPaused(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause/resume';
      setError(message);
    }
  }, [recorder, isPaused]);

  // ---- Stop recording -----------------------------------------------
  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!isActiveRef.current) {
        return null;
      }

      // If paused, resume briefly so stop works correctly
      if (isPaused) {
        recorder.record();
        setIsPaused(false);
      }

      // Create a promise that resolves when the RecordingStatus callback
      // fires with isFinished: true — this ensures the file is fully
      // written to disk before we try to upload it.
      const uriPromise = new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => {
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
      setIsSessionActive(false);

      // Wait for the file to be fully written
      const uri = await uriPromise;

      // Reset audio mode
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
      });

      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      isActiveRef.current = false;
      setIsSessionActive(false);
      setIsPaused(false);
      finishedResolverRef.current = null;
      return null;
    }
  }, [recorder, isPaused]);

  return { isRecording, isPaused, duration, metering, startRecording, stopRecording, togglePause, error };
}
