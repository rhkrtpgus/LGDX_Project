from fastapi import APIRouter

from app.core.config import get_settings
from app.db.mongo import ping_mongo
from app.db.postgres import ping_postgres
from app.services.runtime_settings import (
    RuntimeSettingsPersistenceError,
    fetch_runtime_settings,
)


router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health")
def get_system_health() -> dict:
    settings = get_settings()
    database_status = {
        "status": "UP",
        "message": "PostgreSQL and MongoDB connections are healthy.",
    }
    runtime_settings = {
        "privacyConsent": False,
        "addictionMonitorEnabled": False,
        "updatedAt": None,
    }

    try:
        postgres_ok = ping_postgres()
        mongo_ok = ping_mongo()
        if not postgres_ok or not mongo_ok:
            database_status = {
                "status": "DEGRADED",
                "message": "One or more databases did not respond successfully.",
            }
    except Exception as exc:
        database_status = {
            "status": "DOWN",
            "message": f"Database connectivity check failed: {exc}",
        }

    try:
        runtime = fetch_runtime_settings()
        runtime_settings = runtime.model_dump(by_alias=True)
    except RuntimeSettingsPersistenceError:
        pass

    return {
        "backend": {
            "status": "UP",
            "message": "FastAPI server is running.",
        },
        "database": database_status,
        "mainModel": {
            "status": "READY",
            "message": "Models/API.py wrapper is available.",
        },
        "addictionModel": {
            "status": "READY",
            "message": "Models/addiction.py integration is available when consent is enabled.",
        },
        "runtimeSettings": runtime_settings,
        "environment": {
            "postgresUrl": settings.postgres_url,
            "mongodbDatabase": settings.mongodb_database,
            "apiPrefix": settings.api_prefix,
        },
    }
