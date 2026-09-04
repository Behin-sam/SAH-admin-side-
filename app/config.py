"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database - SQLite for local dev (no Postgres needed)
    DATABASE_URL: str = "sqlite+aiosqlite:///./sah_local.db"

    # Encryption key for PII at rest
    ENCRYPTION_KEY: str = "demo-key-not-for-production"

    # JWT auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 60

    # Optional LLM API keys (falls back to rule-based summarization when None)
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None

    # Baseline period
    BASELINE_PERIOD_DAYS: int = 14

    # Deviation z-score thresholds
    Z_SCORE_DECLINING: float = -1.5
    Z_SCORE_ESCALATING: float = 1.5
    Z_SCORE_ACUTE: float = 2.5

    # Trend window
    TREND_WINDOW: int = 5
    SEVERITY_MIN_POINTS: int = 3

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
