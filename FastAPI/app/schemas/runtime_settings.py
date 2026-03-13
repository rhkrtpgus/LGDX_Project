from pydantic import BaseModel, Field


class RuntimeSettingsResponse(BaseModel):
    privacy_consent: bool = Field(alias="privacyConsent")
    addiction_monitor_enabled: bool = Field(alias="addictionMonitorEnabled")
    updated_at: str | None = Field(default=None, alias="updatedAt")

    model_config = {
        "populate_by_name": True,
    }


class RuntimeSettingsUpdateRequest(BaseModel):
    privacy_consent: bool | None = Field(default=None, alias="privacyConsent")
    addiction_monitor_enabled: bool | None = Field(
        default=None,
        alias="addictionMonitorEnabled",
    )

    model_config = {
        "populate_by_name": True,
    }
