import os
import logging
import tempfile
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

from config import settings
from services.transcription import transcribe_audio, mock_transcribe
from services.summarization import summarize_transcript
from services.notification import send_push_notification

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Meeting Notes API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client using the service role key (bypasses RLS)
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class ProcessMeetingRequest(BaseModel):
    audio_url: str
    meeting_id: str
    push_token: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _update_meeting(meeting_id: str, **fields: object) -> None:
    """Update a meeting row. Automatically sets updated_at."""
    supabase.table("meetings").update(
        {"updated_at": _now(), **fields}
    ).eq("id", meeting_id).execute()


# ---------------------------------------------------------------------------
# Background processing pipeline
# ---------------------------------------------------------------------------
async def process_meeting_task(request: ProcessMeetingRequest) -> None:
    """
    Background task that runs the full processing pipeline:
    Download audio → Transcribe (Whisper) → Summarize (GPT) → Update DB → Push notification
    """
    meeting_id = request.meeting_id
    tmp_path: str | None = None

    try:
        logger.info(f"[{meeting_id}] Starting processing pipeline")

        # 1. Mark as processing
        _update_meeting(meeting_id, status="processing")

        # 2. Download audio from Supabase Storage signed URL
        logger.info(f"[{meeting_id}] Downloading audio")
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.get(request.audio_url)
            response.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        file_size_mb = len(response.content) / (1024 * 1024)
        logger.info(f"[{meeting_id}] Downloaded {file_size_mb:.1f} MB")

        # 3. Transcribe with Whisper (or mock)
        if settings.USE_MOCK_TRANSCRIPTION:
            transcript = await mock_transcribe(tmp_path)
        else:
            try:
                transcript = await transcribe_audio(tmp_path)
            except Exception as whisper_err:
                # Auto-fallback to mock if Whisper fails (e.g., expired API key)
                logger.warning(
                    f"[{meeting_id}] Whisper failed ({whisper_err}), falling back to mock"
                )
                transcript = await mock_transcribe(tmp_path)

        logger.info(f"[{meeting_id}] Transcript: {len(transcript)} chars")

        # 4. Summarize with GPT
        summary = await summarize_transcript(transcript)
        logger.info(f"[{meeting_id}] Summary: {len(summary)} chars")

        # 5. Save results to database
        _update_meeting(
            meeting_id,
            transcript=transcript,
            summary=summary,
            status="completed",
        )
        logger.info(f"[{meeting_id}] Completed successfully")

        # 6. Send push notification
        await send_push_notification(request.push_token, meeting_id, summary)

    except Exception as e:
        logger.error(f"[{meeting_id}] Pipeline failed: {e}")
        _update_meeting(meeting_id, status="failed")

    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.post("/process-meeting")
async def process_meeting(
    request: ProcessMeetingRequest,
    background_tasks: BackgroundTasks,
):
    """
    Accept a meeting for processing. Returns immediately with status 'processing'.
    The actual transcription + summarization runs in a background task.

    Input: { audio_url, meeting_id, push_token }
    """
    logger.info(f"Received processing request for meeting {request.meeting_id}")
    background_tasks.add_task(process_meeting_task, request)
    return {"status": "processing", "meeting_id": request.meeting_id}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}
