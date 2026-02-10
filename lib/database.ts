import { supabase } from './supabase';
import type { Meeting, MeetingStatus } from './types';

export async function createMeeting(duration: number): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: `Meeting ${new Date().toLocaleDateString()}`,
      status: 'uploading' as MeetingStatus,
      duration,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create meeting: ${error.message}`);
  return data;
}

export async function uploadAudio(fileUri: string, meetingId: string): Promise<string> {
  const fileName = `${meetingId}.m4a`;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const filePath = `${user.id}/${fileName}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(filePath, blob, {
      contentType: 'audio/m4a',
      upsert: true,
    });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const { data: urlData } = supabase.storage
    .from('recordings')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

export async function updateMeetingStatus(
  id: string,
  status: MeetingStatus,
  audioUrl?: string,
): Promise<void> {
  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (audioUrl) updates.audio_url = audioUrl;

  const { error } = await supabase.from('meetings').update(updates).eq('id', id);
  if (error) throw new Error(`Failed to update meeting: ${error.message}`);
}

export async function getMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch meetings: ${error.message}`);
  return data ?? [];
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch meeting: ${error.message}`);
  return data;
}

export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: user.id, token }, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed to save push token: ${error.message}`);
}
