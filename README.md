# In-Person Meeting Notes App

A React Native/Expo app that records in-person meetings with background audio capture, AI-powered transcription (OpenAI Whisper), GPT summarization, and push notifications with deep linking.

## Demo

[Screen recording](https://drive.google.com/file/d/1mVmBMz1UJLcCs_U_nihLnqgGqwVVLezZ/view?usp=sharing) — Full flow: start recording → background app → stop → receive notification → view transcript

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Expo CLI (`npm install -g expo-cli`) and EAS CLI (`npm install -g eas-cli`)
- Physical iOS/Android device (background recording and push notifications require a real device)
- For iOS: Xcode with a valid Apple Developer account for code signing
- Supabase project ([supabase.com](https://supabase.com))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

### 1. Mobile App

```bash
# Install dependencies
yarn install

# Copy environment file and fill in your values
cp .env.example .env

# Start the dev server
npx expo start

# Build for physical device (required for background audio + push)
npx expo prebuild --clean
npx expo run:ios --device    # or npx expo run:android
```

> **Note:** When testing on a physical device (iOS or Android), ensure your phone and laptop are on the **same Wi-Fi network**. Set `EXPO_PUBLIC_BACKEND_URL` in `.env` to your laptop's local IP (e.g. `http://192.168.1.x:8000`) instead of `localhost`, since `localhost` on the device refers to the phone itself. You can find your IP with `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux). The backend must also be started with `--host 0.0.0.0` to accept connections from the local network. For iOS, `NSAllowsLocalNetworking` is already configured in `app.json` to allow plain HTTP to local IPs.

### 2. Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and fill in your values
cp .env.example .env

# Start the server (use 0.0.0.0 so physical devices on LAN can reach it)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Supabase Setup

Run the SQL migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/migration.sql and execute in the Supabase dashboard
```

This creates the `meetings` table, `push_tokens` table, RLS policies, and a private `recordings` storage bucket.

### Test Credentials

A test account is pre-configured in the Supabase project:

- **Email:** `hellotest@yopmail.com`
- **Password:** `@Ymail123`

### Environment Variables

**Mobile (`.env`)**
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `EXPO_PUBLIC_BACKEND_URL` | Backend API URL (e.g. `http://localhost:8000`) |

**Backend (`backend/.env`)**
| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for Whisper + GPT |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `USE_MOCK_TRANSCRIPTION` | Set to `true` to skip real API calls |

### Push Notifications Setup

Push notifications use **Expo Push**, which routes to the correct platform service (APNs for iOS, FCM for Android) automatically.

**Android (FCM):**
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add an Android app with your bundle ID (`com.sofrosine.meetingnotes`)
3. Download `google-services.json` and place it in the project root
4. Upload the Firebase Service Account Key (FCM V1) to the [Expo dashboard](https://expo.dev) under Project → Credentials → Android → Push Key

**iOS (APNs):**
1. Requires a paid Apple Developer account ($99/year)
2. Generate an APNs Key (.p8 file) in the [Apple Developer portal](https://developer.apple.com/account/resources/authkeys/list)
3. Upload the key to the [Expo dashboard](https://expo.dev) under Project → Credentials → iOS → Push Key

> **Note:** The app code handles both platforms — token registration, notification display, and deep linking all work cross-platform. The only difference is the credential setup above. The demo screen recording uses Android where FCM is configured.

## Architecture Decisions

**Custom Config Plugin over manual native edits** - A JavaScript Expo config plugin (`plugins/withBackgroundAudio.js`) declaratively configures both iOS (UIBackgroundModes, microphone permission) and Android (RECORD_AUDIO, FOREGROUND_SERVICE_MICROPHONE, foreground service declaration) native projects. This keeps native config reproducible across `npx expo prebuild` runs without ejecting.

**expo-audio hooks over setInterval** - The recording timer uses expo-audio's `useAudioRecorderState` hook (500ms polling) instead of JavaScript `setInterval`. JS timers are throttled/paused when the app is backgrounded; the native recorder state continues tracking accurately. The hook-based API also eliminates manual ref management for the recorder instance.

**Expo Push + `useLastNotificationResponse` for deep linking** - Push notifications use Expo's push service (abstracting APNs/FCM) so the backend sends to a single Expo endpoint regardless of platform. On the client, `useLastNotificationResponse` handles notification taps across all app states (foreground, background, killed) and navigates to `/meeting/[id]` via Expo Router. The handler is guarded by auth state to prevent navigation before session restoration.

**Background task over synchronous processing** - The `/process-meeting` endpoint returns immediately while a FastAPI `BackgroundTask` runs the pipeline (download, transcribe, summarize, notify). The meeting detail screen auto-polls every 5s during processing so users see live status updates.

**React Context for recording state** - A `RecordingContext` hoists the `useAudioRecording` hook to the component tree root so recording state (active, duration) is accessible from any screen, including the tab bar indicator dot.

## Project Structure

```
app/                    # Expo Router screens
  (tabs)/               # Tab navigation (Record + Meetings)
  meeting/[id].tsx      # Meeting detail (deep link target)
  login.tsx             # Auth screen
  _layout.tsx           # Root layout with auth gating + notifications
plugins/                # Custom Expo config plugin
  withBackgroundAudio.js
contexts/               # React context providers
  AuthContext.tsx        # Supabase auth provider
  RecordingContext.tsx   # Recording state provider
hooks/                  # Custom React hooks
  useAudioRecording.ts  # Core recording logic (pause/resume, metering)
lib/                    # Shared utilities
  database.ts           # Supabase CRUD + fresh signed URLs
  notifications.ts      # Push token registration + Android channels
  supabase.ts           # Supabase client
  types.ts              # TypeScript interfaces
  theme.ts              # Color palette constants
  formatters.ts         # Date/time formatting
backend/                # Python FastAPI
  main.py               # API endpoints + background processing pipeline
  config.py             # Environment configuration
  services/
    transcription.py    # OpenAI Whisper integration
    summarization.py    # GPT summarization
    notification.py     # Expo push notification sender
supabase/
  migration.sql         # Database schema + RLS policies
```

## What I'd Improve With More Time

- **Audio chunking for long meetings** - Whisper has a 25 MB file size limit. For recordings longer than ~25 minutes, split the audio into segments and transcribe each in parallel, then merge the results.
- **Offline queue** - Cache recordings locally when there's no network, then upload and process when connectivity returns. Use expo-task-manager for background upload tasks.
- **Meeting title editing** - Allow users to rename meetings after recording instead of the auto-generated "Meeting {date}" title.
- **Speaker diarization** - Identify different speakers in the transcript for better meeting notes structure.
- **Streaming transcription** - Use WebSocket streaming to show partial transcripts in real-time during recording.
