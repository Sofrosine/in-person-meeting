import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMeeting } from '@/lib/database';
import type { Meeting } from '@/lib/types';

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    getMeeting(id)
      .then(setMeeting)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load meeting'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (error || !meeting) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error ?? 'Meeting not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>{meeting.title ?? 'Untitled Meeting'}</Text>
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color="#6B6B6B" />
          <Text style={styles.metaText}>{formatDate(meeting.created_at)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color="#6B6B6B" />
          <Text style={styles.metaText}>{formatDuration(meeting.duration)}</Text>
        </View>
      </View>

      {/* Summary */}
      {meeting.summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{meeting.summary}</Text>
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
          <ActivityIndicator size="small" color="#F59E0B" />
          <Text style={styles.processingText}>
            {meeting.status === 'processing'
              ? 'Transcription in progress...'
              : meeting.status === 'failed'
                ? 'Transcription failed'
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
    backgroundColor: '#0D0D0F',
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D0F',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F0',
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
    color: '#6B6B6B',
  },
  summaryCard: {
    backgroundColor: '#1E1E23',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#F5F5F0',
  },
  section: {
    marginBottom: 24,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 26,
    color: '#A0A0A0',
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E1E23',
    borderRadius: 16,
    padding: 20,
  },
  processingText: {
    fontSize: 14,
    color: '#A0A0A0',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
});
