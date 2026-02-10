-- ============================================================================
-- In-Person Meeting Notes App – Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- Meetings table: stores each recorded meeting and its processing state
CREATE TABLE IF NOT EXISTS public.meetings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT,
  audio_url   TEXT,
  transcript  TEXT,
  summary     TEXT,
  status      TEXT DEFAULT 'recording'
              CHECK (status IN ('recording', 'uploading', 'processing', 'completed', 'failed')),
  duration    INTEGER,  -- recording length in seconds
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Push tokens table: one token per user for Expo push notifications
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  token       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user-scoped queries
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON public.meetings (user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON public.meetings (created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Meetings: users can only access their own rows
CREATE POLICY "Users can view own meetings"
  ON public.meetings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meetings"
  ON public.meetings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meetings"
  ON public.meetings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meetings"
  ON public.meetings FOR DELETE
  USING (auth.uid() = user_id);

-- Push tokens: users can manage their own token
CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. STORAGE BUCKET
-- ----------------------------------------------------------------------------

-- Create a private bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: files stored as {user_id}/{filename}
-- Users can upload to their own folder
CREATE POLICY "Users can upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own recordings
CREATE POLICY "Users can read own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own recordings
CREATE POLICY "Users can delete own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- NOTE: updated_at is set explicitly by the Python backend on each update
-- to keep the SQL migration lightweight (no functions/triggers).
