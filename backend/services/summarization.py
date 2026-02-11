import logging
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a meeting assistant. Summarize the following meeting transcript. "
    "Respond in the same language the transcript is written in. "
    "Structure your response as:\n"
    "- Key Topics: Main subjects discussed\n"
    "- Decisions: Any decisions that were made\n"
    "- Action Items: Tasks assigned with owners if mentioned\n\n"
    "Keep the summary under 200 words. Be concise and factual. "
    "Do not use markdown formatting."
)


async def summarize_transcript(transcript: str) -> str:
    """
    Generate a structured summary of a meeting transcript using GPT.
    Falls back to a basic extraction if the API call fails.
    """
    try:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript},
            ],
            max_tokens=500,
            temperature=0.3,
        )

        summary = response.choices[0].message.content or "No summary generated."
        logger.info(f"GPT summary generated: {len(summary)} chars")
        return summary

    except Exception as e:
        logger.error(f"Summarization failed: {e}")
        # Fallback: return the first 500 chars of the transcript as a basic summary
        preview = transcript[:500].strip()
        if len(transcript) > 500:
            preview += "..."
        return f"Summary unavailable. Transcript preview:\n\n{preview}"
