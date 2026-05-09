from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MediTrack+ API"
    data_source: str = "simulator"
    serial_port: str = "COM3"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    stream_interval_seconds: float = 1.0
    history_limit: int = 120
    alert_limit: int = 50
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: str = ""
    gemini_api_key: str = ""
    batch_interval_seconds: int = 20

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
