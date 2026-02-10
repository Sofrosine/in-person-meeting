import { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMeetings } from '@/lib/database';
import { formatDate, formatDuration } from '@/lib/formatters';
import { colors } from '@/lib/theme';
import type { Meeting, MeetingStatus } from '@/lib/types';

const STATUS_CONFIG: Record<MeetingStatus, { color: string; label: string }> = {
  recording: { color: colors.error, label: 'Recording' },
  uploading: { color: colors.accent, label: 'Uploading' },
  processing: { color: colors.accent, label: 'Processing' },
  completed: { color: colors.success, label: 'Completed' },
  failed: { color: colors.error, label: 'Failed' },
};

export default function MeetingsScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchMeetings = useCallback(async () => {
    try {
      setError(null);
      const data = await getMeetings();
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchMeetings();
    }, [fetchMeetings]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMeetings();
  }, [fetchMeetings]);

  const renderMeeting = ({ item }: { item: Meeting }) => {
    const statusConfig = STATUS_CONFIG[item.status];

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/meeting/${item.id}`)}
      >
        <View style={[styles.statusBar, { backgroundColor: statusConfig.color }]} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title ?? 'Untitled Meeting'}
          </Text>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.cardDuration}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />{' '}
              {formatDuration(item.duration)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}20` }]}>
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={meetings}
        keyExtractor={(item) => item.id}
        renderItem={renderMeeting}
        contentContainerStyle={meetings.length === 0 ? styles.centered : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
              <Text style={styles.emptyTitle}>{error}</Text>
              <Pressable onPress={() => { setRefreshing(true); fetchMeetings(); }} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="mic-off-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No meetings yet</Text>
              <Text style={styles.emptySubtitle}>
                Record your first meeting from the Record tab
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.8,
  },
  statusBar: {
    width: 3,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDuration: {
    fontSize: 13,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});
