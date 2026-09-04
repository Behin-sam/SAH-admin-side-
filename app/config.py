"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/trauma_support"

    # Encryption key for PII at rest
    # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ENCRYPTION_KEY: str = ""

    # JWT auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # Baseline period (days of check-ins before we consider baseline established)
    BASELINE_PERIOD_DAYS: int = 14

    # Deviation z-score thresholds
    Z_SCORE_DECLINING: float = -1.5
    Z_SCORE_ESCALATING: float = 1.5
    Z_SCORE_ACUTE: float = 2.5

    # Trend window (number of recent check-ins for rolling trend)
    TREND_WINDOW: int = 5

    # Severity: how many points in the window must exceed threshold
    SEVERITY_MIN_POINTS: int = 3

    # LLM provider (for counselor summaries)
    # Set one of these to enable LLM-powered summaries.
    # If neither is set, rule-based summaries are used as fallback.
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_MODEL: str = ""  # e.g. "gpt-4o" or "claude-3-5-sonnet-20241022"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
