from pydantic import BaseModel, Field


class ChildMessageCardResponse(BaseModel):
    character: str | None = None
    layout: str | None = None
    trigger: str | None = None
    message: str | None = None


class MonitorLiveResponse(BaseModel):
    active: bool
    status: str
    message: str
    child_id: int | None = Field(default=None, alias="childId")
    session_id: str | None = Field(default=None, alias="sessionId")
    captured_at: str | None = Field(default=None, alias="capturedAt")
    blink_bpm: float | None = Field(default=None, alias="blinkBpm")
    screen_distance_cm: float | None = Field(default=None, alias="screenDistanceCm")
    front_facing: bool | None = Field(default=None, alias="frontFacing")
    pose_status: str | None = Field(default=None, alias="poseStatus")
    focus_score: float | None = Field(default=None, alias="focusScore")
    risk_score: float | None = Field(default=None, alias="riskScore")
    risk_level: str | None = Field(default=None, alias="riskLevel")
    child_messages: list[str] = Field(default_factory=list, alias="childMessages")
    child_message_card: ChildMessageCardResponse | None = Field(default=None, alias="childMessageCard")
    error_message: str | None = Field(default=None, alias="errorMessage")

    model_config = {
        "populate_by_name": True,
    }
