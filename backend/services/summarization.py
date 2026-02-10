import os
from openai import OpenAI


async def summarize_transcript(transcript: str) -> str:
    """Generate a summary of the meeting transcript using GPT."""
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a meeting assistant. Summarize the following meeting transcript concisely. "
                    "Include: key topics discussed, decisions made, and action items with owners if mentioned. "
                    "Keep the summary under 200 words."
                ),
            },
            {"role": "user", "content": transcript},
        ],
    )

    return response.choices[0].message.content or "No summary generated."
