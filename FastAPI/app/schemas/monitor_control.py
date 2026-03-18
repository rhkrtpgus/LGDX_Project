from pydantic import BaseModel, Field


class MonitorStartRequest(BaseModel):
    video_id: str = Field(alias="videoId", min_length=1)
    child_id: int = Field(alias="childId", ge=1)
    analysis_id: int | None = Field(default=None, alias="analysisId")
    blink_guidance_enabled: bool = Field(default=True, alias="blinkGuidanceEnabled")
    posture_guidance_enabled: bool = Field(default=True, alias="postureGuidanceEnabled")
    distance_guidance_enabled: bool = Field(default=True, alias="distanceGuidanceEnabled")

    model_config = {
        "populate_by_name": True,
    }


class MonitorStopRequest(BaseModel):
    child_id: int | None = Field(default=None, alias="childId")
    session_id: str | None = Field(default=None, alias="sessionId")

    model_config = {
        "populate_by_name": True,
    }


class MonitorControlResponse(BaseModel):
    active: bool
    status: str
    message: str
    child_id: int | None = Field(default=None, alias="childId")
    session_id: str | None = Field(default=None, alias="sessionId")
    analysis_id: int | None = Field(default=None, alias="analysisId")
    video_id: str | None = Field(default=None, alias="videoId")
    started_at: str | None = Field(default=None, alias="startedAt")

    model_config = {
        "populate_by_name": True,
    }
