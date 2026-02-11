import logging
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)


async def transcribe_audio(audio_path: str) -> str:
    """
    Transcribe an audio file using OpenAI Whisper-1 API.

    Whisper supports m4a, mp3, mp4, mpeg, mpga, wav, and webm formats.
    Max file size is 25 MB. For longer meetings, the file stays under
    this limit at 128kbps mono (~1 MB/min -> ~25 min max per call).
    """
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    with open(audio_path, "rb") as audio_file:
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text",
        )

    logger.info(f"Whisper transcription complete: {len(transcript)} chars")
    return transcript


async def mock_transcribe(audio_path: str) -> str:
    """
    Return a realistic mock transcript for testing without an API key.
    Useful when the OpenAI key has expired or during development.
    """
    logger.info("Using mock transcription")
    return (
        "[MOCK DATA] This is a sample transcript generated for testing purposes. "
        "Real transcription requires a valid OpenAI API key.\n\n"
        "Good morning everyone, let's get started with our weekly sync.\n\n"
        "First, I'd like to go over the progress on the mobile app. The recording "
        "feature is now working in background mode on both iOS and Android. We've "
        "tested it with 30-minute recordings and the audio quality is solid.\n\n"
        "For the backend, the transcription pipeline is complete. We're using "
        "Whisper for speech-to-text and GPT for summarization. The average "
        "processing time is about 2 minutes for a 30-minute recording.\n\n"
        "Action items from this meeting:\n"
        "1. Sarah will finalize the push notification flow by Thursday\n"
        "2. Mike will set up the production Supabase instance\n"
        "3. Everyone should test the deep linking from notifications\n\n"
        "Next meeting is scheduled for Friday at 10 AM. Thanks everyone."
    )
