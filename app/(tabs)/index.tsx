import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRecording } from '@/lib/RecordingContext';
import { createMeeting, uploadAudio, updateMeetingStatus } from '@/lib/database';
import { registerForPushNotifications } from '@/lib/notifications';
import { formatTimer } from '@/lib/formatters';
import { colors } from '@/lib/theme';

export default function RecordScreen() {
  const { isRecording, duration, metering, startRecording, stopRecording, error } =
    useRecording();
  const [isProcessing, setIsProcessing] = useState(false);

  // Smooth metering animation with Reanimated spring
  const glowScale = useSharedValue(1);

  useEffect(() => {
    const target = isRecording ? 1 + metering * 0.25 : 1;
    glowScale.value = withSpring(target, {
      damping: 15,
      stiffness: 120,
      mass: 0.5,
    });
  }, [metering, isRecording, glowScale]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const handleToggleRecording = async () => {
    if (isProcessing) return;

    if (isRecording) {
      // ---- Stop recording & upload ------------------------------------
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
    } else {
      // ---- Start recording --------------------------------------------
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await startRecording();
    }
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
          : isRecording
            ? 'Recording — you can leave the app'
            : 'Tap to start recording'}
      </Text>

      {/* Record / Stop button */}
      <View style={styles.buttonContainer}>
        {/* Metering glow ring (smooth spring animation) */}
        {isRecording && (
          <Animated.View style={[styles.glowRing, glowAnimatedStyle]} />
        )}

        <Pressable
          onPress={handleToggleRecording}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            pressed && styles.recordButtonPressed,
            isProcessing && styles.recordButtonDisabled,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color={colors.text} />
          ) : (
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={48}
              color={isRecording ? '#FFFFFF' : colors.accent}
            />
          )}
        </Pressable>
      </View>

      {/* Live indicator */}
      {isRecording && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}

      {/* Background hint */}
      {isRecording && (
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
  liveText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
    letterSpacing: 2,
  },
  hintText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 48,
  },
});
