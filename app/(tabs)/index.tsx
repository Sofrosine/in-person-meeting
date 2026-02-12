import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRecording } from '@/contexts/RecordingContext';
import { createMeeting, uploadAudio, updateMeetingStatus } from '@/lib/database';
import { registerForPushNotifications } from '@/lib/notifications';
import { formatTimer } from '@/lib/formatters';
import { colors } from '@/lib/theme';

export default function RecordScreen() {
  const {
    isRecording, isPaused, duration, metering,
    startRecording, stopRecording, togglePause, error,
  } = useRecording();
  const [isProcessing, setIsProcessing] = useState(false);

  // Smooth metering animation with Reanimated spring
  const glowScale = useSharedValue(1);

  useEffect(() => {
    const target = isRecording && !isPaused ? 1 + metering * 0.25 : 1;
    glowScale.value = withSpring(target, {
      damping: 15,
      stiffness: 120,
      mass: 0.5,
    });
  }, [metering, isRecording, isPaused, glowScale]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const handleStart = async () => {
    if (isProcessing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await startRecording();
  };

  const handleStop = async () => {
    if (isProcessing) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
      const uri = await stopRecording();
      if (!uri) throw new Error('No recording file produced');

      const pushToken = await registerForPushNotifications();
      const meeting = await createMeeting(duration);
      const audioUrl = await uploadAudio(uri, meeting.id);
      await updateMeetingStatus(meeting.id, 'processing', audioUrl);

      // Trigger backend processing
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/process-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_url: audioUrl,
          meeting_id: meeting.id,
          push_token: pushToken ?? '',
        }),
      });

      if (!response.ok) {
        throw new Error('Backend processing request failed');
      }

      Alert.alert(
        'Recording saved',
        'Your meeting is being transcribed. You\'ll get a notification when it\'s ready.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePause = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await togglePause();
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Timer */}
      <Text style={[styles.timer, isRecording && styles.timerActive]}>
        {formatTimer(duration)}
      </Text>

      {/* Status */}
      <Text style={styles.statusText}>
        {isProcessing
          ? 'Uploading & processing...'
          : isPaused
            ? 'Recording paused'
            : isRecording
              ? 'Recording — you can leave the app'
              : 'Tap to start recording'}
      </Text>

      {/* Buttons */}
      {!isRecording ? (
        // Start button
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleStart}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.recordButton,
              pressed && styles.recordButtonPressed,
              isProcessing && styles.recordButtonDisabled,
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color={colors.text} />
            ) : (
              <Ionicons name="mic" size={48} color={colors.accent} />
            )}
          </Pressable>
        </View>
      ) : (
        // Pause + Stop buttons
        <View style={styles.controlsRow}>
          {/* Pause / Resume */}
          <Pressable
            onPress={handlePause}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.controlButton,
              styles.pauseButton,
              pressed && styles.recordButtonPressed,
            ]}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={32}
              color={colors.accent}
            />
          </Pressable>

          {/* Stop */}
          <View style={styles.buttonContainer}>
            {/* Metering glow ring (smooth spring animation) */}
            {!isPaused && (
              <Animated.View style={[styles.glowRing, glowAnimatedStyle]} />
            )}
            <Pressable
              onPress={handleStop}
              disabled={isProcessing}
              style={({ pressed }) => [
                styles.recordButton,
                styles.recordButtonActive,
                pressed && styles.recordButtonPressed,
                isProcessing && styles.recordButtonDisabled,
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color={colors.text} />
              ) : (
                <Ionicons name="stop" size={48} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {/* Spacer to center stop button */}
          <View style={styles.controlButtonSpacer} />
        </View>
      )}

      {/* Live / Paused indicator */}
      {isRecording && (
        <View style={styles.liveIndicator}>
          <View style={[styles.liveDot, isPaused && styles.liveDotPaused]} />
          <Text style={[styles.liveText, isPaused && styles.liveTextPaused]}>
            {isPaused ? 'PAUSED' : 'LIVE'}
          </Text>
        </View>
      )}

      {/* Background hint */}
      {isRecording && !isPaused && (
        <Text style={styles.hintText}>
          Recording continues in background and when screen is locked
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  timer: {
    fontSize: 56,
    fontWeight: '200',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    marginBottom: 12,
  },
  timerActive: {
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 48,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonSpacer: {
    width: 56,
  },
  pauseButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  buttonContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  recordButtonActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
    borderRadius: 24,
  },
  recordButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: 8,
  },
  liveDotPaused: {
    backgroundColor: colors.accent,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
    letterSpacing: 2,
  },
  liveTextPaused: {
    color: colors.accent,
  },
  hintText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 48,
  },
});
