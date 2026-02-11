import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { savePushToken } from './database';

/**
 * Register for Expo push notifications and store the token in Supabase.
 *
 * Flow:
 * 1. Check physical device (push doesn't work on simulator/emulator)
 * 2. Request permission if not already granted
 * 3. Create Android notification channel for transcript-ready alerts
 * 4. Fetch the Expo push token
 * 5. Persist the token in the push_tokens table
 *
 * Returns the push token string, or null if registration fails.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return null;
    }

    // Check / request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted');
      return null;
    }

    // Android: create notification channels
    if (Platform.OS === 'android') {
      // Channel for transcript-ready push notifications (referenced by backend)
      await Notifications.setNotificationChannelAsync('meeting-ready', {
        name: 'Meeting Transcripts',
        description: 'Notifications when your meeting transcript is ready',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        showBadge: true,
      });

      // Channel for the persistent recording indicator notification
      await Notifications.setNotificationChannelAsync('recording', {
        name: 'Active Recording',
        description: 'Shown while a meeting is being recorded',
        importance: Notifications.AndroidImportance.LOW,
        enableVibrate: false,
        showBadge: false,
      });
    }

    // Fetch Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenResponse.data;

    // Persist to Supabase (upsert per user)
    try {
      await savePushToken(token);
    } catch {
      // Non-fatal: token still works even if DB save fails.
      // Will retry on next registration call.
      console.warn('Failed to save push token to database');
    }

    return token;
  } catch (err) {
    console.error('Push notification registration failed:', err);
    return null;
  }
}
