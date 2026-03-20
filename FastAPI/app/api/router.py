from fastapi import APIRouter

from app.api.routes import analysis, health, monitor, settings, voice_alerts, youtube_catalog
from app.core.config import get_settings


api_router = APIRouter(prefix=get_settings().api_prefix)
api_router.include_router(health.router)
api_router.include_router(analysis.router)
api_router.include_router(monitor.router)
api_router.include_router(settings.router)
api_router.include_router(youtube_catalog.router)
api_router.include_router(voice_alerts.router)
