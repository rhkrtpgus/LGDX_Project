from typing import Any

from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    video_id: str = Field(alias="videoId", min_length=1)
    child_id: int | None = Field(default=None, alias="childId")
    request_source: str = Field(default="front", alias="requestSource")
    save_result: bool = Field(default=True, alias="saveResult")

    model_config = {
        "populate_by_name": True,
    }


class PlaybackDecision(BaseModel):
    allowed: bool
    message: str
    addiction_risk_score: float = Field(alias="addictionRiskScore")
    addiction_risk_level: str = Field(alias="addictionRiskLevel")
    behavior_signals: list[str] = Field(default_factory=list, alias="behaviorSignals")

    model_config = {
        "populate_by_name": True,
    }


class AddictionMonitorResult(BaseModel):
    enabled: bool
    consent_granted: bool = Field(alias="consentGranted")
    executed: bool
    status: str
    message: str
    session_id: str | None = Field(default=None, alias="sessionId")
    telemetry_samples: int | None = Field(default=None, alias="telemetrySamples")
    final_risk_score: float | None = Field(default=None, alias="finalRiskScore")
    final_risk_level: str | None = Field(default=None, alias="finalRiskLevel")
    watch_seconds: int | None = Field(default=None, alias="watchSeconds")

    model_config = {
        "populate_by_name": True,
    }


class AnalysisResponse(BaseModel):
    analysis_id: int | None = Field(default=None, alias="analysisId")
    input_url: str = Field(alias="inputUrl")
    video_id: str | None = Field(default=None, alias="videoId")
    title: str | None = None
    category_name_ko: str | None = Field(default=None, alias="categoryNameKo")
    duration_seconds: int | None = Field(default=None, alias="durationSeconds")
    short_form: bool = Field(alias="shortForm")
    blocked_by_category: bool = Field(alias="blockedByCategory")
    has_violence: bool = Field(alias="hasViolence")
    violence_score: float | None = Field(default=None, alias="violenceScore")
    violence_positive_windows: int | None = Field(default=None, alias="violencePositiveWindows")
    has_nudity: bool = Field(alias="hasNudity")
    nudity_match_count: int | None = Field(default=None, alias="nudityMatchCount")
    harmful: bool
    harmful_reasons: list[str] = Field(default_factory=list, alias="harmfulReasons")
    playback: PlaybackDecision
    addiction_monitor: AddictionMonitorResult | None = Field(default=None, alias="addictionMonitor")
    status: str
    error_message: str | None = Field(default=None, alias="errorMessage")
    created_at: str | None = Field(default=None, alias="createdAt")
    raw_result: dict[str, Any] | None = Field(default=None, alias="rawResult")
    db_payload: dict[str, Any] | None = Field(default=None, alias="dbPayload")

    model_config = {
        "populate_by_name": True,
    }
