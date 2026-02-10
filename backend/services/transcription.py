import os
import tempfile
from openai import OpenAI


async def transcribe_audio(audio_path: str) -> str:
    """Transcribe audio file using OpenAI Whisper API."""
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )

    return transcript.text


async def mock_transcribe(audio_path: str) -> str:
    """Return a mock transcript for testing without API key."""
    return (
        "This is a mock transcript of the meeting recording. "
        "The team discussed project timelines, key milestones, and resource allocation. "
        "Action items were assigned to team members with specific deadlines. "
        "The next meeting is scheduled for next week to review progress."
    )
