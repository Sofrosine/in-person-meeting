import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRecording } from '@/lib/RecordingContext';
import { colors } from '@/lib/theme';

export default function TabLayout() {
  const { isRecording } = useRecording();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="mic-outline" size={size} color={color} />
              {isRecording && <View style={styles.recordingDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  recordingDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
});
