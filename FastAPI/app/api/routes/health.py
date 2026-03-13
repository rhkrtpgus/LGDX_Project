from fastapi import APIRouter

from app.core.config import get_settings


router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health")
def get_system_health() -> dict:
    settings = get_settings()
    return {
        "backend": {
            "status": "UP",
            "message": "FastAPI server is running.",
        },
        "database": {
            "status": "UNKNOWN",
            "message": "Database connectivity is not wired yet.",
        },
        "mainModel": {
            "status": "READY",
            "message": "Models/API.py wrapper is available.",
        },
        "addictionModel": {
            "status": "READY",
            "message": "Models/addiction.py integration will be added next.",
        },
        "runtimeSettings": {
            "privacyConsent": False,
            "addictionMonitorEnabled": False,
            "updatedAt": None,
        },
        "environment": {
            "postgresUrl": settings.postgres_url,
            "mongodbDatabase": settings.mongodb_database,
        },
    }
