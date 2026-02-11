import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  type TextStyle,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getMeeting } from '@/lib/database';
import { formatDuration, formatDateLong, formatTimer } from '@/lib/formatters';
import { colors } from '@/lib/theme';
import type { Meeting } from '@/lib/types';

/**
 * Simple markdown text renderer for meeting summaries.
 * Handles **bold**, - bullet points, and line breaks.
 * Headings (lines with bold text and no bullet) are rendered at root level;
 * bullet items are indented beneath them.
 */
function MarkdownText({ text, style }: { text: string; style?: TextStyle }) {
  const lines = text.split('\n');

  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={lineIdx} style={{ height: 8 }} />;

        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const content = isBullet ? trimmed.slice(2) : trimmed;

        // Parse **bold** segments
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={partIdx} style={{ fontWeight: '700', color: colors.text }}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={partIdx}>{part}</Text>;
        });

        if (isBullet) {
          return (
            <View key={lineIdx} style={{ flexDirection: 'row', paddingLeft: 16 }}>
              <Text style={[style, { marginRight: 8, color: colors.accent }]}>{'•'}</Text>
              <Text style={[style, { flex: 1 }]}>{rendered}</Text>
            </View>
          );
        }

        return (
          <Text key={lineIdx} style={[style, { marginTop: lineIdx > 0 ? 8 : 0 }]}>
            {rendered}
          </Text>
        );
      })}
    </View>
  );
}

/**
 * Audio playback controls for the meeting recording.
 */
function AudioPlayer({ url }: { url: string }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const currentTime = Math.floor(status.currentTime);
  const totalDuration = Math.floor(status.duration);
  const progress = totalDuration > 0 ? currentTime / totalDuration : 0;

  const togglePlayback = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View style={audioStyles.container}>
      <Pressable onPress={togglePlayback} style={audioStyles.playButton}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color={colors.accent}
        />
      </Pressable>
      <View style={audioStyles.progressContainer}>
        <View style={audioStyles.progressBar}>
          <View style={[audioStyles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={audioStyles.timeRow}>
          <Text style={audioStyles.timeText}>{formatTimer(currentTime)}</Text>
          <Text style={audioStyles.timeText}>{formatTimer(totalDuration)}</Text>
        </View>
      </View>
    </View>
  );
}

const audioStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flex: 1,
    gap: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMeeting = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMeeting(id);
      setMeeting(data);
      setError(null);

      // Stop polling once processing is done
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  // Auto-poll every 5s while meeting is still processing
  useEffect(() => {
    if (meeting && (meeting.status === 'processing' || meeting.status === 'uploading')) {
      pollRef.current = setInterval(fetchMeeting, 5000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [meeting?.status, fetchMeeting]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !meeting) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error ?? 'Meeting not found'}</Text>
        <Pressable onPress={fetchMeeting} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>{meeting.title ?? 'Untitled Meeting'}</Text>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatDateLong(meeting.created_at)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatDuration(meeting.duration)}</Text>
        </View>
      </View>

      {/* Audio Player */}
      {meeting.audio_url && meeting.status === 'completed' && (
        <View>
          <Text style={styles.sectionTitle}>Recording</Text>
          <AudioPlayer url={meeting.audio_url} />
        </View>
      )}

      {/* Summary */}
      {meeting.summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <MarkdownText text={meeting.summary} style={styles.summaryText} />
        </View>
      )}

      {/* Transcript */}
      {meeting.transcript ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcript</Text>
          <Text style={styles.transcriptText}>{meeting.transcript}</Text>
        </View>
      ) : (
        <View style={styles.processingCard}>
          {meeting.status === 'failed' ? (
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
          ) : (
            <ActivityIndicator size="small" color={colors.accent} />
          )}
          <Text style={styles.processingText}>
            {meeting.status === 'processing'
              ? 'Transcription in progress...'
              : meeting.status === 'uploading'
                ? 'Uploading audio...'
                : meeting.status === 'failed'
                  ? 'Transcription failed. Please try again.'
                  : 'Waiting for processing...'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  meta: {
    gap: 8,
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  processingText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginTop: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});
