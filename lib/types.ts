export type MeetingStatus = 'recording' | 'uploading' | 'processing' | 'completed' | 'failed';

export interface Meeting {
  id: string;
  user_id: string;
  title: string | null;
  audio_url: string | null;
  transcript: string | null;
  summary: string | null;
  status: MeetingStatus;
  duration: number | null;
  created_at: string;
  updated_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
}

export interface ProcessMeetingRequest {
  audio_url: string;
  meeting_id: string;
  push_token: string;
}

export interface ProcessMeetingResponse {
  status: string;
  meeting_id: string;
}
