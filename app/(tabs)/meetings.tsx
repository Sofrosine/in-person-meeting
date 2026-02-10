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
import type { Meeting, MeetingStatus } from '@/lib/types';

const STATUS_CONFIG: Record<MeetingStatus, { color: string; label: string }> = {
  recording: { color: '#EF4444', label: 'Recording' },
  uploading: { color: '#F59E0B', label: 'Uploading' },
  processing: { color: '#F59E0B', label: 'Processing' },
  completed: { color: '#10B981', label: 'Completed' },
  failed: { color: '#EF4444', label: 'Failed' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function MeetingsScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchMeetings = useCallback(async () => {
    try {
      const data = await getMeetings();
      setMeetings(data);
    } catch {
      // Silently handle - show empty state
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
              <Ionicons name="time-outline" size={12} color="#6B6B6B" />{' '}
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
        <ActivityIndicator size="large" color="#F59E0B" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="mic-off-outline" size={48} color="#6B6B6B" />
            <Text style={styles.emptyTitle}>No meetings yet</Text>
            <Text style={styles.emptySubtitle}>
              Record your first meeting from the Record tab
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D0D0F',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E1E23',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
    color: '#F5F5F0',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 13,
    color: '#6B6B6B',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDuration: {
    fontSize: 13,
    color: '#6B6B6B',
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
    color: '#F5F5F0',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
  },
});
