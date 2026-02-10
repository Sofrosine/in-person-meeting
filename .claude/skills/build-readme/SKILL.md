---
name: build-readme
description: Generate the README.md with setup instructions, architecture decisions, and improvement notes. Required deliverable for the Affinity Labs assessment.
argument-hint: "[draft|finalize]"
---

# Build README

Generate the project README.md as required by the assessment deliverables.

## Required Sections

### 1. How to Run Locally

Include step-by-step instructions for:

**Mobile App:**
```bash
# Prerequisites
# - Node.js 18+
# - Expo CLI
# - Physical device (for push notifications)

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# Start development server
npx expo start

# For iOS (requires prebuild for config plugin)
npx expo prebuild
npx expo run:ios

# For Android
npx expo run:android
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
uvicorn main:app --reload --port 8000
```

**Supabase:**
- Database schema setup instructions
- Storage bucket creation
- RLS policies

### 2. Architecture Decisions (1 page max)

Cover these key decisions:
- **Why Expo with config plugin** vs bare React Native
- **Background recording approach** on iOS vs Android
- **Supabase choice** for auth + storage + database in one
- **Backend as separate service** for audio processing
- **Push notification flow** and deep linking strategy
- **File structure** and separation of concerns

### 3. What I'd Improve with More Time

Suggest practical improvements:
- Real-time transcription (streaming)
- Meeting title auto-generation
- Speaker diarization
- Offline support / recording queue
- Better audio compression before upload
- Meeting search and filtering
- Share meeting transcripts
- Meeting tags/categories
- Automated testing
- CI/CD pipeline
- Better error recovery
- Audio waveform visualization

## Important Notes
- Keep architecture decisions to 1 page MAX (they're explicit about this)
- Be concise but demonstrate technical depth
- Show awareness of trade-offs in decisions
- The README is part of the evaluation - make it professional
