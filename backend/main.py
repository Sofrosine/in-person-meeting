import os
import logging
import tempfile

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

from services.transcription import transcribe_audio, mock_transcribe
from services.summarization import summarize_transcript
from services.notification import send_push_notification

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Meeting Notes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"],
)


class ProcessMeetingRequest(BaseModel):
    audio_url: str
    meeting_id: str
    push_token: str


async def process_meeting_task(request: ProcessMeetingRequest) -> None:
    """Background task: Download → Transcribe → Summarize → Update DB → Notify"""
    meeting_id = request.meeting_id
    try:
        logger.info(f"Processing meeting {meeting_id}")

        # 1. Update status to processing
        supabase.table("meetings").update({"status": "processing"}).eq(
            "id", meeting_id
        ).execute()

        # 2. Download audio file
        logger.info(f"Downloading audio from {request.audio_url}")
        async with httpx.AsyncClient() as client:
            response = await client.get(request.audio_url)
            response.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        # 3. Transcribe
        use_mock = os.environ.get("USE_MOCK_TRANSCRIPTION", "false").lower() == "true"
        if use_mock:
            logger.info("Using mock transcription")
            transcript = await mock_transcribe(tmp_path)
        else:
            logger.info("Transcribing with Whisper")
            transcript = await transcribe_audio(tmp_path)

        # 4. Summarize
        logger.info("Generating summary")
        summary = await summarize_transcript(transcript)

        # 5. Update DB with transcript + summary
        supabase.table("meetings").update(
            {
                "transcript": transcript,
                "summary": summary,
                "status": "completed",
            }
        ).eq("id", meeting_id).execute()
        logger.info(f"Meeting {meeting_id} completed")

        # 6. Send push notification
        await send_push_notification(request.push_token, meeting_id, summary)

    except Exception as e:
        logger.error(f"Failed to process meeting {meeting_id}: {e}")
        supabase.table("meetings").update({"status": "failed"}).eq(
            "id", meeting_id
        ).execute()
    finally:
        # Cleanup temp file
        if "tmp_path" in locals():
            os.unlink(tmp_path)


@app.post("/process-meeting")
async def process_meeting(
    request: ProcessMeetingRequest, background_tasks: BackgroundTasks
):
    """Accept meeting for processing. Returns immediately, processes in background."""
    background_tasks.add_task(process_meeting_task, request)
    return {"status": "processing", "meeting_id": request.meeting_id}


@app.get("/health")
async def health():
    return {"status": "ok"}
