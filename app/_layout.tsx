import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { RecordingProvider } from '@/contexts/RecordingContext';
import { registerForPushNotifications } from '@/lib/notifications';
import { colors } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Redirect based on auth state and register push token on login
  useEffect(() => {
    if (loading) return;

    const inAuthScreen = segments[0] === 'login';

    if (!session && !inAuthScreen) {
      router.replace('/login');
    } else if (session && inAuthScreen) {
      router.replace('/(tabs)');
    }

    // Register push token whenever user is authenticated
    if (session) {
      registerForPushNotifications();
    }
  }, [session, loading, segments, router]);

  // Handle notification tap -> deep link to meeting detail screen
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotificationResponse || loading || !session) return;

    const data = lastNotificationResponse.notification.request.content.data;
    if (data?.type === 'recording-active') return;

    const meetingId = data?.meetingId;
    if (meetingId && typeof meetingId === 'string') {
      router.push(`/meeting/${meetingId}`);
    }
  }, [lastNotificationResponse, loading, session, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <RecordingProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="meeting/[id]"
          options={{
            title: 'Meeting Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </RecordingProvider>
  );
}
