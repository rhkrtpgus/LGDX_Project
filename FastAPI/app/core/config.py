from dataclasses import dataclass
import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_version: str
    debug: bool
    api_prefix: str
    cors_allow_all: bool
    cors_origins: list[str]
    postgres_url: str
    mongodb_url: str
    mongodb_database: str
    model_timeout_seconds: int
    addiction_monitor_max_seconds: int
    addiction_monitor_camera_index: int


def _read_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _read_list(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


def _read_prefix(name: str, default: str) -> str:
    raw = os.getenv(name, default).strip()
    if not raw.startswith("/"):
        raw = f"/{raw}"
    return raw.rstrip("/") or default


def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "LGDX FastAPI"),
        app_version=os.getenv("APP_VERSION", "0.1.0"),
        debug=_read_bool("APP_DEBUG", True),
        api_prefix=_read_prefix("API_PREFIX", "/fastapi"),
        cors_allow_all=_read_bool("CORS_ALLOW_ALL", False),
        cors_origins=_read_list("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"),
        postgres_url=os.getenv(
            "POSTGRES_URL",
            "postgresql://postgres:12345@localhost:3355/lgdx",
        ),
        mongodb_url=os.getenv("MONGODB_URL", "mongodb://localhost:27017"),
        mongodb_database=os.getenv("MONGODB_DATABASE", "lgdx_monitor"),
        model_timeout_seconds=int(os.getenv("MODEL_TIMEOUT_SECONDS", "900")),
        addiction_monitor_max_seconds=int(
            os.getenv("ADDICTION_MONITOR_MAX_SECONDS", "5")
        ),
        addiction_monitor_camera_index=int(
            os.getenv("ADDICTION_MONITOR_CAMERA_INDEX", "0")
        ),
    )
