import logging
import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
logger = logging.getLogger(__name__)


async def send_push_notification(
    push_token: str,
    meeting_id: str,
    summary_preview: str,
) -> None:
    """
    Send an Expo push notification when the transcript is ready.

    The notification payload includes:
    - title: static "Meeting transcript ready!"
    - body: first 100 chars of the summary
    - data.meetingId: used by the app to deep link to /meeting/{id}
    - channelId: "meeting-ready" (matches the Android channel created in the app)
    """
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

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(EXPO_PUSH_URL, json=payload)
            response.raise_for_status()
            result = response.json()
            logger.info(f"Push notification sent for meeting {meeting_id}")

            # Check for per-ticket errors (Expo returns 200 even on errors)
            data = result.get("data", [])
            if data and isinstance(data, list):
                for ticket in data:
                    if ticket.get("status") == "error":
                        logger.error(f"Push ticket error: {ticket}")
    except Exception as e:
        # Non-fatal: meeting is already saved, user can still view it manually
        logger.error(f"Failed to send push notification: {e}")
