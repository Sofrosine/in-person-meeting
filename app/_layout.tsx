import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Handle notification tap → deep link to meeting
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (lastNotificationResponse) {
      const meetingId =
        lastNotificationResponse.notification.request.content.data?.meetingId;
      if (meetingId && typeof meetingId === 'string') {
        router.push(`/meeting/${meetingId}`);
      }
    }
  }, [lastNotificationResponse, router]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0D0D0F' },
          headerTintColor: '#F5F5F0',
          contentStyle: { backgroundColor: '#0D0D0F' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="meeting/[id]"
          options={{
            title: 'Meeting Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </>
  );
}
