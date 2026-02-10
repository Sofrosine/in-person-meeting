---
name: setup-project
description: Initialize the Expo SDK 54 project with all required dependencies for the In-Person Meeting Notes App. Sets up TypeScript, Expo Router, Supabase client, expo-av, expo-notifications, and the complete project structure.
argument-hint: "[--clean]"
---

# Setup Project - In-Person Meeting Notes App

Initialize a new Expo SDK 54 project for the In-Person Meeting Notes App with all required dependencies.

## Task Context

This is a take-home assessment for Affinity Labs. The app records in-person meetings, continues recording in background, and delivers AI-generated transcripts via push notifications.

## Steps

1. **Create Expo project** with Expo SDK 54 and TypeScript template:
   ```
   npx create-expo-app@latest in-person-meeting-app --template tabs
   ```
   If the project already exists (check for package.json), skip creation and just verify/install dependencies.

2. **Install required dependencies**:
   - `expo-av` - Audio recording
   - `expo-notifications` - Push notifications
   - `expo-router` - File-based routing (should come with template)
   - `expo-linking` - Deep linking
   - `expo-task-manager` - Background tasks
   - `expo-device` - Device info for push tokens
   - `expo-constants` - App constants
   - `@supabase/supabase-js` - Supabase client
   - `react-native-url-polyfill` - Required for Supabase
   - `@react-native-async-storage/async-storage` - Supabase auth persistence

3. **Create project structure** following the required layout:
   ```
   /app
     /(tabs)
       index.tsx       — home/recording screen
       meetings.tsx    — meetings list
     /meeting/[id].tsx — meeting detail
   /plugins            — custom config plugin
   /backend            — Python API
   /lib                — shared utilities (supabase client, types, etc.)
   /hooks              — custom React hooks
   ```

4. **Create base TypeScript types** in `/lib/types.ts`:
   - Meeting type (id, title, audio_url, transcript, summary, status, created_at, user_id)
   - RecordingState enum (IDLE, RECORDING, UPLOADING, PROCESSING, COMPLETE)

5. **Set up app.json / app.config.ts** with:
   - Scheme for deep linking (e.g., `meetingnotes`)
   - iOS bundle identifier
   - Android package name
   - Reference to the custom config plugin

6. **Initialize Python backend directory** with:
   - `backend/requirements.txt` (fastapi, uvicorn, supabase, openai, httpx)
   - `backend/main.py` skeleton
   - `backend/.env.example`

7. **Verify** the setup compiles with `npx expo doctor` or `npx expo start --check`.

## Important Notes
- Use Expo SDK 54 specifically (check compatibility)
- TypeScript is required (evaluation criteria: 10% code quality)
- Architecture should have clean separation of concerns (evaluation criteria: 20%)
- Do NOT set up Supabase project itself - that's done in the supabase-setup skill
