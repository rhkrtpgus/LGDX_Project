from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import threading

from app.core.config import get_settings
from app.schemas.monitor_control import MonitorControlResponse
from app.services.addiction_monitor import ADDICTION_SCRIPT, MODELS_DIR, build_monitor_session_id


class MonitorRuntimeError(RuntimeError):
    """Raised when the background addiction monitor cannot be controlled."""


@dataclass
class ManagedMonitorProcess:
    child_id: int
    session_id: str
    analysis_id: int | None
    video_id: str
    started_at: str
    process: subprocess.Popen[str]


_active_processes: dict[int, ManagedMonitorProcess] = {}
_process_lock = threading.Lock()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _to_response(
    *,
    active: bool,
    status: str,
    message: str,
    managed: ManagedMonitorProcess | None = None,
) -> MonitorControlResponse:
    return MonitorControlResponse(
        active=active,
        status=status,
        message=message,
        childId=managed.child_id if managed else None,
        sessionId=managed.session_id if managed else None,
        analysisId=managed.analysis_id if managed else None,
        videoId=managed.video_id if managed else None,
        startedAt=managed.started_at if managed else None,
    )


def _cleanup_process(child_id: int, session_id: str) -> None:
    with _process_lock:
        managed = _active_processes.get(child_id)
        if managed and managed.session_id == session_id:
            _active_processes.pop(child_id, None)


def _watch_process(managed: ManagedMonitorProcess) -> None:
    try:
        managed.process.wait()
    finally:
        _cleanup_process(managed.child_id, managed.session_id)


def _build_command(
    *,
    video_id: str,
    child_id: int,
    analysis_id: int | None,
    session_id: str,
    blink_guidance_enabled: bool,
    posture_guidance_enabled: bool,
    distance_guidance_enabled: bool,
) -> list[str]:
    settings = get_settings()
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    command = [
        settings.addiction_monitor_python_command,
        str(ADDICTION_SCRIPT),
        "--youtube-url",
        video_url,
        "--child-id",
        str(child_id),
        "--session-id",
        session_id,
        "--mongo-uri",
        settings.mongodb_url,
        "--mongo-db",
        settings.mongodb_database,
        "--max-seconds",
        str(settings.addiction_monitor_max_seconds),
    ]

    if analysis_id is not None:
        command.extend(["--analysis-id", str(analysis_id)])

    if settings.addiction_monitor_camera_index >= 0:
        command.extend(["--camera-index", str(settings.addiction_monitor_camera_index)])

    if not blink_guidance_enabled:
        command.append("--disable-blink-guidance")

    if not posture_guidance_enabled:
        command.append("--disable-posture-guidance")

    if not distance_guidance_enabled:
        command.append("--disable-distance-guidance")

    return command


def get_active_monitor(child_id: int | None = None) -> MonitorControlResponse:
    with _process_lock:
        managed = _active_processes.get(child_id) if child_id is not None else next(iter(_active_processes.values()), None)

    if managed is None:
        return MonitorControlResponse(
            active=False,
            status="IDLE",
            message="No active addiction monitor process was found.",
        )

    if managed.process.poll() is not None:
        _cleanup_process(managed.child_id, managed.session_id)
        return MonitorControlResponse(
            active=False,
            status="COMPLETED",
            message="The addiction monitor process already finished.",
            childId=managed.child_id,
            sessionId=managed.session_id,
            analysisId=managed.analysis_id,
            videoId=managed.video_id,
            startedAt=managed.started_at,
        )

    return _to_response(
        active=True,
        status="RUNNING",
        message="The addiction monitor process is running.",
        managed=managed,
    )


def start_background_monitor(
    *,
    video_id: str,
    child_id: int,
    analysis_id: int | None,
    blink_guidance_enabled: bool = True,
    posture_guidance_enabled: bool = True,
    distance_guidance_enabled: bool = True,
) -> MonitorControlResponse:
    if not ADDICTION_SCRIPT.exists():
        raise MonitorRuntimeError(f"addiction.py not found: {ADDICTION_SCRIPT}")

    stop_background_monitor(child_id=child_id, session_id=None, fail_if_missing=False)

    session_id = build_monitor_session_id()
    command = _build_command(
        video_id=video_id,
        child_id=child_id,
        analysis_id=analysis_id,
        session_id=session_id,
        blink_guidance_enabled=blink_guidance_enabled,
        posture_guidance_enabled=posture_guidance_enabled,
        distance_guidance_enabled=distance_guidance_enabled,
    )

    try:
        process = subprocess.Popen(
            command,
            cwd=MODELS_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except Exception as exc:  # pragma: no cover
        raise MonitorRuntimeError(f"addiction.py failed to start: {exc}") from exc

    managed = ManagedMonitorProcess(
        child_id=child_id,
        session_id=session_id,
        analysis_id=analysis_id,
        video_id=video_id,
        started_at=_utc_now_iso(),
        process=process,
    )

    with _process_lock:
        _active_processes[child_id] = managed

    threading.Thread(target=_watch_process, args=(managed,), daemon=True).start()

    return _to_response(
        active=True,
        status="RUNNING",
        message="The addiction monitor started and the camera session is now active.",
        managed=managed,
    )


def stop_background_monitor(
    *,
    child_id: int | None,
    session_id: str | None,
    fail_if_missing: bool = True,
) -> MonitorControlResponse:
    with _process_lock:
        if child_id is not None:
            managed = _active_processes.get(child_id)
        else:
            managed = next(
                (
                    item
                    for item in _active_processes.values()
                    if session_id is None or item.session_id == session_id
                ),
                None,
            )

    if managed is None:
        if fail_if_missing:
            raise MonitorRuntimeError("No active addiction monitor process was found.")
        return MonitorControlResponse(
            active=False,
            status="IDLE",
            message="No active addiction monitor process was found.",
        )

    if session_id is not None and managed.session_id != session_id:
        if fail_if_missing:
            raise MonitorRuntimeError("No active addiction monitor matched the requested session.")
        return MonitorControlResponse(
            active=False,
            status="IDLE",
            message="No active addiction monitor matched the requested session.",
        )

    if managed.process.poll() is None:
        managed.process.terminate()
        try:
            managed.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            managed.process.kill()
            managed.process.wait(timeout=5)

    _cleanup_process(managed.child_id, managed.session_id)
    return _to_response(
        active=False,
        status="STOPPED",
        message="The addiction monitor was stopped and the camera was turned off.",
        managed=managed,
    )
