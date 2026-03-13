from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import subprocess
import uuid

from app.core.config import get_settings
from app.db.mongo import count_monitor_telemetry, get_monitor_session_by_analysis_id
from app.schemas.analysis import AddictionMonitorResult
from app.schemas.runtime_settings import RuntimeSettingsResponse


ROOT_DIR = Path(__file__).resolve().parents[3]
MODELS_DIR = ROOT_DIR / "Models"
ADDICTION_SCRIPT = MODELS_DIR / "addiction.py"


class AddictionMonitorError(RuntimeError):
    """Raised when addiction.py cannot be executed successfully."""


def build_monitor_session_id() -> str:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return f"monitor-{timestamp}-{uuid.uuid4().hex[:8]}"


def build_disabled_monitor_result(
    runtime_settings: RuntimeSettingsResponse,
    *,
    reason: str,
) -> AddictionMonitorResult:
    return AddictionMonitorResult(
        enabled=runtime_settings.addiction_monitor_enabled,
        consentGranted=runtime_settings.privacy_consent,
        executed=False,
        status="SKIPPED",
        message=reason,
    )


def _build_monitor_result_from_session(
    *,
    runtime_settings: RuntimeSettingsResponse,
    session: dict,
    message: str,
) -> AddictionMonitorResult:
    session_id = str(session.get("session_id"))
    summary = session.get("summary", {})
    telemetry_samples = count_monitor_telemetry(session_id)

    return AddictionMonitorResult(
        enabled=runtime_settings.addiction_monitor_enabled,
        consentGranted=runtime_settings.privacy_consent,
        executed=True,
        status=str(session.get("status", "FAILED")),
        message=message,
        sessionId=session_id,
        telemetrySamples=telemetry_samples,
        finalRiskScore=summary.get("final_risk_score"),
        finalRiskLevel=summary.get("final_risk_level"),
        watchSeconds=session.get("watch_seconds"),
    )


def run_addiction_monitor(
    *,
    video_url: str,
    child_id: int,
    analysis_id: int,
    runtime_settings: RuntimeSettingsResponse,
) -> AddictionMonitorResult:
    settings = get_settings()

    if not runtime_settings.privacy_consent:
        return build_disabled_monitor_result(
            runtime_settings,
            reason="Privacy consent is disabled, so addiction.py was not started.",
        )

    if not runtime_settings.addiction_monitor_enabled:
        return build_disabled_monitor_result(
            runtime_settings,
            reason="Runtime settings disabled addiction.py execution.",
        )

    if not ADDICTION_SCRIPT.exists():
        raise AddictionMonitorError(
            f"addiction.py not found: {ADDICTION_SCRIPT}"
        )

    session_id = build_monitor_session_id()
    command = [
        settings.addiction_monitor_python_command,
        str(ADDICTION_SCRIPT),
        "--youtube-url",
        video_url,
        "--child-id",
        str(child_id),
        "--analysis-id",
        str(analysis_id),
        "--session-id",
        session_id,
        "--mongo-uri",
        settings.mongodb_url,
        "--mongo-db",
        settings.mongodb_database,
        "--max-seconds",
        str(settings.addiction_monitor_max_seconds),
    ]

    if settings.addiction_monitor_camera_index >= 0:
        command.extend(
            ["--camera-index", str(settings.addiction_monitor_camera_index)]
        )

    try:
        completed = subprocess.run(
            command,
            cwd=MODELS_DIR,
            capture_output=True,
            text=True,
            timeout=max(
                settings.addiction_monitor_max_seconds + 10,
                15,
            ),
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise AddictionMonitorError(
            "addiction.py timed out before it could finish."
        ) from exc
    except Exception as exc:
        raise AddictionMonitorError(f"addiction.py failed to start: {exc}") from exc

    if completed.returncode != 0:
        message = (
            completed.stderr.strip()
            or completed.stdout.strip()
            or "addiction.py exited with a non-zero status."
        )
        session = get_monitor_session_by_analysis_id(analysis_id)
        if session:
            return _build_monitor_result_from_session(
                runtime_settings=runtime_settings,
                session=session,
                message=message,
            )
        raise AddictionMonitorError(message)

    session = get_monitor_session_by_analysis_id(analysis_id)
    if session:
        return _build_monitor_result_from_session(
            runtime_settings=runtime_settings,
            session=session,
            message=f"addiction.py stored monitor data in MongoDB session {session_id}.",
        )

    telemetry_samples = count_monitor_telemetry(session_id)
    summary = {}

    return AddictionMonitorResult(
        enabled=True,
        consentGranted=True,
        executed=True,
        status="COMPLETED",
        message=(
            f"addiction.py stored {telemetry_samples} telemetry sample(s) "
            f"in MongoDB session {session_id}."
        ),
        sessionId=session_id,
        telemetrySamples=telemetry_samples,
        finalRiskScore=summary.get("final_risk_score"),
        finalRiskLevel=summary.get("final_risk_level"),
        watchSeconds=(session or {}).get("watch_seconds"),
    )


def fetch_addiction_monitor_result(
    analysis_id: int,
    runtime_settings: RuntimeSettingsResponse,
) -> AddictionMonitorResult:
    session = get_monitor_session_by_analysis_id(analysis_id)
    if not session:
        return AddictionMonitorResult(
            enabled=runtime_settings.addiction_monitor_enabled,
            consentGranted=runtime_settings.privacy_consent,
            executed=False,
            status="NOT_FOUND",
            message="No addiction monitor session was found for this analysis.",
        )

    return _build_monitor_result_from_session(
        runtime_settings=runtime_settings,
        session=session,
        message=(
            f"MongoDB session {session.get('session_id')} contains "
            f"{count_monitor_telemetry(str(session.get('session_id')))} telemetry sample(s)."
        ),
    )
