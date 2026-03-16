from pydantic import BaseModel, Field


class MonitorStartRequest(BaseModel):
    video_url: str = Field(alias="videoUrl", min_length=1)
    child_id: int = Field(alias="childId", ge=1)
    analysis_id: int | None = Field(default=None, alias="analysisId")

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
    video_url: str | None = Field(default=None, alias="videoUrl")
    started_at: str | None = Field(default=None, alias="startedAt")

    model_config = {
        "populate_by_name": True,
    }
