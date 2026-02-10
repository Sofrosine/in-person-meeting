# In-Person Meeting Notes App - Project Instructions

## Project Overview
Take-home assessment for Affinity Labs. Build a React Native/Expo app that records in-person meetings with background recording, AI transcription, and push notifications.

## Tech Stack
- **Mobile**: Expo SDK 54, Expo Router, TypeScript
- **Backend**: Python FastAPI
- **Database**: Supabase (Postgres + Storage)
- **AI**: OpenAI Whisper-1 (transcription), GPT (summarization)
- **Notifications**: Expo Push Notifications

## Evaluation Weights
1. Config Plugin (25%) - Background audio native config
2. Background Recording (25%) - Reliable background audio capture
3. Architecture (20%) - Clean separation of concerns
4. Notifications + Deep Linking (15%) - Push + deep link to meeting
5. Code Quality (10%) - TypeScript, error handling
6. Product Thinking (5%) - Real-world usability

## Project Structure
```
/app              - Expo Router screens
  /(tabs)         - Tab navigation
    index.tsx     - Home/recording screen
    meetings.tsx  - Meetings list
  /meeting
    [id].tsx      - Meeting detail (deep link target)
/plugins          - Custom Expo config plugin
/backend          - Python FastAPI backend
/lib              - Shared utilities, types, supabase client
/hooks            - Custom React hooks
```

## Available Skills (slash commands)

### Implementation Skills
- `/setup-project` - Initialize Expo project with dependencies
- `/config-plugin` - Build the custom config plugin (25% weight)
- `/background-recording` - Implement background audio recording (25% weight)
- `/supabase-setup` - Set up database, storage, auth, RLS
- `/push-notifications` - Push notifications + deep linking
- `/python-backend` - FastAPI backend for audio processing
- `/expo-routing` - File-based routing with Expo Router

### Design Skills (auto-applied when building UI)
- `/use-distinctive-fonts` - Enforces quality typography (no generic fonts)
- `/meeting-app-theme` - "Studio Noir" dark aesthetic with warm amber accents
- `/frontend-aesthetics` - Anti-AI-slop design rules for all screens

### Submission Skills
- `/review-submission` - Review against evaluation criteria
- `/build-readme` - Generate the required README

## Available Agents
- `expo-specialist` - Expo/RN expert for mobile implementation
- `backend-engineer` - Python/FastAPI/AI expert for backend
- `code-reviewer` - Reviews code against assessment rubric
- `qa-tester` - Tests the complete user flow

## Conventions
- TypeScript strict mode, no `any` types
- Use async/await consistently
- Error handling with user-friendly messages
- Clean imports, no dead code
- Separate concerns: hooks for logic, components for UI, lib for utilities
