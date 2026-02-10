---
name: push-notifications
description: Implement Expo Push Notifications with deep linking. Notifications are sent when transcript is ready, tapping opens the correct meeting. This is 15% of evaluation.
argument-hint: "[setup|deep-link|handler|all]"
---

# Push Notifications + Deep Linking

Implement push notifications that deep link to meeting transcripts. **This is 15% of the evaluation.**

## Task Context

After the backend processes a recording, a push notification is sent. Tapping it opens the specific meeting detail screen showing the transcript and summary.

## What to Implement

### 1. Push Token Registration (`/lib/notifications.ts`)

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export async function registerForPushNotifications(): Promise<string | null> {
  // 1. Check if physical device (push doesn't work on simulator)
  if (!Device.isDevice) return null;

  // 2. Get existing permission or request
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  // 3. Get Expo push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expiConfig?.extra?.eas?.projectId,
  });

  // 4. Store token in Supabase push_tokens table
  // 5. Return token string

  return token.data;
}
```

### 2. Notification Handler Setup

In the root layout (`app/_layout.tsx`):

```typescript
// Set notification handler (how to display when app is foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Handle notification tap (deep link to meeting)
const lastNotificationResponse = Notifications.useLastNotificationResponse();
useEffect(() => {
  if (lastNotificationResponse) {
    const meetingId = lastNotificationResponse.notification.request.content.data?.meetingId;
    if (meetingId) {
      router.push(`/meeting/${meetingId}`);
    }
  }
}, [lastNotificationResponse]);
```

### 3. Deep Link Configuration

In `app.json` / `app.config.ts`:
```json
{
  "scheme": "meetingnotes",
  "expo": {
    "scheme": "meetingnotes"
  }
}
```

URL pattern: `meetingnotes:///meeting/[id]`

### 4. Notification Data Structure

The backend sends notifications with this data:
```json
{
  "to": "ExponentPushToken[xxx]",
  "title": "Meeting transcript ready!",
  "body": "Your 30-minute meeting has been transcribed.",
  "data": {
    "meetingId": "uuid-here",
    "url": "/meeting/uuid-here"
  }
}
```

### 5. Deep Link Route

The meeting detail route at `app/meeting/[id].tsx` should:
- Accept the meeting ID from the URL params
- Fetch the meeting data from Supabase
- Display transcript and summary
- Handle loading and error states

### 6. Android Notification Channel

```typescript
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('meeting-ready', {
    name: 'Meeting Transcripts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}
```

## Backend Side (for reference)

The Python backend sends the notification via Expo's push API:
```python
import httpx

async def send_push_notification(push_token: str, meeting_id: str, title: str):
    await httpx.post(
        "https://exp.host/--/api/v2/push/send",
        json={
            "to": push_token,
            "title": "Meeting transcript ready!",
            "body": title,
            "data": {"meetingId": meeting_id, "url": f"/meeting/{meeting_id}"},
        }
    )
```

## Testing
- Test on physical device (push notifications don't work on simulator)
- Test notification when app is in foreground, background, and killed
- Test deep link navigation from notification tap
- Test that correct meeting is displayed
