import httpx
import logging

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
logger = logging.getLogger(__name__)


async def send_push_notification(
    push_token: str,
    meeting_id: str,
    summary_preview: str,
) -> None:
    """Send an Expo push notification when the transcript is ready."""
    if not push_token:
        logger.warning("No push token provided, skipping notification")
        return

    body_text = summary_preview[:100]
    if len(summary_preview) > 100:
        body_text += "..."

    payload = {
        "to": push_token,
        "title": "Meeting transcript ready!",
        "body": body_text,
        "data": {
            "meetingId": meeting_id,
            "url": f"/meeting/{meeting_id}",
        },
        "sound": "default",
        "channelId": "meeting-ready",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(EXPO_PUSH_URL, json=payload)
        response.raise_for_status()
        logger.info(f"Push notification sent for meeting {meeting_id}")
