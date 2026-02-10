---
name: supabase-setup
description: Set up Supabase integration including auth, database schema with RLS policies, and storage bucket for audio files. Creates the client library and all SQL migrations.
argument-hint: "[schema|auth|storage|rls|all]"
---

# Supabase Setup

Set up complete Supabase integration for the Meeting Notes app.

## Task Context

Supabase provides Auth, Postgres database, and Storage for audio files. Row Level Security (RLS) is required.

## What to Implement

### 1. Supabase Client (`/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 2. Database Schema

**meetings table:**
```sql
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  audio_url TEXT,
  transcript TEXT,
  summary TEXT,
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'uploading', 'processing', 'completed', 'failed')),
  duration INTEGER, -- seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**push_tokens table:**
```sql
CREATE TABLE push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own meetings
CREATE POLICY "Users can view own meetings" ON meetings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own meetings
CREATE POLICY "Users can insert own meetings" ON meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own meetings
CREATE POLICY "Users can update own meetings" ON meetings
  FOR UPDATE USING (auth.uid() = user_id);

-- Push tokens policies
CREATE POLICY "Users can manage own push tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Service role can update meetings (for backend processing)
-- Use supabase service role key in the backend
```

### 4. Storage Bucket

```sql
-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);

-- Storage policies
CREATE POLICY "Users can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own recordings" ON storage.objects
  FOR SELECT USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 5. Auth Setup

- Use Supabase Email Auth (simplest for demo)
- Create auth context/provider for the app
- Handle session persistence with AsyncStorage
- Create login/signup screen (can be simple)

### 6. Environment Variables

Create `.env.example`:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 7. Database Helper Functions (`/lib/database.ts`)

```typescript
export async function createMeeting(audioUrl: string, duration: number): Promise<Meeting>
export async function updateMeetingStatus(id: string, status: MeetingStatus): Promise<void>
export async function updateMeetingTranscript(id: string, transcript: string, summary: string): Promise<void>
export async function getMeetings(): Promise<Meeting[]>
export async function getMeeting(id: string): Promise<Meeting>
export async function uploadAudio(fileUri: string, meetingId: string): Promise<string>
```

## Important Notes
- Service role key is only used in the Python backend, NEVER in the mobile app
- RLS is explicitly required in the task spec
- Storage paths should be organized by user_id for RLS to work
- Consider creating a Supabase migration file for reproducibility
