import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { createMeeting, uploadAudio, updateMeetingStatus } from '@/lib/database';
import { registerForPushNotifications } from '@/lib/notifications';

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function RecordScreen() {
  const { isRecording, duration, startRecording, stopRecording, error } =
    useAudioRecording();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleRecording = async () => {
    if (isRecording) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsProcessing(true);

      try {
        const uri = await stopRecording();
        if (!uri) throw new Error('No recording file');

        const pushToken = await registerForPushNotifications();
        const meeting = await createMeeting(duration);
        const audioUrl = await uploadAudio(uri, meeting.id);
        await updateMeetingStatus(meeting.id, 'processing', audioUrl);

        // Trigger backend processing
        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
        await fetch(`${backendUrl}/process-meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audio_url: audioUrl,
            meeting_id: meeting.id,
            push_token: pushToken ?? '',
          }),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong';
        Alert.alert('Error', message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await startRecording();
    }
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Text style={styles.timer}>{formatDuration(duration)}</Text>

      <Text style={styles.statusText}>
        {isProcessing
          ? 'Uploading & processing...'
          : isRecording
            ? 'Recording in progress'
            : 'Tap to start recording'}
      </Text>

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
        <Ionicons
          name={isRecording ? 'stop' : 'mic'}
          size={48}
          color={isRecording ? '#FFFFFF' : '#F59E0B'}
        />
      </Pressable>

      {isRecording && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  timer: {
    fontSize: 56,
    fontWeight: '200',
    color: '#F5F5F0',
    fontVariant: ['tabular-nums'],
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 48,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1E1E23',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  recordButtonActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
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
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  liveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: 2,
  },
});
