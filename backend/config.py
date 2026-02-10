import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Centralized configuration loaded from environment variables."""

    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    USE_MOCK_TRANSCRIPTION: bool = (
        os.environ.get("USE_MOCK_TRANSCRIPTION", "false").lower() == "true"
    )


settings = Settings()
