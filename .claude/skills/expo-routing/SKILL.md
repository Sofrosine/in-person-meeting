---
name: expo-routing
description: Set up Expo Router with file-based routing, tab navigation, deep link support, and the meeting detail dynamic route. Implements the required screen structure.
argument-hint: "[tabs|deep-links|screens|all]"
---

# Expo Router Setup

Set up file-based routing with deep link support using Expo Router.

## Task Context

The app needs tab navigation (home/recording + meetings list) and a dynamic route for meeting details that supports deep linking from push notifications.

## Required Route Structure

```
/app
  _layout.tsx          — Root layout (auth check, notification handler, providers)
  /(tabs)
    _layout.tsx        — Tab navigation layout
    index.tsx          — Home / Recording screen (Tab 1)
    meetings.tsx       — Meetings list screen (Tab 2)
  /meeting
    [id].tsx           — Meeting detail (deep link target)
```

## What to Implement

### 1. Root Layout (`app/_layout.tsx`)

- Auth provider wrapping the app
- Notification handler setup
- Deep link response listener
- Stack navigator for root

```typescript
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="meeting/[id]" options={{ title: 'Meeting Details' }} />
      </Stack>
    </AuthProvider>
  );
}
```

### 2. Tab Layout (`app/(tabs)/_layout.tsx`)

Two tabs:
- **Record** (index) - Microphone icon, home screen with recording button
- **Meetings** - List icon, shows all past meetings

```typescript
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Record', tabBarIcon: MicIcon }} />
      <Tabs.Screen name="meetings" options={{ title: 'Meetings', tabBarIcon: ListIcon }} />
    </Tabs>
  );
}
```

### 3. Home/Recording Screen (`app/(tabs)/index.tsx`)

- Large record button (tap to start/stop)
- Recording timer display
- Recording status indicator
- Quick access to latest meeting

### 4. Meetings List (`app/(tabs)/meetings.tsx`)

- FlatList of past meetings
- Show: title/date, duration, status (processing/completed)
- Tap to navigate to meeting detail
- Pull-to-refresh
- Empty state

### 5. Meeting Detail (`app/meeting/[id].tsx`)

- Receives `id` from URL params (`useLocalSearchParams`)
- Fetches meeting from Supabase
- Displays:
  - Meeting title and date
  - Duration
  - Status
  - Full transcript (scrollable)
  - AI summary
- Loading state while fetching
- Error state if meeting not found

### 6. Deep Link Configuration

In `app.config.ts`:
```typescript
export default {
  scheme: "meetingnotes",
  // ... other config
};
```

Deep link format: `meetingnotes:///meeting/{id}`

The notification handler in root layout navigates to `/meeting/{id}` when a notification with meetingId data is tapped.

## Navigation Patterns
- From meetings list → meeting detail: `router.push(/meeting/${id})`
- From notification → meeting detail: `router.push(/meeting/${meetingId})`
- Back navigation from meeting detail → previous screen
