from fastapi import APIRouter, HTTPException, Query, status

from app.db.mongo import (
    get_latest_monitor_session_by_child_id,
    get_latest_monitor_telemetry,
)
from app.schemas.monitor_live import MonitorLiveResponse
from app.schemas.monitor_control import (
    MonitorControlResponse,
    MonitorStartRequest,
    MonitorStopRequest,
)
from app.services.monitor_runtime import (
    MonitorRuntimeError,
    get_active_monitor,
    start_background_monitor,
    stop_background_monitor,
)


router = APIRouter(prefix="/monitor", tags=["monitor"])


@router.get("/live", response_model=MonitorLiveResponse)
def get_live_monitor_route(
    child_id: int = Query(alias="childId", ge=1),
) -> MonitorLiveResponse:
    session = get_latest_monitor_session_by_child_id(child_id)
    if not session:
        return MonitorLiveResponse(
            active=False,
            status="IDLE",
            message="No monitor session has been recorded for this child yet.",
            childId=child_id,
        )

    session_id = str(session.get("session_id"))
    telemetry = get_latest_monitor_telemetry(session_id)
    active = str(session.get("status", "")).upper() == "RUNNING"

    if telemetry is None:
        return MonitorLiveResponse(
            active=active,
            status=str(session.get("status", "UNKNOWN")),
            message="The monitor session is running, but no live telemetry has arrived yet.",
            childId=child_id,
            sessionId=session_id,
            errorMessage=session.get("error_message"),
        )

    blink = telemetry.get("blink", {})
    distance = telemetry.get("distance", {})
    head_pose = telemetry.get("head_pose", {})
    pose = telemetry.get("pose", {})
    scores = telemetry.get("scores", {})

    return MonitorLiveResponse(
        active=active,
        status=str(session.get("status", "UNKNOWN")),
        message="Live camera telemetry is available for this child.",
        childId=child_id,
        sessionId=session_id,
        capturedAt=telemetry.get("captured_at"),
        blinkBpm=blink.get("bpm"),
        screenDistanceCm=distance.get("screen_distance_cm"),
        frontFacing=head_pose.get("is_front"),
        poseStatus=pose.get("status"),
        focusScore=scores.get("focus_score"),
        riskScore=scores.get("risk_score"),
        riskLevel=scores.get("risk_level"),
        childMessages=telemetry.get("child_messages") or [],
        childMessageCard=telemetry.get("child_message_card"),
        errorMessage=session.get("error_message"),
    )


@router.get("/active", response_model=MonitorControlResponse)
def get_active_monitor_route(
    child_id: int | None = Query(default=None, alias="childId"),
) -> MonitorControlResponse:
    return get_active_monitor(child_id)


@router.post("/start", response_model=MonitorControlResponse)
def start_monitor_route(payload: MonitorStartRequest) -> MonitorControlResponse:
    try:
        return start_background_monitor(
            video_url=payload.video_url,
            child_id=payload.child_id,
            analysis_id=payload.analysis_id,
        )
    except MonitorRuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.post("/stop", response_model=MonitorControlResponse)
def stop_monitor_route(payload: MonitorStopRequest) -> MonitorControlResponse:
    try:
        return stop_background_monitor(
            child_id=payload.child_id,
            session_id=payload.session_id,
        )
    except MonitorRuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
