from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


AlertType = Literal[
    "distance_near",
    "distance_far",
    "blink_high",
    "blink_low",
    "stretch",
]

ALERT_TYPE_LABELS: dict[str, str] = {
    "distance_near": "시청 거리 너무 가까움",
    "distance_far": "시청 거리 너무 멀음",
    "blink_high": "눈을 너무 많이 깜박임",
    "blink_low": "눈을 너무 적게 깜박임",
    "stretch": "한 자세로 너무 오래 앉아있음",
}


class VoiceRecordingMeta(BaseModel):
    """녹음 메타데이터 (오디오 데이터 제외) — 목록 조회용"""
    speaker_id: str = Field(alias="speakerId")
    speaker_name: str = Field(alias="speakerName")
    alert_type: str = Field(alias="alertType")
    audio_duration: float = Field(alias="audioDuration")
    created_at: str = Field(alias="createdAt")
    enabled: bool = True

    model_config = {"populate_by_name": True}


class VoiceRecordingFull(VoiceRecordingMeta):
    """오디오 데이터 포함 — 재생용"""
    audio_data: str = Field(alias="audioData")   # data:audio/...;base64,...
    audio_mime: str = Field(alias="audioMime")

    model_config = {"populate_by_name": True}


class SaveRecordingRequest(BaseModel):
    family_id: int = Field(alias="familyId")
    speaker_id: str = Field(alias="speakerId")
    speaker_name: str = Field(alias="speakerName")
    alert_type: AlertType = Field(alias="alertType")
    audio_data: str = Field(alias="audioData")
    audio_mime: str = Field(alias="audioMime", default="audio/webm")
    audio_duration: float = Field(alias="audioDuration", default=0.0)

    model_config = {"populate_by_name": True}


class ToggleRecordingRequest(BaseModel):
    family_id: int = Field(alias="familyId")
    enabled: bool

    model_config = {"populate_by_name": True}


class VoiceAlertSettings(BaseModel):
    """그룹별 음성 알림 설정"""
    distance_enabled: bool = Field(default=True, alias="distanceEnabled")
    blink_enabled: bool = Field(default=True, alias="blinkEnabled")
    stretch_enabled: bool = Field(default=True, alias="stretchEnabled")
    distance_active_speaker_id: str | None = Field(default=None, alias="distanceActiveSpeakerId")
    blink_active_speaker_id: str | None = Field(default=None, alias="blinkActiveSpeakerId")
    stretch_active_speaker_id: str | None = Field(default=None, alias="stretchActiveSpeakerId")

    model_config = {"populate_by_name": True}


class SaveSettingsRequest(BaseModel):
    family_id: int = Field(alias="familyId")
    distance_enabled: bool = Field(default=True, alias="distanceEnabled")
    blink_enabled: bool = Field(default=True, alias="blinkEnabled")
    stretch_enabled: bool = Field(default=True, alias="stretchEnabled")
    distance_active_speaker_id: str | None = Field(default=None, alias="distanceActiveSpeakerId")
    blink_active_speaker_id: str | None = Field(default=None, alias="blinkActiveSpeakerId")
    stretch_active_speaker_id: str | None = Field(default=None, alias="stretchActiveSpeakerId")

    model_config = {"populate_by_name": True}
