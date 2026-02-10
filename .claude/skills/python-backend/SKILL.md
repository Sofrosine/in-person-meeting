---
name: python-backend
description: Build the Python FastAPI backend that processes audio recordings - downloads from Supabase Storage, transcribes with OpenAI Whisper, generates summary with GPT, updates DB, and sends push notification.
argument-hint: "[scaffold|endpoint|transcribe|notify|all]"
---

# Python Backend - FastAPI

Build the backend that processes meeting recordings.

## Task Context

The backend receives a request after a recording is uploaded, processes the audio into a transcript and summary, then notifies the user.

## Required Endpoint

```
POST /process-meeting
Input: { audio_url, meeting_id, push_token }
Process: Download → Transcribe (mock OK) → Summarize → Update DB → Send notification
```

## What to Implement

### 1. Project Structure (`/backend/`)

```
backend/
├── main.py              # FastAPI app, routes
├── services/
│   ├── __init__.py
│   ├── transcription.py # Whisper API integration
│   ├── summarization.py # GPT summarization
│   └── notification.py  # Expo push notification
├── requirements.txt
├── .env.example
└── Dockerfile (optional)
```

### 2. FastAPI App (`main.py`)

```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

app = FastAPI(title="Meeting Notes API")

class ProcessMeetingRequest(BaseModel):
    audio_url: str
    meeting_id: str
    push_token: str

@app.post("/process-meeting")
async def process_meeting(request: ProcessMeetingRequest, background_tasks: BackgroundTasks):
    """Accept meeting processing request and handle in background."""
    background_tasks.add_task(process_meeting_task, request)
    return {"status": "processing", "meeting_id": request.meeting_id}

async def process_meeting_task(request: ProcessMeetingRequest):
    """Background task: Download → Transcribe → Summarize → Update DB → Notify"""
    try:
        # 1. Update status to 'processing'
        # 2. Download audio from Supabase Storage URL
        # 3. Transcribe with Whisper
        # 4. Summarize with GPT
        # 5. Update meeting in DB with transcript + summary
        # 6. Update status to 'completed'
        # 7. Send push notification
    except Exception as e:
        # Update status to 'failed'
        pass
```

### 3. Transcription Service (`services/transcription.py`)

Using OpenAI Whisper API:
```python
from openai import OpenAI

async def transcribe_audio(audio_path: str) -> str:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )
    return transcript.text
```

**Note**: The task says "mock OK" for transcription, so also implement a mock option:
```python
async def mock_transcribe(audio_path: str) -> str:
    return "This is a mock transcript of the meeting recording. The team discussed project timelines..."
```

### 4. Summarization Service (`services/summarization.py`)

```python
async def summarize_transcript(transcript: str) -> str:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Summarize this meeting transcript concisely. Include key decisions, action items, and main topics discussed."},
            {"role": "user", "content": transcript}
        ]
    )
    return response.choices[0].message.content
```

### 5. Notification Service (`services/notification.py`)

```python
import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

async def send_push_notification(push_token: str, meeting_id: str, summary_preview: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(EXPO_PUSH_URL, json={
            "to": push_token,
            "title": "Meeting transcript ready!",
            "body": summary_preview[:100] + "...",
            "data": {"meetingId": meeting_id, "url": f"/meeting/{meeting_id}"},
            "sound": "default",
        })
    return response.json()
```

### 6. Supabase Integration

Use supabase-py with the SERVICE_ROLE_KEY (not anon key):
```python
from supabase import create_client

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]  # Service role bypasses RLS
)
```

### 7. Environment Variables (`.env.example`)

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
USE_MOCK_TRANSCRIPTION=false
```

### 8. Requirements (`requirements.txt`)

```
fastapi>=0.104.0
uvicorn>=0.24.0
supabase>=2.0.0
openai>=1.0.0
httpx>=0.25.0
python-dotenv>=1.0.0
python-multipart>=0.0.6
```

## Running the Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in values
uvicorn main:app --reload --port 8000
```

## Key Considerations
- Use BackgroundTasks for async processing (don't block the response)
- Implement proper error handling and status updates
- Support both real Whisper transcription and mock mode
- The OpenAI API key provided expires in 3 days - support mock mode as fallback
- Add CORS middleware for local development
- Log processing steps for debugging
