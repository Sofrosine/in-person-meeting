# In-Person Meeting Notes App

A React Native/Expo app that records in-person meetings with background audio capture, AI-powered transcription (OpenAI Whisper), GPT summarization, and push notifications with deep linking.

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Expo CLI (`npm install -g expo-cli`)
- Physical iOS/Android device (background recording and push notifications require a real device)
- Supabase project ([supabase.com](https://supabase.com))
- OpenAI API key ([platform.openai.com](https://platform.openai.com))

### 1. Mobile App

```bash
# Install dependencies
npm install

# Copy environment file and fill in your values
cp .env.example .env

# Start the dev server
npx expo start

# Build for device (required for background audio + push)
npx expo run:ios    # or npx expo run:android
```

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

# Start the server
uvicorn main:app --reload --port 8000
```

### 3. Supabase Setup

Run the SQL migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/migration.sql and execute in the Supabase dashboard
```

This creates the `meetings` table, `push_tokens` table, RLS policies, and a private `recordings` storage bucket.

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

## Architecture Decisions

**Custom Config Plugin over manual native edits** - A JavaScript Expo config plugin (`plugins/withBackgroundAudio.js`) declaratively configures both iOS (UIBackgroundModes, microphone permission) and Android (RECORD_AUDIO, FOREGROUND_SERVICE_MICROPHONE, foreground service declaration) native projects. This keeps native config reproducible across `npx expo prebuild` runs without ejecting.

**expo-av status callbacks over setInterval** - The recording timer uses expo-av's native `onRecordingStatusUpdate` callback (500ms interval) instead of JavaScript `setInterval`. JS timers are throttled/paused when the app is backgrounded; native status callbacks continue accurately. An AppState listener re-syncs the timer on foreground return.

**Signed URLs for private storage** - Audio files are stored in a private Supabase Storage bucket with RLS. The mobile app generates a time-limited signed URL (1 hour) for the backend to download, avoiding the need to pass auth credentials to the backend for storage access.

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
hooks/                  # Custom React hooks
  useAudioRecording.ts  # Core recording logic
lib/                    # Shared utilities
  AuthContext.tsx        # Supabase auth provider
  RecordingContext.tsx   # Recording state provider
  database.ts           # Supabase CRUD operations
  notifications.ts      # Push token registration
  supabase.ts           # Supabase client
  types.ts              # TypeScript interfaces
  theme.ts              # Color palette constants
  formatters.ts         # Date/time formatting
backend/                # Python FastAPI
  main.py               # API endpoints + processing pipeline
  config.py             # Environment configuration
  services/
    transcription.py    # OpenAI Whisper integration
    summarization.py    # GPT summarization
    notification.py     # Expo push notification sender
supabase/
  migration.sql         # Database schema + RLS policies
```

## What I'd Improve With More Time

- **True Android foreground service** - Implement a native Java/Kotlin `Service` class that binds to the audio session, ensuring reliable long-duration background recording on Android 12+ where the OS aggressively kills background processes.
- **Audio chunking for long meetings** - Whisper has a 25 MB file size limit. For recordings longer than ~25 minutes, split the audio into segments and transcribe each in parallel, then merge the results.
- **Offline queue** - Cache recordings locally when there's no network, then upload and process when connectivity returns. Use expo-task-manager for background upload tasks.
- **Meeting title editing** - Allow users to rename meetings after recording instead of the auto-generated "Meeting {date}" title.
- **Speaker diarization** - Identify different speakers in the transcript for better meeting notes structure.
- **Streaming transcription** - Use WebSocket streaming to show partial transcripts in real-time during recording.
