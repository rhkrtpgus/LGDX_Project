from fastapi import APIRouter, HTTPException, status

from app.schemas.runtime_settings import (
    RuntimeSettingsResponse,
    RuntimeSettingsUpdateRequest,
)
from app.services.runtime_settings import (
    RuntimeSettingsPersistenceError,
    fetch_runtime_settings,
    update_runtime_settings,
)


router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/runtime", response_model=RuntimeSettingsResponse)
def get_runtime_settings() -> RuntimeSettingsResponse:
    try:
        return fetch_runtime_settings()
    except RuntimeSettingsPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.patch("/runtime", response_model=RuntimeSettingsResponse)
def patch_runtime_settings(
    payload: RuntimeSettingsUpdateRequest,
) -> RuntimeSettingsResponse:
    try:
        return update_runtime_settings(payload)
    except RuntimeSettingsPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
