from __future__ import annotations

from psycopg import Error as PsycopgError

from app.db.postgres import get_runtime_settings, upsert_runtime_settings
from app.schemas.runtime_settings import (
    RuntimeSettingsResponse,
    RuntimeSettingsUpdateRequest,
)


class RuntimeSettingsPersistenceError(RuntimeError):
    """Raised when runtime settings cannot be read or written."""


def _row_to_response(row: dict) -> RuntimeSettingsResponse:
    updated_at = row.get("updated_at")
    return RuntimeSettingsResponse(
        privacyConsent=bool(row.get("privacy_consent", False)),
        addictionMonitorEnabled=bool(row.get("addiction_monitor_enabled", False)),
        updatedAt=updated_at.isoformat() if updated_at is not None else None,
    )


def fetch_runtime_settings() -> RuntimeSettingsResponse:
    try:
        row = get_runtime_settings()
    except PsycopgError as exc:
        raise RuntimeSettingsPersistenceError(
            f"PostgreSQL runtime settings fetch failed: {exc}"
        ) from exc
    except Exception as exc:
        raise RuntimeSettingsPersistenceError(
            f"PostgreSQL runtime settings fetch failed: {exc}"
        ) from exc

    return _row_to_response(row)


def update_runtime_settings(
    payload: RuntimeSettingsUpdateRequest,
) -> RuntimeSettingsResponse:
    current = fetch_runtime_settings()

    next_payload = {
        "privacy_consent": (
            payload.privacy_consent
            if payload.privacy_consent is not None
            else current.privacy_consent
        ),
        "addiction_monitor_enabled": (
            payload.addiction_monitor_enabled
            if payload.addiction_monitor_enabled is not None
            else current.addiction_monitor_enabled
        ),
    }

    if not next_payload["privacy_consent"]:
        next_payload["addiction_monitor_enabled"] = False

    try:
        row = upsert_runtime_settings(next_payload)
    except PsycopgError as exc:
        raise RuntimeSettingsPersistenceError(
            f"PostgreSQL runtime settings update failed: {exc}"
        ) from exc
    except Exception as exc:
        raise RuntimeSettingsPersistenceError(
            f"PostgreSQL runtime settings update failed: {exc}"
        ) from exc

    return _row_to_response(row)
