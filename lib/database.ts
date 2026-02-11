import { File } from 'expo-file-system';
import { supabase } from './supabase';
import type { Meeting, MeetingStatus } from './types';

/**
 * Create a new meeting record in the database.
 * The user_id is automatically set by RLS from the auth session.
 */
export async function createMeeting(duration: number): Promise<Meeting> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      user_id: user.id,
      title: `Meeting ${new Date().toLocaleDateString()}`,
      status: 'uploading' as MeetingStatus,
      duration,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create meeting: ${error.message}`);
  return data;
}

/**
 * Upload an audio file to Supabase Storage.
 * Files are stored as {user_id}/{meeting_id}.m4a for RLS path matching.
 * Returns a signed URL (valid for 1 hour) for the backend to download.
 */
export async function uploadAudio(fileUri: string, meetingId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const filePath = `${user.id}/${meetingId}.m4a`;

  // Use expo-file-system's new File API to read as ArrayBuffer.
  // React Native's fetch().blob() produces empty blobs for local files.
  const file = new File(fileUri);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(filePath, arrayBuffer, {
      contentType: 'audio/mp4',
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  // Generate a signed URL so the backend can download the file.
  // The bucket is private (RLS), so public URLs won't work.
  const { data: signedData, error: signError } = await supabase.storage
    .from('recordings')
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  if (signError || !signedData?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${signError?.message}`);
  }

  return signedData.signedUrl;
}

/**
 * Update the status (and optionally audio_url) of a meeting.
 */
export async function updateMeetingStatus(
  id: string,
  status: MeetingStatus,
  audioUrl?: string,
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (audioUrl) updates.audio_url = audioUrl;

  const { error } = await supabase.from('meetings').update(updates).eq('id', id);
  if (error) throw new Error(`Failed to update meeting: ${error.message}`);
}

/**
 * Fetch all meetings for the current user, newest first.
 */
export async function getMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch meetings: ${error.message}`);
  return data ?? [];
}

/**
 * Fetch a single meeting by ID.
 * Generates a fresh signed URL for audio playback (the stored URL expires after 1 hour).
 */
export async function getMeeting(id: string): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch meeting: ${error.message}`);

  // Generate a fresh signed URL for audio playback
  if (data.status === 'completed' && data.user_id) {
    const filePath = `${data.user_id}/${data.id}.m4a`;
    const { data: signedData } = await supabase.storage
      .from('recordings')
      .createSignedUrl(filePath, 3600);
    if (signedData?.signedUrl) {
      data.audio_url = signedData.signedUrl;
    }
  }

  return data;
}

/**
 * Store or update the user's Expo push token.
 * Uses upsert with user_id as the conflict key (one token per user).
 */
export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: user.id, token }, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed to save push token: ${error.message}`);
}
