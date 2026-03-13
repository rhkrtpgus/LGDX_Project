from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import sys

import psycopg

from app.db.postgres import (
    get_analysis_history_by_id,
    insert_analysis_history,
    list_analysis_history,
)
from app.schemas.analysis import AnalysisResponse, AnalysisRequest


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


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_playback(harmful: bool, blocked: bool) -> dict:
    if blocked:
        return {
            "allowed": False,
            "message": "카테고리 정책에 의해 재생이 제한되었습니다.",
            "addictionRiskScore": 0.0,
            "addictionRiskLevel": "NORMAL",
            "behaviorSignals": [],
        }

    if harmful:
        return {
            "allowed": False,
            "message": "유해성 분석 결과에 따라 재생이 제한되었습니다.",
            "addictionRiskScore": 0.0,
            "addictionRiskLevel": "NORMAL",
            "behaviorSignals": [],
        }

    return {
        "allowed": True,
        "message": "재생이 허용되었습니다.",
        "addictionRiskScore": 0.0,
        "addictionRiskLevel": "NORMAL",
        "behaviorSignals": [],
    }


def _default_addiction_monitor_result() -> dict:
    return {
        "enabled": False,
        "consentGranted": False,
        "executed": False,
        "status": "NOT_CONNECTED",
        "message": "addiction.py integration is not wired yet.",
    }


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


def _build_analysis_response_from_row(row: dict) -> AnalysisResponse:
    harmful_reasons = _decode_harmful_reasons(row.get("harmful_reasons_json"))
    created_at = row.get("created_at")

    return AnalysisResponse(
        analysisId=int(row["analysis_id"]),
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
        addictionMonitor=_default_addiction_monitor_result(),
        status=row["status"],
        errorMessage=row["error_message"],
        createdAt=created_at.isoformat() if created_at is not None else None,
        rawResult=None,
        dbPayload=_build_db_payload_from_row(row),
    )


def analyze_youtube_video(payload: AnalysisRequest) -> AnalysisResponse:
    try:
        result = run_pipeline(payload.video_url)
    except Exception as exc:
        raise ModelAnalysisError(f"Model pipeline failed: {exc}") from exc

    raw_result = serialize_analysis_result(result)
    db_payload = build_analysis_history_payload(result)
    harmful = bool(raw_result["harmful_reasons"])
    blocked = bool(raw_result["category_filter"]["is_blocked"])

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
        playback=_build_playback(harmful, blocked),
        addictionMonitor=_default_addiction_monitor_result(),
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
