from fastapi import APIRouter

from app.api.routes import analysis, health, settings
from app.core.config import get_settings


api_router = APIRouter(prefix=get_settings().api_prefix)
api_router.include_router(health.router)
api_router.include_router(analysis.router)
api_router.include_router(settings.router)
