from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status

from app.db.mongo import (
    delete_voice_recording,
    get_voice_alert_settings,
    get_voice_recording,
    list_voice_recordings,
    list_voice_recordings_by_alert,
    toggle_voice_recording,
    upsert_voice_alert_settings,
    upsert_voice_recording,
)
from app.schemas.voice_alerts import (
    ALERT_TYPE_LABELS,
    SaveRecordingRequest,
    SaveSettingsRequest,
    ToggleRecordingRequest,
    VoiceAlertSettings,
    VoiceRecordingFull,
    VoiceRecordingMeta,
)


router = APIRouter(prefix="/voice-alerts", tags=["voice-alerts"])


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_meta(row: dict) -> VoiceRecordingMeta:
    return VoiceRecordingMeta(
        speakerId=row["speaker_id"],
        speakerName=row["speaker_name"],
        alertType=row["alert_type"],
        audioDuration=float(row.get("audio_duration", 0.0)),
        createdAt=row.get("created_at", ""),
        enabled=bool(row.get("enabled", True)),
    )


def _row_to_full(row: dict) -> VoiceRecordingFull:
    return VoiceRecordingFull(
        speakerId=row["speaker_id"],
        speakerName=row["speaker_name"],
        alertType=row["alert_type"],
        audioDuration=float(row.get("audio_duration", 0.0)),
        createdAt=row.get("created_at", ""),
        audioData=row.get("audio_data", ""),
        audioMime=row.get("audio_mime", "audio/webm"),
        enabled=bool(row.get("enabled", True)),
    )


# ── 녹음 목록 (메타데이터만) ───────────────────────────────────────────────────

@router.get("/recordings", response_model=list[VoiceRecordingMeta])
def get_recordings(
    family_id: int = Query(alias="familyId", ge=1),
) -> list[VoiceRecordingMeta]:
    rows = list_voice_recordings(family_id)
    return [_row_to_meta(r) for r in rows]


# ── 특정 알림 유형 녹음 전체 (오디오 포함) — 재생 직전 일괄 로드 ─────────────────

@router.get("/recordings/by-alert", response_model=list[VoiceRecordingFull])
def get_recordings_by_alert(
    family_id: int = Query(alias="familyId", ge=1),
    alert_type: str = Query(alias="alertType"),
) -> list[VoiceRecordingFull]:
    if alert_type not in ALERT_TYPE_LABELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown alertType: {alert_type}")
    rows = list_voice_recordings_by_alert(family_id, alert_type)
    return [_row_to_full(r) for r in rows]


# ── 단일 녹음 조회 (오디오 포함) ─────────────────────────────────────────────────

@router.get("/recordings/{speaker_id}/{alert_type}", response_model=VoiceRecordingFull)
def get_single_recording(
    speaker_id: str,
    alert_type: str,
    family_id: int = Query(alias="familyId", ge=1),
) -> VoiceRecordingFull:
    if alert_type not in ALERT_TYPE_LABELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown alertType: {alert_type}")
    row = get_voice_recording(family_id, speaker_id, alert_type)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    return _row_to_full(row)


# ── 녹음 저장 (upsert) ────────────────────────────────────────────────────────

@router.post("/recordings", response_model=VoiceRecordingMeta, status_code=status.HTTP_201_CREATED)
def save_recording(payload: SaveRecordingRequest) -> VoiceRecordingMeta:
    now = _utc_now_iso()
    doc = {
        "family_id": payload.family_id,
        "speaker_id": payload.speaker_id,
        "speaker_name": payload.speaker_name,
        "alert_type": payload.alert_type,
        "audio_data": payload.audio_data,
        "audio_mime": payload.audio_mime,
        "audio_duration": payload.audio_duration,
        "enabled": True,
        "created_at": now,
        "updated_at": now,
    }
    upsert_voice_recording(doc)
    return VoiceRecordingMeta(
        speakerId=payload.speaker_id,
        speakerName=payload.speaker_name,
        alertType=payload.alert_type,
        audioDuration=payload.audio_duration,
        createdAt=now,
        enabled=True,
    )


# ── 녹음 클립 켜기/끄기 ────────────────────────────────────────────────────────

@router.patch("/recordings/{speaker_id}/{alert_type}", response_model=VoiceRecordingMeta)
def toggle_recording(
    speaker_id: str,
    alert_type: str,
    payload: ToggleRecordingRequest,
) -> VoiceRecordingMeta:
    if alert_type not in ALERT_TYPE_LABELS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown alertType: {alert_type}")
    matched = toggle_voice_recording(payload.family_id, speaker_id, alert_type, payload.enabled)
    if matched == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    row = get_voice_recording(payload.family_id, speaker_id, alert_type)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")
    return _row_to_meta(row)


# ── 녹음 삭제 ─────────────────────────────────────────────────────────────────

@router.delete("/recordings/{speaker_id}/{alert_type}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_recording(
    speaker_id: str,
    alert_type: str,
    family_id: int = Query(alias="familyId", ge=1),
) -> None:
    deleted = delete_voice_recording(family_id, speaker_id, alert_type)
    if deleted == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found.")


# ── 설정 조회 ─────────────────────────────────────────────────────────────────

@router.get("/settings", response_model=VoiceAlertSettings)
def get_settings_route(
    family_id: int = Query(alias="familyId", ge=1),
) -> VoiceAlertSettings:
    doc = get_voice_alert_settings(family_id)
    return VoiceAlertSettings(
        distanceEnabled=bool(doc.get("distance_enabled", True)),
        blinkEnabled=bool(doc.get("blink_enabled", True)),
        stretchEnabled=bool(doc.get("stretch_enabled", True)),
        distanceActiveSpeakerId=doc.get("distance_active_speaker_id"),
        blinkActiveSpeakerId=doc.get("blink_active_speaker_id"),
        stretchActiveSpeakerId=doc.get("stretch_active_speaker_id"),
    )


# ── 설정 저장 ─────────────────────────────────────────────────────────────────

@router.put("/settings", response_model=VoiceAlertSettings)
def update_settings_route(payload: SaveSettingsRequest) -> VoiceAlertSettings:
    doc = {
        "family_id": payload.family_id,
        "distance_enabled": payload.distance_enabled,
        "blink_enabled": payload.blink_enabled,
        "stretch_enabled": payload.stretch_enabled,
        "distance_active_speaker_id": payload.distance_active_speaker_id,
        "blink_active_speaker_id": payload.blink_active_speaker_id,
        "stretch_active_speaker_id": payload.stretch_active_speaker_id,
        "updated_at": _utc_now_iso(),
    }
    upsert_voice_alert_settings(doc)
    return VoiceAlertSettings(
        distanceEnabled=payload.distance_enabled,
        blinkEnabled=payload.blink_enabled,
        stretchEnabled=payload.stretch_enabled,
        distanceActiveSpeakerId=payload.distance_active_speaker_id,
        blinkActiveSpeakerId=payload.blink_active_speaker_id,
        stretchActiveSpeakerId=payload.stretch_active_speaker_id,
    )
