from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys

import psycopg

from app.db.postgres import (
    get_analysis_history_by_id,
    get_child_watch_policy,
    insert_analysis_history,
    list_analysis_history,
)
from app.schemas.analysis import AddictionMonitorResult, AnalysisRequest, AnalysisResponse
from app.services.addiction_monitor import (
    AddictionMonitorError,
    build_disabled_monitor_result,
    fetch_addiction_monitor_result,
    run_addiction_monitor,
)
from app.services.runtime_settings import (
    RuntimeSettingsPersistenceError,
    fetch_runtime_settings,
)


ROOT_DIR = Path(__file__).resolve().parents[3]
MODELS_DIR = ROOT_DIR / "Models"

if str(MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(MODELS_DIR))

try:
    from API import build_analysis_history_payload, run_pipeline, serialize_analysis_result
except Exception as exc:  # pragma: no cover
    raise RuntimeError(
        "Could not import Models/API.py. Check Python dependencies for the model layer."
    ) from exc


class ModelAnalysisError(RuntimeError):
    """Raised when the wrapped model pipeline fails."""


class ModelPersistenceError(RuntimeError):
    """Raised when persistence to PostgreSQL fails."""


class AnalysisNotFoundError(RuntimeError):
    """Raised when an analysis row does not exist."""


YOUTUBE_VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_youtube_watch_url(video_id: str) -> str:
    normalized = video_id.strip()
    if not YOUTUBE_VIDEO_ID_PATTERN.fullmatch(normalized):
        raise ValueError("A valid YouTube videoId is required.")

    return f"https://www.youtube.com/watch?v={normalized}"


def _build_playback(harmful: bool, blocked: bool) -> dict:
    if blocked:
        return {
            "allowed": False,
            "message": "Playback was blocked by the category policy.",
            "addictionRiskScore": 0.0,
            "addictionRiskLevel": "NORMAL",
            "behaviorSignals": [],
        }

    if harmful:
        return {
            "allowed": False,
            "message": "Playback was blocked by harmful-content detection.",
            "addictionRiskScore": 0.0,
            "addictionRiskLevel": "NORMAL",
            "behaviorSignals": [],
        }

    return {
        "allowed": True,
        "message": "Playback is allowed.",
        "addictionRiskScore": 0.0,
        "addictionRiskLevel": "NORMAL",
        "behaviorSignals": [],
    }


def _default_addiction_monitor_result(
    message: str = "Addiction monitor was not evaluated for this analysis.",
) -> AddictionMonitorResult:
    return AddictionMonitorResult(
        enabled=False,
        consentGranted=False,
        executed=False,
        status="NOT_CONNECTED",
        message=message,
    )


def _failed_addiction_monitor_result(message: str) -> AddictionMonitorResult:
    runtime_settings = _safe_fetch_runtime_settings()
    if runtime_settings is None:
        return _default_addiction_monitor_result(message)

    return AddictionMonitorResult(
        enabled=runtime_settings.addiction_monitor_enabled,
        consentGranted=runtime_settings.privacy_consent,
        executed=False,
        status="FAILED",
        message=message,
    )


def _decode_harmful_reasons(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []

    try:
        decoded = json.loads(raw_value)
    except json.JSONDecodeError:
        return [str(raw_value)]

    if isinstance(decoded, list):
        return [str(item) for item in decoded]

    return [str(raw_value)]


def _build_db_payload_from_row(row: dict) -> dict:
    return {
        "input_url": row["input_url"],
        "video_id": row["video_id"],
        "title": row["title"],
        "category_name_ko": row["category_name_ko"],
        "duration_seconds": row["duration_seconds"],
        "is_short_form": row["is_short_form"],
        "blocked_by_category": row["blocked_by_category"],
        "has_violence": row["has_violence"],
        "violence_score": row["violence_score"],
        "violence_positive_windows": row["violence_positive_windows"],
        "has_nudity": row["has_nudity"],
        "nudity_match_count": row["nudity_match_count"],
        "harmful": row["harmful"],
        "harmful_reasons_json": row["harmful_reasons_json"],
        "status": row["status"],
        "error_message": row["error_message"],
    }


def _safe_fetch_runtime_settings():
    try:
        return fetch_runtime_settings()
    except RuntimeSettingsPersistenceError:
        return None
    except Exception:
        return None


def _load_saved_addiction_monitor_result(analysis_id: int) -> AddictionMonitorResult:
    runtime_settings = _safe_fetch_runtime_settings()
    if runtime_settings is None:
        return _default_addiction_monitor_result(
            "Runtime settings could not be loaded while fetching the saved monitor result."
        )

    try:
        return fetch_addiction_monitor_result(analysis_id, runtime_settings)
    except Exception:
        return build_disabled_monitor_result(
            runtime_settings,
            reason="No saved addiction monitor session was found for this analysis.",
        )


def _child_protection_enabled(child_id: int | None) -> bool:
    if child_id is None:
        return False

    try:
        policy = get_child_watch_policy(child_id)
    except Exception:
        return False

    if not policy:
        return False

    return bool(policy.get("auto_block_enabled"))


def _resolve_addiction_monitor_result(
    *,
    payload: AnalysisRequest,
    analysis_id: int | None,
    input_url: str,
    playback_allowed: bool,
) -> AddictionMonitorResult:
    runtime_settings = _safe_fetch_runtime_settings()
    if runtime_settings is None:
        return _default_addiction_monitor_result(
            "Runtime settings could not be loaded, so addiction.py was skipped."
        )

    if not playback_allowed:
        return build_disabled_monitor_result(
            runtime_settings,
            reason="Playback was blocked, so addiction.py was not started.",
        )

    if payload.child_id is None:
        return build_disabled_monitor_result(
            runtime_settings,
            reason="No child profile was selected, so addiction.py was not started.",
        )

    if analysis_id is None:
        return build_disabled_monitor_result(
            runtime_settings,
            reason="The analysis was not saved, so addiction.py could not create a monitor session.",
        )

    if not _child_protection_enabled(payload.child_id):
        return build_disabled_monitor_result(
            runtime_settings,
            reason="Child protection is off for this profile, so addiction.py was not started.",
        )

    try:
        return run_addiction_monitor(
            video_url=input_url,
            child_id=payload.child_id,
            analysis_id=analysis_id,
            runtime_settings=runtime_settings,
        )
    except AddictionMonitorError as exc:
        return _failed_addiction_monitor_result(str(exc))
    except Exception as exc:
        return _failed_addiction_monitor_result(f"Unexpected addiction monitor failure: {exc}")


def _build_analysis_response_from_row(row: dict) -> AnalysisResponse:
    harmful_reasons = _decode_harmful_reasons(row.get("harmful_reasons_json"))
    created_at = row.get("created_at")
    analysis_id = int(row["analysis_id"])

    return AnalysisResponse(
        analysisId=analysis_id,
        inputUrl=row["input_url"],
        videoId=row["video_id"],
        title=row["title"],
        categoryNameKo=row["category_name_ko"],
        durationSeconds=row["duration_seconds"],
        shortForm=bool(row["is_short_form"]),
        blockedByCategory=bool(row["blocked_by_category"]),
        hasViolence=bool(row["has_violence"]),
        violenceScore=row["violence_score"],
        violencePositiveWindows=row["violence_positive_windows"],
        hasNudity=bool(row["has_nudity"]),
        nudityMatchCount=row["nudity_match_count"],
        harmful=bool(row["harmful"]),
        harmfulReasons=harmful_reasons,
        playback=_build_playback(bool(row["harmful"]), bool(row["blocked_by_category"])),
        addictionMonitor=_load_saved_addiction_monitor_result(analysis_id),
        status=row["status"],
        errorMessage=row["error_message"],
        createdAt=created_at.isoformat() if created_at is not None else None,
        rawResult=None,
        dbPayload=_build_db_payload_from_row(row),
    )


def analyze_youtube_video(payload: AnalysisRequest) -> AnalysisResponse:
    input_url = _build_youtube_watch_url(payload.video_id)

    try:
        result = run_pipeline(input_url)
    except Exception as exc:
        raise ModelAnalysisError(f"Model pipeline failed: {exc}") from exc

    raw_result = serialize_analysis_result(result)
    db_payload = build_analysis_history_payload(result)
    harmful = bool(raw_result["harmful_reasons"])
    blocked = bool(raw_result["category_filter"]["is_blocked"])
    playback = _build_playback(harmful, blocked)

    analysis_id = None
    created_at = _utc_now_iso()

    if payload.save_result:
        try:
            saved_row = insert_analysis_history(db_payload)
        except psycopg.Error as exc:
            raise ModelPersistenceError(f"PostgreSQL save failed: {exc}") from exc
        except Exception as exc:
            raise ModelPersistenceError(f"PostgreSQL save failed: {exc}") from exc

        analysis_id = int(saved_row["analysis_id"])
        saved_created_at = saved_row.get("created_at")
        if saved_created_at is not None:
            created_at = saved_created_at.isoformat()

    addiction_monitor = _resolve_addiction_monitor_result(
        payload=payload,
        analysis_id=analysis_id,
        input_url=result.input_url,
        playback_allowed=bool(playback["allowed"]),
    )

    return AnalysisResponse(
        analysisId=analysis_id,
        inputUrl=result.input_url,
        videoId=result.video_id,
        title=result.title,
        categoryNameKo=result.category_name_ko,
        durationSeconds=result.duration_seconds,
        shortForm=result.is_short_form,
        blockedByCategory=blocked,
        hasViolence=result.has_violence,
        violenceScore=result.violence_score,
        violencePositiveWindows=result.violence_positive_windows,
        hasNudity=result.has_nudity,
        nudityMatchCount=result.nudity_match_count,
        harmful=harmful,
        harmfulReasons=result.harmful_reasons,
        playback=playback,
        addictionMonitor=addiction_monitor,
        status="COMPLETED",
        errorMessage=None,
        createdAt=created_at,
        rawResult=raw_result,
        dbPayload=db_payload,
    )


def fetch_analysis_by_id(analysis_id: int) -> AnalysisResponse:
    try:
        row = get_analysis_history_by_id(analysis_id)
    except psycopg.Error as exc:
        raise ModelPersistenceError(f"PostgreSQL fetch failed: {exc}") from exc
    except Exception as exc:
        raise ModelPersistenceError(f"PostgreSQL fetch failed: {exc}") from exc

    if not row:
        raise AnalysisNotFoundError(f"Analysis not found: {analysis_id}")

    return _build_analysis_response_from_row(row)


def fetch_analysis_history(limit: int = 10) -> list[AnalysisResponse]:
    try:
        rows = list_analysis_history(limit)
    except psycopg.Error as exc:
        raise ModelPersistenceError(f"PostgreSQL fetch failed: {exc}") from exc
    except Exception as exc:
        raise ModelPersistenceError(f"PostgreSQL fetch failed: {exc}") from exc

    return [_build_analysis_response_from_row(row) for row in rows]
